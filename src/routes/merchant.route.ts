import { Router } from 'express';

import { shopifyAuthMiddleware } from '../middleware/auth.middleware.js';
import type { IMerchantController } from '../models/merchant.model.js';
import { MerchantController } from '../controllers/merchant.controller.js';

export const merchantRouter: Router = Router();

const con:IMerchantController=new MerchantController()

merchantRouter.post('/register', con.register);
merchantRouter.post('/login', con.login);

merchantRouter.get('/auto-login', con.autoLogin);
merchantRouter.get('/profile', shopifyAuthMiddleware, con.getProfile);
merchantRouter.get('/shop', shopifyAuthMiddleware, con.getShopDetails);
merchantRouter.get('/products', shopifyAuthMiddleware, con.getShopProducts);
merchantRouter.get('/customers', shopifyAuthMiddleware, con.getShopCustomers);

