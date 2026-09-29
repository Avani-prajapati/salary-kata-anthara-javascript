export class ApiError extends Error {
  constructor(message, { status, code, fields }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function toQueryString(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function toApiError(response) {
  const body = await response.json().catch(() => ({}));
  return new ApiError(body.message ?? response.statusText, {
    status: response.status,
    code: body.code,
    fields: body.fields,
  });
}

export async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

export function requestWithQuery(path, params) {
  return request(`${path}${toQueryString(params)}`);
}
