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
