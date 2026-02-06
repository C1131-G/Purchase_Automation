import pino from 'pino'

const isDev = import.meta.env.DEV

// Human-readable stack trace formatting similar to backend
const formatStack = (stack: unknown) => {
  if (typeof stack !== 'string') return String(stack)
  const lines = stack.split('\n')
  const fileLine =
    lines.find((l) => l.trim().startsWith('at ') && !l.includes('node_modules')) ||
    lines.find((l) => l.trim().startsWith('at '))

  if (!fileLine) return stack
  let location = fileLine.trim().replace(/^at /, '')
  const parenMatch = location.match(/\((.+)\)/)
  if (parenMatch?.[1]) {
    location = parenMatch[1]
  }
  return location
}

// In the browser, 'pino-pretty' is replaced by native console formatting
// which is already "pretty" when asObject is true.
export const logger = pino({
  level: import.meta.env.VITE_LOG_LEVEL || (isDev ? 'debug' : 'info'),
  browser: {
    asObject: true,
    // Add custom serializers if needed, but browser console handles objects best
  },
  // Redact sensitive keys if any
  redact: ['password', 'token', 'refreshToken', 'credential'],
  base: isDev
    ? { env: 'dev' }
    : {
        env: 'prod',
        version: '1.0.0',
      },
})

// Helper to create child loggers with component context
export const createLogger = (component: string) => {
  return logger.child({ component })
}

// Example usage of stack formatting in an error logger
export const logError = (message: string, error: unknown, context?: object) => {
  logger.error(
    {
      err: error,
      stack: error instanceof Error ? formatStack(error.stack) : undefined,
      ...context,
    },
    message,
  )
}
