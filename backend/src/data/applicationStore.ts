import type { Application } from '../domain/application.types';
import { createSampleApplications } from './sampleApplications';

export interface ApplicationStore {
  /** Returns defensive copies so callers cannot mutate shared records. */
  list(): Application[];
  findById(id: string): Application | undefined;
}

function cloneApplication(application: Application): Application {
  return {
    ...application,
    requiredDocuments: [...application.requiredDocuments],
    submittedDocuments: [...application.submittedDocuments],
  };
}

/**
 * Temporary in-memory data layer.
 *
 * Member 5 should replace this with the shared backend repository. The
 * compliance engine only needs `list()` and `findById()`, so the interface can
 * stay stable during integration.
 */
export function createApplicationStore(
  seedApplications: Application[] = createSampleApplications(),
): ApplicationStore {
  const applications = seedApplications.map(cloneApplication);

  return {
    list() {
      return applications.map(cloneApplication);
    },
    findById(id: string) {
      const match = applications.find((application) => application.id === id);
      return match ? cloneApplication(match) : undefined;
    },
  };
}

/** Process-wide store for the standalone prototype. Resets on restart. */
export const applicationStore = createApplicationStore();
