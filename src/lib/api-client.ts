export class ApiClientError extends Error {
  status: number;
  code?: string;
  fields?: { path: string; message: string }[];

  constructor(
    status: number,
    message: string,
    code?: string,
    fields?: { path: string; message: string }[],
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

interface ErrorBody {
  error?: {
    message?: string;
    code?: string;
    fields?: { path: string; message: string }[];
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const errBody = (body ?? {}) as ErrorBody;
    throw new ApiClientError(
      res.status,
      errBody.error?.message ?? "Something went wrong. Please try again.",
      errBody.error?.code,
      errBody.error?.fields,
    );
  }

  return body as T;
}

/**
 * Prefers the specific field-level message(s) a 400 validation error
 * carries (e.g. "Please enter a valid http:// or https:// URL.") over the
 * generic top-level one — the generic message is the right one for the
 * catch-all 500 case, but useless on its own for "which field, and why."
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.fields && err.fields.length > 0) {
      return err.fields.map((f) => f.message).join(" ");
    }
    return err.message;
  }
  return fallback;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
