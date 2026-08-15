import dotenv from 'dotenv';
import { initializeDatabase, db } from './src/dal/db.js';
import { registerStudent } from './src/service/student.service.js';
import { findCustomerByEmail, fetchCustomers } from './src/service/shopify.service.js';

dotenv.config();

const shop = 'devstore-k71vvnrv.myshopify.com';

async function testCustomerFlow() {
  console.log('--- Initializing database ---');
  await initializeDatabase();

  console.log('\n--- Fetching current customers from Shopify ---');
  try {
    const customersBefore = await fetchCustomers(shop, 5);
    console.log(`Fetched ${customersBefore.length} customer(s).`);
    console.log('Sample Shopify customer IDs:', customersBefore.map(c => `${c.firstName} ${c.lastName} (ID: ${c.id})`));
  } catch (error: any) {
    console.error('Failed to fetch customers before test:', error.message);
  }

  // Generate random email to avoid duplicate registration error
  const uniqueId = Math.floor(Math.random() * 1000000);
  const testEmail = `student_${uniqueId}@testcourseacademy.com`;
  const testName = `Jane Doe ${uniqueId}`;

  console.log(`\n--- Registering new student: ${testName} (${testEmail}) ---`);
  try {
    const registrationResult = await registerStudent({
      studentName: testName,
      email: testEmail,
      password: 'password123',
      shop: shop
    });

    console.log('✅ Registration request completed successfully!');
    console.log('Student Database ID:', registrationResult.id);
    console.log('Linked Shopify Customer ID:', registrationResult.shopifyCustomerId);

    if (registrationResult.shopifyCustomerId) {
      console.log('\n--- Verifying customer creation directly from Shopify Admin API ---');
      const shopifyCustomer = await findCustomerByEmail(shop, testEmail);
      if (shopifyCustomer) {
        console.log('✅ Shopify confirmed customer exists!');
        console.log(`Shopify Customer Details:\n- Name: ${shopifyCustomer.firstName} ${shopifyCustomer.lastName}\n- Email: ${shopifyCustomer.email}\n- Shopify ID: ${shopifyCustomer.id}`);
      } else {
        console.log('❌ Shopify did not return the customer details for the registered email.');
      }
    } else {
      console.log('❌ registrationResult did not have a shopifyCustomerId. Check if Shopify customer creation was skipped or failed.');
    }

  } catch (error: any) {
    console.error('❌ Test failed during registration/verification:', error.message);
  }

  // Close the DB connection so process can exit cleanly
  console.log('\nClosing database connection...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('Database connection closed.');
  });
}

testCustomerFlow().then(() => {
  // Let it exit
}).catch(err => {
  console.error(err);
  process.exit(1);
});
