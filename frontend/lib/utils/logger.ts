type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000

  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    }

    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Safe console logging that won't cause DataCloneError
    const logData = data ? this.sanitizeData(data) : ''
    console[level](`[${entry.timestamp}] ${message}`, logData)
  }

  private sanitizeData(data: any): any {
    try {
      // Convert data to string and back to remove non-cloneable objects
      return JSON.parse(JSON.stringify(data))
    } catch {
      return '[Complex Data]'
    }
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data)
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data)
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data)
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data)
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }
}

// Create singleton instance
const logger = new Logger()

// Hook for React components
export function useLogger() {
  return logger
}

// Export for non-React code
export { logger }