// Tiny dev-only logger. No-ops in production builds (NODE_ENV === 'production').
const isDev = process.env.NODE_ENV !== "production";

export const devLog = {
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  error: (...args) => {
    if (isDev) console.error(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
};
