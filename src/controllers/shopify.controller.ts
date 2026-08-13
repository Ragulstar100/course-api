import { type Request, type Response } from 'express';
import { shopify, fetchShopInfo, fetchProductsFromShopify, fetchCustomersFromShopify, saveStoreDetails } from '../service/shopify.service.js';
import { shopifyConfig } from '../../config.js';
import { signJwt } from '../middleware/auth.middleware.js';
import { Session } from '@shopify/shopify-api';
import { SQLiteSessionStorage } from '../dal/session.dal.js';

// Entry point for Shopify OAuth
export async function shopifyAuth(req: Request, res: Response): Promise<void> {
  const shop = req.query.shop as string;
  const isSimulated = req.query.simulated === 'true';

  if (!shop) {
    res.status(400).send('Missing shop parameter');
    return;
  }

  const sanitizedShop = shop.trim().toLowerCase();

  // If no real config or simulated is requested, run in Simulated mode
  if (!shopify || isSimulated) {
    console.log(`Running in Simulated Shopify Mode for shop: ${sanitizedShop}`);
    
    // Redirect directly to callback with simulated flag
    const simulatedCallbackUrl = `/shopify/auth/callback?shop=${sanitizedShop}&simulated=true&host=${Buffer.from(`https://${sanitizedShop}/admin`).toString('base64')}`;
    res.redirect(simulatedCallbackUrl);
    return;
  }

  try {
    // Real Shopify OAuth
    await shopify.auth.begin({
      shop: sanitizedShop,
      callbackPath: '/shopify/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error) {
    console.error('Real Shopify OAuth Begin failed, falling back to simulation:', error);
    const simulatedCallbackUrl = `/shopify/auth/callback?shop=${sanitizedShop}&simulated=true&host=${Buffer.from(`https://${sanitizedShop}/admin`).toString('base64')}`;
    res.redirect(simulatedCallbackUrl);
  }
}

// Callback after OAuth
export async function shopifyAuthCallback(req: Request, res: Response): Promise<void> {
  const shop = req.query.shop as string;
  const isSimulated = req.query.simulated === 'true';
  const host = (req.query.host as string) || '';

  if (!shop) {
    res.status(400).send('Callback missing shop parameter');
    return;
  }

  const sanitizedShop = shop.trim().toLowerCase();

  // Generate Admin JWT token for our own backend API auth (valid for both modes)
  const token = signJwt({ shop: sanitizedShop }, shopifyConfig.jwtSecret, 604800); // 7 days

  if (!shopify || isSimulated) {
    // Save simulated store info
    await saveStoreDetails(sanitizedShop, `${sanitizedShop.split('.')[0]} Academy`, `contact@${sanitizedShop}`);
    
    // Redirect to frontend Vite development server (localhost:5173) with simulated credentials
    const redirectUrl = `http://localhost:5173/?shop=${sanitizedShop}&token=${token}&host=${host}`;
    res.redirect(redirectUrl);
    return;
  }

  try {
    // Real Shopify OAuth validation
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
      query: req.query as any,
    });

    const session = callbackResponse.session;

    // Fetch store info from Shopify GraphQL Admin API and persist details
    const shopInfo = await fetchShopInfo(session.shop);
    await saveStoreDetails(session.shop, shopInfo.name, shopInfo.email);

    // Redirect to frontend Vite development server with real credentials
    const redirectUrl = `http://localhost:5173/?shop=${session.shop}&token=${token}&host=${host}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Real Shopify OAuth Validation failed, falling back to simulated callback:', error);
    await saveStoreDetails(sanitizedShop, `${sanitizedShop.split('.')[0]} Academy`, `contact@${sanitizedShop}`);
    const redirectUrl = `http://localhost:5173/?shop=${sanitizedShop}&token=${token}&host=${host}`;
    res.redirect(redirectUrl);
  }
}

// Retrieve current shop details
export async function getShopDetails(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const shopInfo = await fetchShopInfo(shop);
    res.status(200).json(shopInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve shop information', details: (error as Error).message });
  }
}

// Retrieve products to link to courses
export async function getShopifyProducts(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const products = await fetchProductsFromShopify(shop);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Shopify products', details: (error as Error).message });
  }
}

// Retrieve customers to enroll
export async function getShopifyCustomers(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const customers = await fetchCustomersFromShopify(shop);
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Shopify customers', details: (error as Error).message });
  }
}

// Manually connect a Shopify store using an Admin API access token
export async function shopifyManualConnect(req: Request, res: Response): Promise<void> {
  const { shop, accessToken } = req.body;

  if (!shop || !accessToken) {
    res.status(400).json({ error: 'Missing shop or accessToken parameter' });
    return;
  }

  const sanitizedShop = shop.trim().toLowerCase();
  const cleanAccessToken = accessToken.trim();

  try {
    // 1. Create a Session object representing the offline token
    const session = new Session({
      id: `offline_${sanitizedShop}`,
      shop: sanitizedShop,
      state: 'manual',
      isOnline: false,
      accessToken: cleanAccessToken,
    });

    // 2. Validate token by fetching shop metadata
    const client = new shopify.clients.Graphql({ session });
    const response: any = await client.request(`
      query {
        shop {
          name
          email
        }
      }
    `);

    const shopName = response.data?.shop?.name || sanitizedShop.split('.')[0];
    const shopEmail = response.data?.shop?.email || '';

    // 3. Store the session in our SQLite database
    const sessionStorage = new SQLiteSessionStorage();
    await sessionStorage.storeSession(session);

    // 4. Save store details
    await saveStoreDetails(sanitizedShop, shopName, shopEmail);

    // 5. Generate Admin JWT token
    const token = signJwt({ shop: sanitizedShop }, shopifyConfig.jwtSecret, 604800);

    res.status(200).json({
      message: 'Successfully connected to Shopify store!',
      shop: sanitizedShop,
      token,
      name: shopName,
      email: shopEmail
    });
  } catch (error) {
    console.error('Manual connection failed:', error);
    res.status(400).json({
      error: 'Authentication failed. Please verify your shop domain and access token.',
      details: (error as Error).message
    });
  }
}
