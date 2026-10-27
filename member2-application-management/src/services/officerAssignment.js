import { SAMPLE_OFFICERS } from "../constants";

/**
 * SIMULATED officer assignment (placeholder for Member 3).
 * Picks the officer with the fewest current applications.
 *
 * Member 3: replace the body of this function with the real logic,
 * keeping the signature: (application, allApplications) => officer name (string).
 * It is called once, inside createApplication() in applicationService.js.
 */
export function assignOfficerToApplication(application, allApplications = []) {
  const load = (name) => allApplications.filter((a) => a.assignedOfficer === name).length;
  return [...SAMPLE_OFFICERS].sort((a, b) => load(a) - load(b))[0];
}
