// src/config/prisma.js
// Single PrismaClient instance — reused across the entire app.

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalForPrisma = globalThis;

const prismaInstance =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.isDev ? ['error', 'warn'] : ['error'],
  });

// Set default interactive transaction timeout to 30s (30,000ms) with 10s maxWait
// (Prisma defaults are 5s timeout and 2s maxWait, which caused timeouts during bulk uploads).
if (!prismaInstance.__hasCustomTransactionTimeout) {
  const originalTransaction = prismaInstance.$transaction.bind(prismaInstance);
  prismaInstance.$transaction = (arg, options = {}) => {
    if (typeof arg === 'function') {
      return originalTransaction(arg, {
        maxWait: 10000,
        timeout: 30000,
        ...options,
      });
    }
    return originalTransaction(arg, options);
  };
  prismaInstance.__hasCustomTransactionTimeout = true;
}

const prisma = prismaInstance;

if (process.env.NODE_ENV === 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
