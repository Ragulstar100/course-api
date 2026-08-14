import { Router } from 'express';
import { register, login, authBegin, authCallback } from '../controllers/merchant.controller.js';

export const merchantRouter: Router = Router();

merchantRouter.post('/register', register);
merchantRouter.post('/login', login);
merchantRouter.get('/auth', authBegin);
merchantRouter.get('/auth/callback', authCallback);
