import app from './app';
import { env } from './config/environment';
import { getPrisma } from './config/database';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  const prisma = getPrisma();

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }

  app.listen(env.port, () => {
    logger.info(`Server started on port ${env.port}`);
  });
}

main();
