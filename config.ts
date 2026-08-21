import dotenv from 'dotenv';

dotenv.config();

type ProjectConfig = {
  port: string;
};

export const environment = process.env.environment || 'development';

export const server: ProjectConfig = {
  port: process.env.port || '1000',
};

export const shopifyConfig = {
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecret: process.env.SHOPIFY_API_SECRET || '',
  scopes: (process.env.SHOPIFY_SCOPES || 'read_products,read_customers').split(','),
  host: process.env.HOST || 'http://localhost:1000',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_course_academy_jwt_key',
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN || 'devstore-k71vvnrv.myshopify.com',
};

//depende




