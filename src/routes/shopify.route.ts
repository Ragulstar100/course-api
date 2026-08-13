import { Router } from 'express';
import { 
  shopifyAuth, 
  shopifyAuthCallback, 
  shopifyManualConnect,
  getShopDetails, 
  getShopifyProducts, 
  getShopifyCustomers 
} from '../controllers/shopify.controller.js';
import { shopifyAuthMiddleware } from '../middleware/auth.middleware.js';

export const shopifyRouter: Router = Router();

// OAuth entry and callback endpoints
shopifyRouter.get('/auth', shopifyAuth);
shopifyRouter.get('/auth/callback', shopifyAuthCallback);
shopifyRouter.post('/manual-connect', shopifyManualConnect);

// Scoped Shop admin queries
shopifyRouter.get('/shop', shopifyAuthMiddleware, getShopDetails);
shopifyRouter.get('/products', shopifyAuthMiddleware, getShopifyProducts);
shopifyRouter.get('/customers', shopifyAuthMiddleware, getShopifyCustomers);
