import { Router } from 'express';
import { 
  register, 
  login, 
  authBegin, 
  authCallback, 
  autoLogin, 
  getProfile,
  getShopDetails,
  getShopProducts,
  getShopCustomers
} from '../controllers/merchant.controller.js';
import { shopifyAuthMiddleware } from '../middleware/auth.middleware.js';

export const merchantRouter: Router = Router();

merchantRouter.post('/register', register);
merchantRouter.post('/login', login);
merchantRouter.get('/auth', authBegin);
merchantRouter.get('/auth/callback', authCallback);
merchantRouter.get('/auto-login', autoLogin);
merchantRouter.get('/profile', shopifyAuthMiddleware, getProfile);
merchantRouter.get('/shop', shopifyAuthMiddleware, getShopDetails);
merchantRouter.get('/products', shopifyAuthMiddleware, getShopProducts);
merchantRouter.get('/customers', shopifyAuthMiddleware, getShopCustomers);

