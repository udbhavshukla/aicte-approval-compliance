import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createApplicationStore } from '../src/data/applicationStore';
import { createSampleApplications } from '../src/data/sampleApplications';
import type { Application } from '../src/domain/application.types';

const REFERENCE_DATE = '2026-10-27';

function createTestApp() {
  const store = createApplicationStore(createSampleApplications(REFERENCE_DATE));
  return createApp(store);
}

describe('compliance API', () => {
  const app = createTestApp();

  it('GET /api/health reports a healthy service', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'sih-aicte-compliance-api',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('GET /api/applications returns the shared in-memory records', async () => {
    const response = await request(app).get('/api/applications').expect(200);
    expect(response.body.count).toBe(9);
    expect(response.body.applications).toHaveLength(9);
    expect(response.body.meta.dataSource).toBe('in-memory');
    expect(response.body.applications[0]).toMatchObject({
      id: 'APP-2026-001',
      collegeName: 'Vidya Institute of Technology',
    });
  });

  it('GET /api/alerts derives alerts and counts from the same records', async () => {
    const response = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);

    expect(response.body.meta).toMatchObject({
      referenceDate: REFERENCE_DATE,
      dueSoonThresholdDays: 3,
      dataSource: 'in-memory',
    });
    expect(response.body.summary).toMatchObject({
      totalActiveAlerts: 8,
      missingDocumentAlerts: 4,
      upcomingDeadlineAlerts: 3,
      overdueAlerts: 1,
      missingDocumentTotal: 6,
      critical: 2,
      warning: 6,
    });
    expect(response.body.alerts).toHaveLength(response.body.summary.totalActiveAlerts);
    expect(
      response.body.alerts.filter(
        (alert: { type: string }) => alert.type === 'missing_documents',
      ),
    ).toHaveLength(response.body.summary.missingDocumentAlerts);
  });

  it('reports malformed sample data as a diagnostic instead of failing', async () => {
    const response = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);

    expect(response.body.diagnostics).toEqual([
      expect.objectContaining({
        applicationId: 'APP-2026-009',
        code: 'invalid_due_date',
      }),
    ]);
  });

  it('supports an explicit threshold for prototype testing', async () => {
    const response = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}&dueSoonDays=10`)
      .expect(200);

    expect(response.body.meta.dueSoonThresholdDays).toBe(10);
    expect(response.body.summary.upcomingDeadlineAlerts).toBeGreaterThan(3);
  });

  it('rejects an invalid reference date', async () => {
    const response = await request(app)
      .get('/api/alerts?referenceDate=2026-02-30')
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REFERENCE_DATE',
        message: 'referenceDate must be a valid YYYY-MM-DD date.',
      },
    });
  });

  it('rejects an invalid dueSoonDays value', async () => {
    const response = await request(app)
      .get('/api/alerts?dueSoonDays=1000')
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_DUE_SOON_DAYS');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('compliance API edge cases and headers', () => {
  const app = createTestApp();

  it('returns empty applications and alerts for an empty store', async () => {
    const emptyStoreApp = createApp(createApplicationStore([]));
    const applications = await request(emptyStoreApp).get('/api/applications').expect(200);
    expect(applications.body).toMatchObject({ applications: [], count: 0 });

    const alerts = await request(emptyStoreApp)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);
    expect(alerts.body.alerts).toEqual([]);
    expect(alerts.body.summary).toEqual({
      totalActiveAlerts: 0,
      missingDocumentAlerts: 0,
      upcomingDeadlineAlerts: 0,
      overdueAlerts: 0,
      missingDocumentTotal: 0,
      critical: 0,
      warning: 0,
    });
    expect(alerts.body.diagnostics).toEqual([]);
  });

  it('resolves central document rules and normalises identifiers in /api/applications', async () => {
    const application: Application = {
      id: '  APP-RESOLVE  ',
      collegeName: '  Resolve Institute  ',
      type: '  Renewal  ',
      status: '  Pending  ',
      assignedOfficer: '  Officer Two  ',
      dueDate: null,
      requiredDocuments: ['   '],
      submittedDocuments: [' application_form ', 'application_form', ''],
    };
    const customApp = createApp(createApplicationStore([application]));
    const response = await request(customApp).get('/api/applications').expect(200);

    expect(response.body.applications[0]).toMatchObject({
      id: 'APP-RESOLVE',
      collegeName: 'Resolve Institute',
      type: 'Renewal',
      status: 'Pending',
      assignedOfficer: 'Officer Two',
      requiredDocuments: [
        'application_form',
        'affiliation_certificate',
        'compliance_report',
        'financial_statement',
      ],
      submittedDocuments: ['application_form'],
    });

    // The alert engine trims identifiers too, so the drawer can always find the
    // record returned by the applications endpoint.
    const alerts = await request(customApp)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);
    expect(alerts.body.alerts.length).toBeGreaterThan(0);
    for (const alert of alerts.body.alerts) {
      expect(alert.applicationId).toBe('APP-RESOLVE');
    }
  });

  it('keeps alert calculation consistent with the applications endpoint', async () => {
    const applications = await request(app).get('/api/applications').expect(200);
    const alerts = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);

    const ids = new Set(applications.body.applications.map((entry: Application) => entry.id));
    for (const alert of alerts.body.alerts) {
      expect(ids.has(alert.applicationId)).toBe(true);
    }
  });

  it('returns repeatable alerts and does not mutate statuses', async () => {
    const first = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);
    const second = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);

    expect(second.body.alerts).toEqual(first.body.alerts);
    expect(second.body.summary).toEqual(first.body.summary);
    expect(second.body.diagnostics).toEqual(first.body.diagnostics);

    const applications = await request(app).get('/api/applications').expect(200);
    expect(applications.body.applications[0].status).toBe('Under Review');
    expect(applications.body.applications[4].status).toBe('Approved');
  });

  it('accepts threshold boundaries 0 and 365', async () => {
    const zero = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}&dueSoonDays=0`)
      .expect(200);
    const max = await request(app)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}&dueSoonDays=365`)
      .expect(200);

    expect(zero.body.meta.dueSoonThresholdDays).toBe(0);
    expect(max.body.meta.dueSoonThresholdDays).toBe(365);
  });

  it.each(['-1', '1.5', 'abc', '366', '', ' 3', '3.0'])(
    'rejects dueSoonDays=%j',
    async (value) => {
      const response = await request(app)
        .get(`/api/alerts?dueSoonDays=${encodeURIComponent(value)}`)
        .expect(400);
      expect(response.body.error.code).toBe('INVALID_DUE_SOON_DAYS');
    },
  );

  it.each(['2026-02-30', '2026-10-27T00:00:00Z', '27-10-2026', '2026-1-1', ''])(
    'rejects referenceDate=%j',
    async (value) => {
      const response = await request(app)
        .get(`/api/alerts?referenceDate=${encodeURIComponent(value)}`)
        .expect(400);
      expect(response.body.error.code).toBe('INVALID_REFERENCE_DATE');
    },
  );

  it('rejects repeated query parameters instead of guessing', async () => {
    const repeatedReference = await request(app)
      .get('/api/alerts?referenceDate=2026-10-27&referenceDate=2026-10-28')
      .expect(400);
    expect(repeatedReference.body.error.code).toBe('INVALID_REFERENCE_DATE');

    const repeatedThreshold = await request(app)
      .get('/api/alerts?dueSoonDays=3&dueSoonDays=4')
      .expect(400);
    expect(repeatedThreshold.body.error.code).toBe('INVALID_DUE_SOON_DAYS');
  });

  it('sets no-store, hides x-powered-by and does not leak stack traces', async () => {
    const health = await request(app).get('/api/health').expect(200);
    expect(health.headers['cache-control']).toBe('no-store');
    expect(health.headers['x-powered-by']).toBeUndefined();

    const missing = await request(app).get('/api/unknown').expect(404);
    const serialised = JSON.stringify(missing.body);
    expect(serialised).not.toContain('stack');
    expect(serialised).not.toContain('/Users/');
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('allows configured CORS origins and rejects unknown origins', async () => {
    const allowed = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const preflight = await request(app)
      .options('/api/alerts')
      .set('Origin', 'http://localhost:4173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:4173');

    const disallowed = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example')
      .expect(200);
    expect(disallowed.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reports an unknown application type through diagnostics', async () => {
    const application: Application = {
      id: 'APP-UNKNOWN-TYPE',
      collegeName: 'Unknown Type Institute',
      type: 'Brand New Type',
      status: 'Pending',
      assignedOfficer: null,
      dueDate: null,
      requiredDocuments: [],
      submittedDocuments: [],
    };
    const customApp = createApp(createApplicationStore([application]));
    const response = await request(customApp)
      .get(`/api/alerts?referenceDate=${REFERENCE_DATE}`)
      .expect(200);

    expect(response.body.alerts).toHaveLength(0);
    expect(response.body.diagnostics).toEqual([
      expect.objectContaining({
        applicationId: 'APP-UNKNOWN-TYPE',
        code: 'unknown_application_type',
      }),
    ]);
  });
});
