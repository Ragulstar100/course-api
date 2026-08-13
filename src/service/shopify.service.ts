import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { shopifyConfig } from '../../config.js';
import { SQLiteSessionStorage } from '../dal/session.dal.js';
import { dbGet, dbRun } from '../dal/db.js';

const isRealConfig = 
  shopifyConfig.apiKey && 
  shopifyConfig.apiKey !== '' && 
  shopifyConfig.apiSecret && 
  shopifyConfig.apiSecret !== '';

export const shopify: any = isRealConfig
  ? shopifyApi({
      apiKey: shopifyConfig.apiKey,
      apiSecretKey: shopifyConfig.apiSecret,
      scopes: shopifyConfig.scopes,
      hostName: shopifyConfig.host.replace(/https?:\/\//, ''),
      apiVersion: ApiVersion.October24,
      isEmbeddedApp: true,
      sessionStorage: new SQLiteSessionStorage(),
    })
  : null;

// ==========================================
// MOCK DATA FOR SIMULATED MODE
// ==========================================

const MOCK_PRODUCTS = [
  { id: 'gid://shopify/Product/1', title: 'React Masterclass Bundle', handle: 'react-masterclass' },
  { id: 'gid://shopify/Product/2', title: 'Introduction to Node.js & SQLite', handle: 'node-sqlite-intro' },
  { id: 'gid://shopify/Product/3', title: 'Shopify App Development Guide', handle: 'shopify-app-dev' },
  { id: 'gid://shopify/Product/4', title: 'Advanced UX/UI Design principles', handle: 'ui-ux-design' },
];

const MOCK_CUSTOMERS = [
  { id: 'gid://shopify/Customer/1', firstName: 'Alex', lastName: 'Johnson', email: 'alex@example.com' },
  { id: 'gid://shopify/Customer/2', firstName: 'Emily', lastName: 'Watson', email: 'emily@example.com' },
  { id: 'gid://shopify/Customer/3', firstName: 'Sarah', lastName: 'Connor', email: 'sarah@example.com' },
  { id: 'gid://shopify/Customer/4', firstName: 'Michael', lastName: 'Scott', email: 'michael@example.com' },
];

// ==========================================
// SERVICE OPERATIONS
// ==========================================

export async function fetchShopInfo(shop: string): Promise<{ name: string; email: string }> {
  try {
    if (!shopify) {
      return { name: 'Simulated Academy', email: `admin@${shop}` };
    }

    const sessions = await new SQLiteSessionStorage().findSessionsByShop(shop);
    const session = sessions.find((s) => !s.isOnline);

    if (!session || !session.accessToken) {
      // Fallback if session is missing
      return { name: shop.split('.')[0] || 'Shopify Store', email: `admin@${shop}` };
    }

    const client = new shopify.clients.Graphql({ session });
    const response: any = await client.request(`
      query {
        shop {
          name
          email
        }
      }
    `);

    return {
      name: response.data.shop.name,
      email: response.data.shop.email,
    };
  } catch (error) {
    console.error('Error fetching shop info from Shopify Admin API:', error);
    return { name: shop.split('.')[0] || 'Shopify Store', email: `admin@${shop}` };
  }
}

export async function fetchProductsFromShopify(shop: string): Promise<any[]> {
  try {
    if (!shopify) {
      return MOCK_PRODUCTS;
    }

    const sessions = await new SQLiteSessionStorage().findSessionsByShop(shop);
    const session = sessions.find((s) => !s.isOnline);

    if (!session || !session.accessToken) {
      return MOCK_PRODUCTS;
    }

    const client = new shopify.clients.Graphql({ session });
    const response: any = await client.request(`
      query {
        products(first: 20) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `);

    const products = response.data.products.edges.map((edge: any) => edge.node);
    return products.length > 0 ? products : MOCK_PRODUCTS;
  } catch (error) {
    console.error('Error fetching products from Shopify:', error);
    return MOCK_PRODUCTS;
  }
}

export async function fetchCustomersFromShopify(shop: string): Promise<any[]> {
  try {
    if (!shopify) {
      return MOCK_CUSTOMERS;
    }

    const sessions = await new SQLiteSessionStorage().findSessionsByShop(shop);
    const session = sessions.find((s) => !s.isOnline);

    if (!session || !session.accessToken) {
      return MOCK_CUSTOMERS;
    }

    const client = new shopify.clients.Graphql({ session });
    const response: any = await client.request(`
      query {
        customers(first: 20) {
          edges {
            node {
              id
              firstName
              lastName
              email
            }
          }
        }
      }
    `);

    const customers = response.data.customers.edges.map((edge: any) => edge.node);
    return customers.length > 0 ? customers : MOCK_CUSTOMERS;
  } catch (error) {
    console.error('Error fetching customers from Shopify:', error);
    return MOCK_CUSTOMERS;
  }
}

export async function saveStoreDetails(shop: string, name: string, email: string) {
  const query = `
    INSERT INTO stores (shop, name, email, createdAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(shop) DO UPDATE SET
      name = excluded.name,
      email = excluded.email
  `;
  await dbRun(query, [shop, name, email, new Date().toISOString()]);
}

export async function getStoreDetails(shop: string) {
  return dbGet<{ shop: string; name: string; email: string; createdAt: string }>(
    'SELECT * FROM stores WHERE shop = ?',
    [shop]
  );
}

export async function createShopifyCustomer(
  shop: string,
  fullName: string,
  email: string
): Promise<string | null> {
  try {
    if (!shopify) {
      console.log(`[Simulated Shopify Mode] Creating mock customer for: ${email}`);
      return `gid://shopify/Customer/mock_${Date.now()}`;
    }

    const sessions = await new SQLiteSessionStorage().findSessionsByShop(shop);
    const session = sessions.find((s) => !s.isOnline);

    if (!session || !session.accessToken) {
      console.log(`[Shopify Auth Warning] No valid access token found for ${shop} to sync customer ${email}.`);
      return `gid://shopify/Customer/mock_${Date.now()}`;
    }

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || 'Student';

    const client = new shopify.clients.Graphql({ session });
    
    const query = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response: any = await client.request(query, {
      variables: {
        input: {
          firstName,
          lastName,
          email,
          tags: ['LMS Student'],
        }
      }
    });

    const userErrors = response.data?.customerCreate?.userErrors || [];
    if (userErrors.length > 0) {
      console.error('Shopify Customer Create validation errors:', userErrors);
      
      // If the email is already taken, let's query the customer by email and return their existing ID
      const isEmailTaken = userErrors.some((err: any) => 
        err.message.toLowerCase().includes('taken') || 
        err.message.toLowerCase().includes('exists')
      );
      
      if (isEmailTaken) {
        console.log(`Customer with email ${email} already exists in Shopify. Fetching existing customer ID...`);
        try {
          const searchQuery = `
            query searchCustomer($query: String!) {
              customers(first: 1, query: $query) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          `;
          const searchResponse: any = await client.request(searchQuery, {
            variables: { query: `email:${email}` }
          });
          const existingId = searchResponse.data?.customers?.edges?.[0]?.node?.id;
          if (existingId) {
            console.log(`[Shopify API Success] Found existing customer ID: ${existingId}`);
            return existingId;
          }
        } catch (searchErr) {
          console.error('Failed to search existing customer in Shopify:', searchErr);
        }
      }
      return null;
    }

    const customerId = response.data?.customerCreate?.customer?.id || null;
    console.log(`[Shopify API Success] Created customer in Shopify: ${customerId}`);
    return customerId;
  } catch (error) {
    console.error('Failed to create customer in Shopify via GraphQL Admin API:', error);
    return null;
  }
}

export async function updateShopifyCustomer(
  shop: string,
  shopifyCustomerId: string,
  fullName: string,
  email: string
): Promise<boolean> {
  try {
    if (!shopifyCustomerId || shopifyCustomerId.includes('mock_')) {
      console.log(`[Simulated Shopify Mode] Updating mock customer: ${shopifyCustomerId}`);
      return true;
    }

    if (!shopify) {
      console.log(`[Simulated Mode] Shopify client null. Bypassing customer update.`);
      return true;
    }

    const sessions = await new SQLiteSessionStorage().findSessionsByShop(shop);
    const session = sessions.find((s) => !s.isOnline);

    if (!session || !session.accessToken) {
      console.log(`No active Shopify session for ${shop}. Bypassing customer update.`);
      return false;
    }

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || 'Student';

    const client = new shopify.clients.Graphql({ session });

    const query = `
      mutation customerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response: any = await client.request(query, {
      variables: {
        input: {
          id: shopifyCustomerId,
          firstName,
          lastName,
          email,
          tags: ['LMS Student'],
        }
      }
    });

    const userErrors = response.data?.customerUpdate?.userErrors || [];
    if (userErrors.length > 0) {
      console.error('Shopify Customer Update userErrors:', userErrors);
      return false;
    }

    console.log(`[Shopify API Success] Updated customer in Shopify: ${shopifyCustomerId}`);
    return true;
  } catch (error) {
    console.error('Failed to update customer in Shopify via GraphQL Admin API:', error);
    return false;
  }
}

export async function deleteShopifyCustomer(
  shop: string,
  shopifyCustomerId: string
): Promise<boolean> {
  try {
    if (!shopifyCustomerId || shopifyCustomerId.includes('mock_')) {
      console.log(`[Simulated Shopify Mode] Deleting mock customer: ${shopifyCustomerId}`);
      return true;
    }

    if (!shopify) {
      console.log(`[Simulated Mode] Shopify client null. Bypassing customer delete.`);
      return true;
    }

    const sessions = await new SQLiteSessionStorage().findSessionsByShop(shop);
    const session = sessions.find((s) => !s.isOnline);

    if (!session || !session.accessToken) {
      console.log(`No active Shopify session for ${shop}. Bypassing customer delete.`);
      return false;
    }

    const client = new shopify.clients.Graphql({ session });

    const query = `
      mutation customerDelete($id: ID!) {
        customerDelete(id: $id) {
          deletedCustomerId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response: any = await client.request(query, {
      variables: {
        id: shopifyCustomerId
      }
    });

    const userErrors = response.data?.customerDelete?.userErrors || [];
    if (userErrors.length > 0) {
      console.error('Shopify Customer Delete userErrors:', userErrors);
      return false;
    }

    console.log(`[Shopify API Success] Deleted customer in Shopify: ${shopifyCustomerId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete customer from Shopify via GraphQL Admin API:', error);
    return false;
  }
}


