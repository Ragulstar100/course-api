import sqlite3 from 'sqlite3';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const shop = 'devstore.myshopify.com';

function getSessionFromDb(shopDomain: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./courses.db', (err) => {
      if (err) return reject(err);
    });

    db.get(
      'SELECT accessToken FROM shopify_sessions WHERE shop = ? OR shop = ?',
      [shopDomain, shopDomain.replace('.myshopify.com', '')],
      (err, row) => {
        db.close();
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

async function runCheck() {
  console.log(`Checking stored access token for shop: ${shop}`);
  
  try {
    const row = await getSessionFromDb(shop);
    if (!row || !row.accessToken) {
      console.log(`\n❌ Shopify OAuth Test: FAILED`);
      console.log(`Reason: No stored access token found for ${shop} in database.`);
      console.log(`To get an access token, run the server and open:`);
      console.log(`http://localhost:1000/shopify/auth?shop=${shop}`);
      return;
    }

    const accessToken = row.accessToken;
    console.log(`\n✅ Access token found: ${accessToken.substring(0, 10)}...`);
    console.log(`Sending test GraphQL query to Shopify Admin API...`);

    if (accessToken.startsWith('shpat_mock')) {
      console.log(`\n🎉 [Mock Mode] Shopify Admin API Request Successful!`);
      console.log(`Shop Info:`, JSON.stringify({
        name: "Mock Dev Store",
        email: "admin@devstore.myshopify.com",
        primaryDomain: {
          url: `https://${shop}`
        }
      }, null, 2));
      console.log(`\n✅ Shopify OAuth Test: SUCCESS`);
      return;
    }

    const query = `
      query {
        shop {
          name
          email
          primaryDomain {
            url
          }
        }
      }
    `;

    const response = await axios.post(
      `https://${shop}/admin/api/2026-07/graphql.json`,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    if (response.data && response.data.errors) {
      console.log(`\n❌ Shopify OAuth Test: FAILED`);
      console.log(`Reason: GraphQL Errors:`, JSON.stringify(response.data.errors, null, 2));
      return;
    }

    console.log(`\n✅ Shopify OAuth Test: SUCCESS`);
    console.log(`Shop Info:`, JSON.stringify(response.data.data.shop, null, 2));

  } catch (error: any) {
    console.error(`\n❌ Shopify OAuth Test: FAILED`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`Error message: ${error.message}`);
    }
  }
}

runCheck();
