/**
 * Redacts occurrences of a secret token from text.
 */
export function redactToken(content: string, token?: string): string {
  if (!token) return content;
  return content.replaceAll(token, "[REDACTED]");
}

/**
 * Extracts a descriptive, human-readable error message from an unknown error,
 * including nested error causes, and redacts the provided secret token if present.
 */
export function getErrorMessage(
  error: unknown,
  tokenToRedact?: string,
): string {
  let message: string;

  if (error instanceof Error) {
    if (error.cause instanceof Error) {
      message = `${error.message} (${error.cause.message})`;
    } else if (error.cause) {
      message = `${error.message} (${String(error.cause)})`;
    } else {
      message = error.message;
    }
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = String(error);
  }

  return tokenToRedact ? redactToken(message, tokenToRedact) : message;
}
