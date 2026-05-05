export class ApiResponseError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.payload = payload;
  }
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  const fallbackMessage = `Request failed with status ${response.status}`;
  let errorMessage = fallbackMessage;
  let payload: unknown = null;

  try {
    payload = await response.json();
    const parsedPayload = payload as { message?: string | string[] };
    if (Array.isArray(parsedPayload.message)) {
      errorMessage = parsedPayload.message.join(", ");
    } else if (parsedPayload.message) {
      errorMessage = parsedPayload.message;
    }
  } catch {}

  throw new ApiResponseError(errorMessage, response.status, payload);
}
