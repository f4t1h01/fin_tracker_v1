export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  const fallbackMessage = `Request failed with status ${response.status}`;
  let errorMessage = fallbackMessage;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      errorMessage = payload.message.join(", ");
    } else if (payload.message) {
      errorMessage = payload.message;
    }
  } catch {}

  throw new Error(errorMessage);
}
