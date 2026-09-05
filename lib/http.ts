export class RequestError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

// Failed writes are never retried automatically: the server may already have saved them.
export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: options.signal ?? controller.signal });
    const data = await response.json().catch(() => null);
    if (response.status === 401) throw new RequestError("Your session has expired. Sign in again, then retry.", 401);
    if (!response.ok) {
      const message = typeof data?.error === "string" ? data.error : "The request failed. Please try again.";
      const detail = typeof data?.detail === "string" ? " " + data.detail.slice(0, 300) : "";
      const serviceStatus = typeof data?.status === "number" ? " (service status " + data.status + ")" : "";
      throw new RequestError(message + serviceStatus + detail, response.status);
    }
    if (data === null) throw new RequestError("The server returned an unexpected response. Please try again.");
    return data as T;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (error instanceof Error && error.name === "AbortError")
      throw new RequestError("The request timed out. Check whether your change saved before retrying.");
    throw new RequestError("Unable to reach the server. Check your connection and try again.");
  } finally { clearTimeout(timer); }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
