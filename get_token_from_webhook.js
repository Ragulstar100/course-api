import axios from 'axios';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const webhookToken = '0477893d-43ea-4344-a396-64f816df7ce7';
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;

console.log(`Using SHOPIFY_API_KEY: ${apiKey}`);
console.log(`Polling Webhook.site token: ${webhookToken} for redirect request...`);

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function pollAndExchange() {
  const db = new sqlite3.Database('./courses.db');
  
  for (let i = 0; i < 150; i++) { // poll for 300 seconds (2s intervals)
    try {
      const response = await axios.get(`https://webhook.site/token/${webhookToken}/requests?sorting=newest`);
      const data = response.data;
      if (data && data.data && data.data.length > 0) {
        console.log(`Found ${data.data.length} requests on Webhook.site!`);
        // Find the latest request containing code, shop, state
        let oauthRequest = null;
        for (const req of data.data) {
          if (req.query && req.query.code && req.query.shop) {
            oauthRequest = req;
            break;
          }
        }
        
        if (oauthRequest) {
          const { code, shop, state } = oauthRequest.query;
          console.log(`Extracted OAuth parameters:`);
          console.log(`- Shop: ${shop}`);
          console.log(`- Code: ${code.substring(0, 10)}...`);
          console.log(`- State: ${state}`);
          
          console.log(`Exchanging authorization code for access token...`);
          const tokenResponse = await axios.post(
            `https://${shop}/admin/oauth/access_token`,
            {
              client_id: apiKey,
              client_secret: apiSecret,
              code
            },
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
              }
            }
          );
          
          const { access_token, scope } = tokenResponse.data;
          console.log(`✅ Received access token from Shopify!`);
          
          // Insert into database
          await dbRun(db, `
            INSERT OR REPLACE INTO shopify_sessions (id, shop, state, isOnline, scope, accessToken)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [`offline_${shop}`, shop, state, 0, scope, access_token]);
          
          console.log(`✅ Access token successfully saved to SQLite database!`);
          db.close();
          process.exit(0);
        } else {
          console.log(`Requests found, but none contained Shopify OAuth query parameters.`);
        }
      } else {
        console.log(`[${i+1}/30] Waiting for redirect request on webhook.site...`);
      }
    } catch (error) {
      console.error(`Error during polling/exchange:`, error.message);
      if (error.response) {
        console.error(`Response details:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  
  console.log(`Timeout: No Shopify OAuth redirect received on Webhook.site.`);
  db.close();
  process.exit(1);
}

pollAndExchange();
