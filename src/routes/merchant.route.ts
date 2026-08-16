import { Router } from 'express';
import { 
  register, 
  login, 
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

merchantRouter.get('/auto-login', autoLogin);
merchantRouter.get('/profile', shopifyAuthMiddleware, getProfile);
merchantRouter.get('/shop', shopifyAuthMiddleware, getShopDetails);
merchantRouter.get('/products', shopifyAuthMiddleware, getShopProducts);
merchantRouter.get('/customers', shopifyAuthMiddleware, getShopCustomers);

