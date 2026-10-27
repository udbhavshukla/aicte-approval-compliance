import { Router } from 'express';
import { resolveApplicationReadModel } from '../compliance/alerts';
import type { ApplicationsResponse } from '../compliance/alerts.types';
import type { ApplicationStore } from '../data/applicationStore';

export function createApplicationsRouter(store: ApplicationStore): Router {
  const router = Router();

  router.get('/', (_request, response) => {
    // Resolve central document rules and normalise identifiers in the read
    // model so UI consumers do not have to duplicate compliance logic.
    const applications = store.list().map(resolveApplicationReadModel);
    const body: ApplicationsResponse = {
      applications,
      count: applications.length,
      meta: {
        dataSource: 'in-memory',
        note: 'Fictional sample data for the prototype. It resets when the backend restarts.',
      },
    };

    response.json(body);
  });

  return router;
}
