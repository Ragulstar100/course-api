import { initializeDatabase, dbAll } from './src/dal/db.js';

async function checkDb() {
  await initializeDatabase();
  console.log('\n--- Shopify Sessions ---');
  const sessions = await dbAll('SELECT * FROM shopify_sessions');
  console.log(JSON.stringify(sessions, null, 2));

  console.log('\n--- Stores ---');
  const stores = await dbAll('SELECT * FROM stores');
  console.log(JSON.stringify(stores, null, 2));
}

checkDb().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
