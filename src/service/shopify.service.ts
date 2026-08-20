import axios from 'axios';

import { shopifyConfig } from '../../config.js';
import { MerchantRepository } from '../dal/merchant.dal.js';
import type { IShopifyService } from '../models/shopyfy.model.js';

  export function normalizeShop(shop: string): string {
    if (!shop) return '';
    const cleaned = shop.trim().toLowerCase();
    if (cleaned === 'test' || cleaned === 'shop') {
      return cleaned;
    }
    return cleaned.includes('.') ? cleaned : `${cleaned}.myshopify.com`;
  }

 const merchantRep:MerchantRepository=new MerchantRepository() 





export class ShopifyService implements IShopifyService {

  async getAccessTokenForShop(shop: string): Promise<string | null> {
    const normalizedShop = normalizeShop(shop);
    try {
      const sessions = await merchantRep.selectSessionsByShop(normalizedShop);
      if (sessions && sessions.length > 0) {
        const activeSession = sessions.find(s => s.accessToken);
        if (activeSession?.accessToken) {
          return activeSession.accessToken;
        }
      }
    } catch (error) {
      console.error(`Error querying session for shop ${normalizedShop}:`, error);
    }

    // Fallback to global SHOPIFY_ACCESS_TOKEN if set in env
    if (shopifyConfig.accessToken) {
      return shopifyConfig.accessToken;
    }
    return null;
  }

  async makeGraphQLRequest(query: string, variables: any = {}): Promise<any> {
    let normalizedShop = 'devstore-k71vvnrv.myshopify.com';
    const token = await this.getAccessTokenForShop(normalizedShop);

    if (!token) {
      throw new Error(`Missing Shopify Access Token for shop: ${normalizedShop}`);
    }

    const response = await axios.post(
      `https://${normalizedShop}/admin/api/2026-07/graphql.json`,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
      }
    );

    if (response.data && response.data.errors) {
      throw new Error(`Shopify GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data;
  }

  async fetchShopInfo(shop: string): Promise<any> {
    const query = `
      query GetShopInfo {
        shop {
          name
          email
          primaryDomain {
            url
          }
          currencyCode
          ianaTimezone
        }
      }
    `;
    const res = await this.makeGraphQLRequest(query);
    return res?.data?.shop || null;
  }

  async fetchProducts(shop: string, limit: number = 10): Promise<any[]> {
    const query = `
      query GetProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              status
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;
    const res = await this.makeGraphQLRequest(query, { first: limit });
    const edges = res?.data?.products?.edges || [];
    return edges.map((edge: any) => {
      const node = edge.node;
      const price = node.variants?.edges?.[0]?.node?.price || "0.00";
      const imageUrl = node.images?.edges?.[0]?.node?.url || null;
      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description,
        status: node.status,
        price,
        imageUrl
      };
    });
  }

  async fetchCustomers(shop: string, limit: number = 10): Promise<any[]> {
    const query = `
      query GetCustomers($first: Int!) {
        customers(first: $first) {
          edges {
            node {
              id
              email
            }
          }
        }
      }
    `;
    const res = await this.makeGraphQLRequest(query, { first: limit });
    const edges = res?.data?.customers?.edges || [];
    return edges.map((edge: any) => edge.node);
  }

  async findCustomerByEmail(email: string): Promise<any | null> {
    const query = `
      query FindCustomer($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              id
              email
            }
          }
        }
      }
    `;
    const res = await this.makeGraphQLRequest(query, { query: `email:${email}` });
    const edges = res?.data?.customers?.edges || [];
    return edges.length > 0 ? edges[0].node : null;
  }

  async fetchProductDetails(shop: string, productId: string): Promise<any | null> {
    let gid = productId;
    if (/^\d+$/.test(productId)) {
      gid = `gid://shopify/Product/${productId}`;
    }

    const query = `
      query GetProductDetails($id: ID!) {
        product(id: $id) {
          id
          title
          description
          status
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                price
              }
            }
          }
        }
      }
    `;
    const res = await this.makeGraphQLRequest(query, { id: gid });
    const node = res?.data?.product;
    if (!node) return null;

    const price = node.variants?.edges?.[0]?.node?.price || "0.00";
    const imageUrl = node.images?.edges?.[0]?.node?.url || null;

    return {
      id: node.id,
      title: node.title,
      description: node.description,
      status: node.status,
      price,
      imageUrl
    };
  }

  async createCustomerInShopify(email: string, name: string): Promise<any> {
    const query = `
      mutation CreateCustomer($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || 'Student';

    const variables = {
      input: {
        email,
        firstName,
        lastName,
        emailMarketingConsent: {
          marketingState: 'SUBSCRIBED',
          marketingOptInLevel: 'SINGLE_OPT_IN'
        }
      }
    };

    const response = await this.makeGraphQLRequest(query, variables);
    
    if (response?.data?.customerCreate?.userErrors?.length > 0) {
      throw new Error(`Shopify customerCreate errors: ${JSON.stringify(response.data.customerCreate.userErrors)}`);
    }

    return response?.data?.customerCreate?.customer || null;
  }

//shop name shoulbe contains domain.myshopify.com
async verifyShopifyStore(shop: string): Promise<boolean> {
  const cleanShop = shop.trim().toLowerCase();
  const shopDomain = cleanShop.includes('.') ? cleanShop : `${cleanShop}.myshopify.com`;
  
  try {
    const response = await axios.get(`https://${shopDomain}/robots.txt`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

  async createProductInShopify(shop: string, title: string, description: string): Promise<any> {
    const query = `
      mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        title,
        descriptionHtml: description,
        status: "ACTIVE"
      }
    };

    const response = await this.makeGraphQLRequest(query, variables);

    if (response?.data?.productCreate?.userErrors?.length > 0) {
      throw new Error(`Shopify productCreate errors: ${JSON.stringify(response.data.productCreate.userErrors)}`);
    }

    return response?.data?.productCreate?.product || null;
  }
}