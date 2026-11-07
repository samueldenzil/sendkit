const TELEGRAM_BOT_TOKEN_PATTERN = /(?:\b|(?<=bot))\d{6,}:[A-Za-z0-9_-]{20,}\b/g;

/**
 * Redacts occurrences of secret tokens from text.
 * Automatically redacts any Telegram bot token pattern (e.g. in URLs or logs),
 * as well as any explicitly provided token.
 */
export function redactToken(content: string, token?: string): string {
  let result = content;
  if (token) {
    const trimmed = token.trim();
    if (trimmed) {
      result = result.replaceAll(trimmed, "[REDACTED]");
    }
  }
  return result.replace(TELEGRAM_BOT_TOKEN_PATTERN, "[REDACTED]");
}

/**
 * Extracts a clean, human-readable error message from an unknown error.
 * Supports ZodError issues, nested error causes, and automatic token redaction.
 * Prevents redundant error repetition when a parent error already includes its cause.
 */
export function getErrorMessage(error: unknown, tokenToRedact?: string): string {
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
    const causeMsg =
      error.cause instanceof Error ? error.cause.message : error.cause ? String(error.cause) : null;

    if (causeMsg && !error.message.includes(causeMsg)) {
      message = `${error.message} (${causeMsg})`;
    } else {
      message = error.message;
    }
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = String(error);
  }

  return redactToken(message, tokenToRedact);
}
