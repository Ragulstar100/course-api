import { Router } from 'express';
import { register, login } from '../controllers/merchant.controller.js';

export const merchantRouter: Router = Router();

merchantRouter.post('/register', register);
merchantRouter.post('/login', login);
