// Production-safe logger utility
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  error: (message, ...args) => {
    if (isDevelopment) {
      console.error(message, ...args);
    }
    // In production, you could send to error tracking service
    // e.g., Sentry, LogRocket, etc.
  },
  warn: (message, ...args) => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  },
  info: (message, ...args) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },
  debug: (message, ...args) => {
    if (isDevelopment) {
      console.debug(message, ...args);
    }
  }
};

