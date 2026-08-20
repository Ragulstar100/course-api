import { type Request, type Response } from 'express';

export type MerchantStore = {
  shop: string;
  name?: string | null;
  email?: string | null;
  createdAt: string;
  username?: string | null;
  passwordHash?: string | null;
};

export type RegisterMerchantRequest = {
  shop: string;
  username: string;
  password: string;
  name?: string;
  email?: string;
};

export type LoginMerchantRequest = {
  username: string;
  password: string;
};

export type MerchantAuthResponse = {
  shop: string;
  name: string | null;
  email: string | null;
  username: string;
  token: string;
};

export interface IMerchantController {
  autoLogin(req: Request, res: Response): Promise<void>;
  getProfile(req: Request, res: Response): Promise<void>;
  getShopDetails(req: Request, res: Response): Promise<void>;
  getShopProducts(req: Request, res: Response): Promise<void>;
  getShopCustomers(req: Request, res: Response): Promise<void>;
}



export interface IMerchantService {
  registerMerchant(data: RegisterMerchantRequest): Promise<MerchantAuthResponse>;
  loginMerchant(data: LoginMerchantRequest): Promise<MerchantAuthResponse>;
}

export interface IMerchantRepository {
  insertStore(store: MerchantStore): Promise<MerchantStore>;
  selectStoreByShop(shop: string): Promise<MerchantStore | null>;
  selectStoreByUsername(username: string): Promise<MerchantStore | null>;
  insertSession(session: ShopifySession): Promise<void>;
  selectSessionById(id: string): Promise<ShopifySession | null>;
  deleteSessionById(id: string): Promise<void>;
  deleteSessionsByIds(ids: string[]): Promise<void>;
  selectSessionsByShop(shop: string): Promise<ShopifySession[]>;
}


export type ShopifySession = {
  id: string;
  shop: string;
  state: string;
  isOnline: number; // 0 or 1 in SQLite
  scope?: string | null;
  accessToken?: string | null;
  expires?: number | null; // stored as timestamp integer in SQLite
  onlineAccessInfo?: string | null; // stored as JSON string
};



