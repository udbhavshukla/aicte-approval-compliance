import type {
  AlertsResponse,
  ApiErrorBody,
  ApplicationsResponse,
} from '../types/compliance';

/** Central API client. Override with VITE_API_BASE_URL at build/dev time. */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'
).replace(/\/+$/, '');

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { error?: unknown };
  if (typeof candidate.error !== 'object' || candidate.error === null) return false;
  const error = candidate.error as { code?: unknown; message?: unknown };
  return typeof error.code === 'string' && typeof error.message === 'string';
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiRequestError(
      `Could not reach the compliance API at ${API_BASE_URL}. Ensure the backend is running.`,
      0,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiRequestError(`The API returned HTTP ${response.status}.`, response.status);
    }
    throw new ApiRequestError('The API returned an unreadable response.', response.status);
  }

  if (!response.ok) {
    const message = isApiErrorBody(body)
      ? body.error.message
      : `The API returned HTTP ${response.status}.`;
    throw new ApiRequestError(message, response.status);
  }

  return body as T;
}

export function fetchAlerts(signal?: AbortSignal): Promise<AlertsResponse> {
  return getJson<AlertsResponse>('/alerts', signal);
}

export function fetchApplications(signal?: AbortSignal): Promise<ApplicationsResponse> {
  return getJson<ApplicationsResponse>('/applications', signal);
}
