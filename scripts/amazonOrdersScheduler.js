const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const TelegramBot = require('./telegramBot');
const { processOrders } = require('./amazon-orders-processor');

// Load environment variables
require('dotenv').config();

// =================== CONFIGURAÇÃO ===================
const LOG_FILE = path.join(__dirname, 'scheduler.log');

// Initialize Telegram Bot
let telegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_CHAT_ID !== 'YOUR_CHAT_ID_HERE') {
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);
}

// =================== LOGGING ===================
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  // Console output
  console.log(logMessage);
  
  // File output
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}: ${error.message}`;
  
  // Console output
  console.error(logMessage);
  if (error.stack) {
    console.error('Stack:', error.stack);
  }
  
  // File output
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
  if (error.stack) {
    fs.appendFileSync(LOG_FILE, 'Stack: ' + error.stack + '\n');
  }
}

// =================== SCHEDULER ===================
async function runOrderProcessing() {
  const startTime = Date.now();
  log('🎯 Starting order processing...');
  
  try {
    const result = await processOrders();
    const processingTime = (Date.now() - startTime) / 1000;
    
    log(`✅ Processing completed: ${result.processedOrders} orders processed in ${processingTime.toFixed(1)}s`);
    
    // Send Telegram notification
    if (telegramBot) {
      await telegramBot.sendOrderReport({
        newOrders: result.newOrders || 0,
        updatedOrders: result.updatedOrders || 0,
        totalValue: result.totalValue || 0,
        processingTime: processingTime,
        errors: result.errors || 0
      });
    }
    
  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000;
    logError('❌ Order processing failed', error);
    
    // Send error notification
    if (telegramBot) {
      await telegramBot.sendError(`Order processing failed: ${error.message}`);
    }
  }
}

// =================== HEALTH CHECK ===================
function healthCheck() {
  const memoryUsage = process.memoryUsage();
  const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const uptime = Math.round(process.uptime() / 60); // minutes
  
  log(`💙 Health Check - Memory: ${memoryMB}MB, Uptime: ${uptime} minutes`);
  
  // Send health check to Telegram
  if (telegramBot) {
    telegramBot.sendHealthCheck({
      memoryMB: memoryMB,
      uptimeMinutes: uptime
    });
  }
}

// =================== MAIN SCHEDULER ===================
function startScheduler() {
  log('🎯 Amazon Orders Scheduler started');
  log('📅 Schedule: Every 15 minutes');
  log('🔍 Health checks: Every hour');
  
  // Execute order processing every 15 minutes
  // Cron pattern: "*/15 * * * *" = every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await runOrderProcessing();
  });
  
  // Health check every hour
  cron.schedule('0 * * * *', () => {
    healthCheck();
  });
  
  // Run immediately on startup (optional)
  if (process.argv.includes('--run-now')) {
    log('🏃‍♂️ Running immediately on startup...');
    setTimeout(runOrderProcessing, 5000); // Wait 5 seconds then run
  }
  
  // Keep process alive
  process.on('SIGTERM', () => {
    log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });
  
  // Initial health check
  setTimeout(healthCheck, 10000); // After 10 seconds
}

// =================== ERROR HANDLING ===================
process.on('uncaughtException', (error) => {
  logError('💥 Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('💥 Unhandled Rejection at', reason);
  process.exit(1);
});

// =================== START ===================
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, runOrderProcessing };
