import { type Request, type Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { registerMerchant, loginMerchant } from '../service/merchant.service.js';
import { insertSession, selectStoreByShop, insertStore, selectSessionsByShop } from '../dal/merchant.dal.js';
import type { ShopifySession, MerchantStore } from '../models/merchant.model.js';
import { shopifyConfig } from '../../config.js';
import { signJwt } from '../middleware/auth.middleware.js';
import { fetchShopInfo, fetchProducts, fetchCustomers } from '../service/shopify.service.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { shop, username, password, name, email } = req.body;

  if (!shop || !username || !password) {
    res.status(400).json({ error: 'Missing required fields: shop, username, password' });
    return;
  }

  try {
    const result = await registerMerchant({ shop, username, password, name, email });
    res.status(201).json({ message: 'Merchant registered successfully', merchant: result });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed', details: (error as Error).message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Missing username or password' });
    return;
  }

  try {
    const result = await loginMerchant({ username, password });
    res.status(200).json({ message: 'Login successful', merchant: result });
  } catch (error) {
    res.status(401).json({ error: 'Login failed', details: (error as Error).message });
  }
}

export async function authBegin(req: Request, res: Response): Promise<void> {
  let shop = req.query.shop as string;

  if (!shop) {
    res.status(400).send('Missing "shop" parameter');
    return;
  }

  if (!shop.includes('.')) {
    shop = `${shop}.myshopify.com`;
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    res.status(400).send("Invalid Shopify shop name");
    return;
  }

  const state = crypto.randomBytes(16).toString("hex");

  // In production, store this in user's session or cookie
  res.cookie?.("shopify_state", state, { httpOnly: true, secure: true });

  const scopes = shopifyConfig.scopes.join(',');
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", shopifyConfig.apiKey);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", `${shopifyConfig.host}/shopify/auth/callback`);
  authUrl.searchParams.set("state", state);

  res.redirect(authUrl.toString());
}

export async function authCallback(req: Request, res: Response): Promise<void> {
  let shop = req.query.shop as string;
  const { code, state, hmac } = req.query;

  if (!shop || !code || !state || !hmac) {
    res.status(400).send("Missing OAuth parameters");
    return;
  }

  console.log(`\n==========================================`);
  console.log(`Received Shopify Authorization Code: ${code}`);
  console.log(`Shop: ${shop}`);
  console.log(`==========================================\n`);

  if (!shop.includes('.')) {
    shop = `${shop}.myshopify.com`;
  }

  try {
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: shopifyConfig.apiKey,
        client_secret: shopifyConfig.apiSecret,
        code
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    const { access_token, scope } = response.data;

    console.log('access tocken:'+access_token)

    // Save session in our database
    const dbSession: ShopifySession = {
      id: `offline_${shop}`,
      shop,
      state: state as string,
      isOnline: 0,
      scope,
      accessToken: access_token,
      expires: null,
      onlineAccessInfo: null,
    };

    await insertSession(dbSession);
    console.log(`Shopify session stored for shop: ${shop}`);
    res.status(200).json({
      message: "Shopify access token received and stored",
      shop,
      scope,
      access_token
    });
  } catch (error: any) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Could not exchange authorization code",
      details: error.response?.data || error.message
    });
  }
}

export async function autoLogin(req: Request, res: Response): Promise<void> {
  const shop = req.query.shop as string;
  if (!shop) {
    res.status(400).json({ error: 'Missing shop parameter' });
    return;
  }

  try {
    const sessions = await selectSessionsByShop(shop);
    if (sessions.length === 0) {
      res.status(401).json({ error: 'App not installed on this shop' });
      return;
    }

    let store = await selectStoreByShop(shop);
    if (!store) {
      const newStore: MerchantStore = {
        shop,
        name: shop.split('.')[0] || 'Store',
        email: null,
        createdAt: new Date().toISOString(),
        username: shop,
        passwordHash: null
      };
      await insertStore(newStore);
      store = newStore;
    }

    if (!store) {
      res.status(500).json({ error: 'Failed to create store record' });
      return;
    }

    const token = signJwt({ shop }, shopifyConfig.jwtSecret, 2592000);
    res.status(200).json({
      token,
      shop,
      merchant: {
        shop: store.shop,
        name: store.name || store.shop,
        email: store.email || null,
        shopOwner: store.name || store.shop
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Auto-login failed', details: (error as Error).message });
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  try {
    const store = await selectStoreByShop(shop);
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    // Proactively fetch shop information from Shopify API to merge
    let shopifyDetails = null;
    try {
      shopifyDetails = await fetchShopInfo(shop);
    } catch (e) {
      console.warn(`Could not fetch Shopify details for profile: ${(e as Error).message}`);
    }

    res.status(200).json({
      shop: store.shop,
      name: shopifyDetails?.name || store.name || store.shop,
      email: shopifyDetails?.email || store.email || null,
      shopOwner: store.name || store.shop,
      shopifyDetails
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', details: (error as Error).message });
  }
}

export async function getShopDetails(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  try {
    const shopInfo = await fetchShopInfo(shop);
    if (!shopInfo) {
      res.status(404).json({ error: 'Shop information not found on Shopify' });
      return;
    }
    res.status(200).json(shopInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Shopify store details', details: (error as Error).message });
  }
}

export async function getShopProducts(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  try {
    const products = await fetchProducts(shop, limit);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Shopify products', details: (error as Error).message });
  }
}

export async function getShopCustomers(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  try {
    const customers = await fetchCustomers(shop, limit);
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Shopify customers', details: (error as Error).message });
  }
}
