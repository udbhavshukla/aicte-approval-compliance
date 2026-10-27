import cors from 'cors';
import express, { type ErrorRequestHandler, type Express } from 'express';
import type { ApiErrorBody } from './compliance/alerts.types';
import { applicationStore, type ApplicationStore } from './data/applicationStore';
import { createAlertsRouter } from './routes/alerts.routes';
import { createApplicationsRouter } from './routes/applications.routes';
import { createHealthRouter } from './routes/health.routes';

function resolveCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured && configured.length > 0
    ? configured
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
      ];
}

function notFoundHandler(
  _request: express.Request,
  response: express.Response,
): void {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: 'The requested API route does not exist.' },
  };
  response.status(404).json(body);
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  // Log only the error message; never log application records or documents.
  console.error(
    '[compliance-api] unhandled error:',
    error instanceof Error ? error.message : 'Unknown error',
  );

  if (response.headersSent) return;

  const body: ApiErrorBody = {
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
  };
  response.status(500).json(body);
};

export function createApp(store: ApplicationStore = applicationStore): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: resolveCorsOrigins(),
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/health', createHealthRouter());
  app.use('/api/applications', createApplicationsRouter(store));
  app.use('/api/alerts', createAlertsRouter(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
