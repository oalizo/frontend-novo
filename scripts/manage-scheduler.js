#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(__dirname, '.scheduler.pid');
const LOG_FILE = path.join(__dirname, 'scheduler.log');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function isRunning() {
  if (!fs.existsSync(PID_FILE)) {
    return false;
  }
  
  const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
  
  try {
    process.kill(pid, 0); // Signal 0 just checks if process exists
    return true;
  } catch (error) {
    // Process doesn't exist, remove stale PID file
    fs.unlinkSync(PID_FILE);
    return false;
  }
}

function start(runNow = false) {
  if (isRunning()) {
    log('❌ Scheduler is already running');
    return;
  }
  
  log('🚀 Starting Amazon Orders Scheduler...');
  
  const args = ['amazonOrdersScheduler.js'];
  if (runNow) {
    args.push('--run-now');
  }
  
  const child = spawn('node', args, {
    cwd: __dirname,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Save PID
  fs.writeFileSync(PID_FILE, child.pid.toString());
  
  // Setup logging
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  
  child.unref(); // Allow parent to exit
  
  log(`✅ Scheduler started with PID: ${child.pid}`);
  log(`📝 Logs are being written to: ${LOG_FILE}`);
}

function stop() {
  if (!isRunning()) {
    log('❌ Scheduler is not running');
    return;
  }
  
  const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
  log(`🛑 Stopping scheduler (PID: ${pid})...`);
  
  try {
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(PID_FILE);
    log('✅ Scheduler stopped successfully');
  } catch (error) {
    log(`❌ Error stopping scheduler: ${error.message}`);
  }
}

function status() {
  if (isRunning()) {
    const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    log(`✅ Scheduler is running (PID: ${pid})`);
  } else {
    log('❌ Scheduler is not running');
  }
}

function restart(runNow = false) {
  log('🔄 Restarting scheduler...');
  stop();
  setTimeout(() => start(runNow), 2000);
}

function showLogs(lines = 50) {
  if (!fs.existsSync(LOG_FILE)) {
    log('❌ No log file found');
    return;
  }
  
  log(`📝 Last ${lines} lines of scheduler logs:`);
  console.log('─'.repeat(80));
  
  const logContent = fs.readFileSync(LOG_FILE, 'utf8');
  const logLines = logContent.split('\n');
  const lastLines = logLines.slice(-lines).join('\n');
  
  console.log(lastLines);
  console.log('─'.repeat(80));
}

// =================== CLI ===================
const command = process.argv[2];
const option = process.argv[3];

switch (command) {
  case 'start':
    start(option === '--run-now');
    break;
  case 'stop':
    stop();
    break;
  case 'restart':
    restart(option === '--run-now');
    break;
  case 'status':
    status();
    break;
  case 'logs':
    const lines = option ? parseInt(option) : 50;
    showLogs(lines);
    break;
  default:
    console.log(`
Amazon Orders Scheduler Management

Usage:
  node manage-scheduler.js <command> [options]

Commands:
  start [--run-now]   Start the scheduler daemon
  stop                Stop the scheduler daemon  
  restart [--run-now] Restart the scheduler daemon
  status              Check if scheduler is running
  logs [lines]        Show recent logs (default: 50 lines)

Examples:
  node manage-scheduler.js start
  node manage-scheduler.js start --run-now
  node manage-scheduler.js status
  node manage-scheduler.js logs 100
  node manage-scheduler.js restart
    `);
}
