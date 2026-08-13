import { type Request, type Response } from 'express';
import { registerMerchant, loginMerchant } from '../service/merchant.service.js';

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
