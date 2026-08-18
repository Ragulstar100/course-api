import { type Request, type Response } from 'express';
import type { IMerchantController, IMerchantRepository, IMerchantService } from '../models/merchant.model.js';
import type { MerchantStore } from '../models/merchant.model.js';
import { shopifyConfig } from '../../config.js';
import { signJwt } from '../middleware/auth.middleware.js';
import { MerchantService } from '../service/merchant.service.js';
import { MerchantRepository } from '../dal/merchant.dal.js';
import { ShopifyService } from '../service/shopify.service.js';


const service:IMerchantService=new MerchantService()
const repositery:IMerchantRepository=new MerchantRepository()

const shopyfyService:ShopifyService=new ShopifyService()


export class MerchantController implements IMerchantController {
  async register(req: Request, res: Response): Promise<void> {
    const { shop, username, password, name, email } = req.body;

    if (!shop || !username || !password) {
      res.status(400).json({ error: 'Missing required fields: shop, username, password' });
      return;
    }

    try {
      const result = await service.registerMerchant({ shop, username, password, name, email });
      res.status(201).json({ message: 'Merchant registered successfully', merchant: result });
    } catch (error) {
      res.status(400).json({ error: 'Registration failed', details: (error as Error).message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Missing username or password' });
      return;
    }

    try {
      const result = await service.loginMerchant({ username, password });
      res.status(200).json({ message: 'Login successful', merchant: result });
    } catch (error) {
      res.status(401).json({ error: 'Login failed', details: (error as Error).message });
    }
  }

  async autoLogin(req: Request, res: Response): Promise<void> {
    const shop = req.query.shop as string;
    if (!shop) {
      res.status(400).json({ error: 'Missing shop parameter' });
      return;
    }

    try {
      let store = await repositery.selectStoreByShop(shop);
      if (!store) {
        const newStore: MerchantStore = {
          shop,
          name: shop.split('.')[0] || 'Store',
          email: null,
          createdAt: new Date().toISOString(),
          username: shop,
          passwordHash: null
        };
        await repositery.insertStore(newStore);
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

  async getProfile(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    try {
      const store = await repositery.selectStoreByShop(shop);
      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      // Proactively fetch shop information from Shopify API to merge
      let shopifyDetails = null;
      try {
        shopifyDetails = await shopyfyService.fetchShopInfo(shop);
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

  async getShopDetails(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    try {
      const shopInfo = await shopyfyService.fetchShopInfo(shop);
      if (!shopInfo) {
        res.status(404).json({ error: 'Shop information not found on Shopify' });
        return;
      }
      res.status(200).json(shopInfo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Shopify store details', details: (error as Error).message });
    }
  }

  async getShopProducts(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    try {
      const products = await shopyfyService.fetchProducts(shop, limit);
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Shopify products', details: (error as Error).message });
    }
  }

  async getShopCustomers(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    try {
      const customers = await shopyfyService.fetchCustomers(shop, limit);
      res.status(200).json(customers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Shopify customers', details: (error as Error).message });
    }
  }
}