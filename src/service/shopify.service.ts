import axios from 'axios';
import { selectSessionsByShop } from '../dal/merchant.dal.js';
import { shopifyConfig } from '../../config.js';


export async function getAccessTokenForShop(shop: string): Promise<string | null> {
  try {
    const sessions = await selectSessionsByShop(shop);
    if (sessions && sessions.length > 0) {
      const activeSession = sessions.find(s => s.accessToken);
      if (activeSession?.accessToken) {
        return activeSession.accessToken;
      }
    }
  } catch (error) {
    console.error(`Error querying session for shop ${shop}:`, error);
  }

  // Fallback to global SHOPIFY_ACCESS_TOKEN if set in env
  if (shopifyConfig.accessToken) {
    return shopifyConfig.accessToken;
  }
  return null;
}

export async function makeGraphQLRequest(shop: string, query: string, variables: any = {}): Promise<any> {
  const token = await getAccessTokenForShop(shop);

  if (!token) {
    throw new Error(`Missing Shopify Access Token for shop: ${shop}`);
  }

  const cleanShop = shop.includes('.') ? shop : `${shop}.myshopify.com`;
  const response = await axios.post(
    `https://${cleanShop}/admin/api/2026-07/graphql.json`,
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

// ==========================================
// EXPOSED API INTEGRATION METHODS
// ==========================================

export async function fetchShopInfo(shop: string): Promise<any> {
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
  const res = await makeGraphQLRequest(shop, query);
  return res?.data?.shop || null;
}

export async function fetchProducts(shop: string, limit: number = 10): Promise<any[]> {
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
  const res = await makeGraphQLRequest(shop, query, { first: limit });
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

export async function fetchCustomers(shop: string, limit: number = 10): Promise<any[]> {
  const query = `
    query GetCustomers($first: Int!) {
      customers(first: $first) {
        edges {
          node {
            id
            firstName
            lastName
            email
            phone
          }
        }
      }
    }
  `;
  const res = await makeGraphQLRequest(shop, query, { first: limit });
  const edges = res?.data?.customers?.edges || [];
  return edges.map((edge: any) => edge.node);
}

export async function findCustomerByEmail(shop: string, email: string): Promise<any | null> {
  const query = `
    query FindCustomer($query: String!) {
      customers(first: 1, query: $query) {
        edges {
          node {
            id
            firstName
            lastName
            email
            phone
          }
        }
      }
    }
  `;
  const res = await makeGraphQLRequest(shop, query, { query: `email:${email}` });
  const edges = res?.data?.customers?.edges || [];
  return edges.length > 0 ? edges[0].node : null;
}

export async function fetchProductDetails(shop: string, productId: string): Promise<any | null> {
  // Ensure product ID is correctly formatted as a Shopify GID
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
  const res = await makeGraphQLRequest(shop, query, { id: gid });
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

export async function createCustomerInShopify(shop: string, email: string, name: string): Promise<any> {
  const query = `
    mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
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
      acceptsMarketing: true
    }
  };

  const response = await makeGraphQLRequest(shop, query, variables);
  
  if (response?.data?.customerCreate?.userErrors?.length > 0) {
    throw new Error(`Shopify customerCreate errors: ${JSON.stringify(response.data.customerCreate.userErrors)}`);
  }

  return response?.data?.customerCreate?.customer || null;
}

export async function createProductInShopify(shop: string, title: string, description: string): Promise<any> {
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

  const response = await makeGraphQLRequest(shop, query, variables);

  if (response?.data?.productCreate?.userErrors?.length > 0) {
    throw new Error(`Shopify productCreate errors: ${JSON.stringify(response.data.productCreate.userErrors)}`);
  }

  return response?.data?.productCreate?.product || null;
}
