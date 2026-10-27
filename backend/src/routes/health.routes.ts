import { Router } from 'express';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'sih-aicte-compliance-api',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
