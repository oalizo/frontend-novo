require('dotenv').config();
const { processOrders } = require('./amazon-orders-processor');

async function main() {
  try {
    await processOrders();
    console.log('✅ Orders fetched and processed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fetching orders:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();