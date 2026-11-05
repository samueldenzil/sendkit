import { getErrorMessage, redactToken } from "./errors";
import {
  telegramMessageOptionsSchema,
  telegramMessageRequestSchema,
  telegramSendMessageResponseSchema,
  type TelegramMessageOptions,
  type TelegramMessageOutput,
} from "./schemas";

export async function sendTelegramMessage(
  input: TelegramMessageOptions,
): Promise<TelegramMessageOutput> {
  const parsedInput = telegramMessageOptionsSchema.parse(input);
  const requestBody = telegramMessageRequestSchema.parse({
    chat_id: parsedInput.chatId,
    text: parsedInput.message,
  });

  let response: Response;
  try {
    response = await fetch(
      `https://api.telegram.org/bot${parsedInput.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );
  } catch (error) {
    throw new Error(
      `Network failure: ${getErrorMessage(error, parsedInput.botToken)}`,
    );
  }

  let rawData: unknown;
  try {
    rawData = await response.json();
  } catch {
    throw new Error(
      `Telegram server error (HTTP ${response.status} ${response.statusText}).`,
    );
  }

  const data = telegramSendMessageResponseSchema.parse(rawData);

  if (!response.ok || !data.ok || !data.result) {
    const detail = data.description ?? "Telegram message request failed";
    throw new Error(redactToken(detail, parsedInput.botToken));
  }

  return {
    ok: true,
    chatId: parsedInput.chatId,
    messageId: data.result.message_id,
  };
}
