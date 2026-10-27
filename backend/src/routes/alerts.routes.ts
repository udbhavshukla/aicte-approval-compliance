import { Router } from 'express';
import { buildAlertsResponse } from '../compliance/alerts';
import type { ApiErrorBody } from '../compliance/alerts.types';
import { MAX_DUE_SOON_DAYS } from '../domain/application.constants';
import { parseDateOnly, todayDateOnly } from '../domain/date.utils';
import type { ApplicationStore } from '../data/applicationStore';

function sendError(
  response: import('express').Response,
  status: number,
  code: string,
  message: string,
): void {
  const body: ApiErrorBody = { error: { code, message } };
  response.status(status).json(body);
}

export function createAlertsRouter(store: ApplicationStore): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const rawReferenceDate = request.query.referenceDate;
    const rawDueSoonDays = request.query.dueSoonDays;

    if (rawReferenceDate !== undefined && typeof rawReferenceDate !== 'string') {
      sendError(
        response,
        400,
        'INVALID_REFERENCE_DATE',
        'referenceDate must be a single YYYY-MM-DD date.',
      );
      return;
    }

    if (rawReferenceDate !== undefined && !parseDateOnly(rawReferenceDate)) {
      sendError(
        response,
        400,
        'INVALID_REFERENCE_DATE',
        'referenceDate must be a valid YYYY-MM-DD date.',
      );
      return;
    }

    let dueSoonDays: number | undefined;
    if (rawDueSoonDays !== undefined) {
      if (typeof rawDueSoonDays !== 'string' || !/^\d{1,3}$/.test(rawDueSoonDays)) {
        sendError(
          response,
          400,
          'INVALID_DUE_SOON_DAYS',
          'dueSoonDays must be a whole number of calendar days.',
        );
        return;
      }

      dueSoonDays = Number(rawDueSoonDays);
      if (dueSoonDays > MAX_DUE_SOON_DAYS) {
        sendError(
          response,
          400,
          'INVALID_DUE_SOON_DAYS',
          `dueSoonDays must be between 0 and ${MAX_DUE_SOON_DAYS}.`,
        );
        return;
      }
    }

    const referenceDate = rawReferenceDate ?? todayDateOnly();
    const payload = buildAlertsResponse(store.list(), referenceDate, { dueSoonDays });
    response.json(payload);
  });

  return router;
}
