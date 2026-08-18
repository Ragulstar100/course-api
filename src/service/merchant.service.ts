import crypto from 'crypto';
import type { 
  MerchantStore, 
  RegisterMerchantRequest, 
  LoginMerchantRequest, 
  MerchantAuthResponse, 
  IMerchantRepository
} from '../models/merchant.model.js';
import type { IMerchantService } from '../models/merchant.model.js';
import { signJwt } from '../middleware/auth.middleware.js';
import { shopifyConfig } from '../../config.js';
import { MerchantRepository } from '../dal/merchant.dal.js';


const repositery:IMerchantRepository=new MerchantRepository()
const sessionRepsitery=null



export class MerchantService implements IMerchantService {
  async registerMerchant(data: RegisterMerchantRequest): Promise<MerchantAuthResponse> {
    const shop = data.shop.trim().toLowerCase();
    const username = data.username.trim().toLowerCase();

    // Validate if store already exists by shop key
    const existingShop = await repositery.selectStoreByShop(shop);
    if (existingShop) {
      throw new Error('Store/Shop ID is already registered');
    }

    // Validate if username already exists
    const existingUser = await repositery.selectStoreByUsername(username);
    if (existingUser) {
      throw new Error('Username is already taken');
    }

    const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');
    const createdAt = new Date().toISOString();

    const store: MerchantStore = {
      shop,
      name: data.name || username,
      email: data.email || null,
      createdAt,
      username,
      passwordHash
    };

    await repositery.insertStore(store);

    // Generate JWT token (matching the studentAuth / shopifyAuth format with 'shop' property)
    const token = signJwt({ shop }, shopifyConfig.jwtSecret, 2592000); // 30 days

    return {
      shop: store.shop,
      name: store.name || null,
      email: store.email || null,
      username: store.username || '',
      token
    };
  }

  async loginMerchant(data: LoginMerchantRequest): Promise<MerchantAuthResponse> {
    const username = data.username.trim().toLowerCase();

    const store = await repositery.selectStoreByUsername(username)
    if (!store) {
      throw new Error('Invalid username or password');
    }

    const hashedPassword = crypto.createHash('sha256').update(data.password).digest('hex');
    if (store.passwordHash !== hashedPassword) {
      throw new Error('Invalid username or password');
    }

    const token = signJwt({ shop: store.shop }, shopifyConfig.jwtSecret, 2592000); // 30 days

    return {
      shop: store.shop,
      name: store.name || null,
      email: store.email || null,
      username: store.username || '',
      token
    };
  }
}

