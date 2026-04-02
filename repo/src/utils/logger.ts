import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export const traceStore = new AsyncLocalStorage<{ traceId: string }>();

export function getTraceId(): string | undefined {
  return traceStore.getStore()?.traceId;
}

const traceFormat = winston.format((info) => {
  const traceId = getTraceId();
  if (traceId) {
    info.traceId = traceId;
  }
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    traceFormat(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
  silent: process.env.NODE_ENV === 'test',
});
