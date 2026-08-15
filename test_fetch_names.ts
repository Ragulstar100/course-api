import dotenv from 'dotenv';
import { makeGraphQLRequest } from './src/service/shopify.service.js';

dotenv.config();

const shop = 'devstore-k71vvnrv.myshopify.com';
const customerId = 'gid://shopify/Customer/9052588015790';

async function run() {
  const query = `
    query GetCustomer($id: ID!) {
      customer(id: $id) {
        id
        email
        firstName
        lastName
      }
    }
  `;
  try {
    const res = await makeGraphQLRequest(shop, query, { id: customerId });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
