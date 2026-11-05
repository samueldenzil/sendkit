/**
 * Redacts occurrences of a secret token from text.
 */
export function redactToken(content: string, token?: string): string {
  if (!token) return content;
  return content.replaceAll(token, "[REDACTED]");
}

/**
 * Extracts a clean, human-readable error message from an unknown error.
 * Supports ZodError issues, nested error causes, and optional token redaction.
 */
export function getErrorMessage(
  error: unknown,
  tokenToRedact?: string,
): string {
  let message: string;

  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues: Array<{ message: string }> }).issues)
  ) {
    message = (error as { issues: Array<{ message: string }> }).issues
      .map((issue) => issue.message)
      .join("; ");
  } else if (error instanceof Error) {
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

