import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { auditMiddleware } from './middleware/audit.middleware';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import { rolesRouter, permissionPointsRouter, menusRouter, userRolesRouter } from './routes/rbac.routes';
import { AppError, NOT_FOUND, INTERNAL_ERROR } from './utils/errors';
import { logger, getTraceId } from './utils/logger';

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json());

app.use(auditMiddleware);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const stubSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TripForge API',
    version: '1.0.0',
    description: 'TripForge Itinerary & Decisioning Platform',
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': { description: 'OK' },
        },
      },
    },
  },
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(stubSpec));

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/roles', rolesRouter);
app.use('/permission-points', permissionPointsRouter);
app.use('/menus', menusRouter);
app.use('/users', userRolesRouter);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, NOT_FOUND, 'Resource not found'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      traceId: getTraceId(),
    });
    return;
  }

  logger.error('unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    statusCode: 500,
    code: INTERNAL_ERROR,
    message: 'Internal server error',
    traceId: getTraceId(),
  });
});

export default app;
