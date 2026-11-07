import { z } from "zod";
import { MAX_TELEGRAM_MESSAGE_LENGTH } from "./constants";

export const telegramMessageInputSchema = z.object({
  chatId: z
    .string()
    .trim()
    .min(1, "Telegram chat ID cannot be empty. Please provide a numeric ID or @channelusername.")
    .describe(
      "Destination Telegram chat ID (numeric user ID, group ID, or public @channelusername)",
    ),
  message: z
    .string()
    .trim()
    .min(1, "Telegram message text cannot be empty. Please provide content to send.")
    .max(
      MAX_TELEGRAM_MESSAGE_LENGTH,
      `Message exceeds Telegram's limit of ${MAX_TELEGRAM_MESSAGE_LENGTH} characters. Please shorten your message.`,
    )
    .describe("Message text to deliver (supports up to 4,096 characters)"),
});

export const telegramMessageOptionsSchema = telegramMessageInputSchema.extend({
  botToken: z
    .string()
    .trim()
    .min(1, "Telegram Bot token is required. Please provide a valid token obtained from @BotFather."),
});

export const telegramMessageRequestSchema = z.object({
  chat_id: z.string().min(1),
  text: z.string().min(1),
});

export const telegramSendMessageResponseSchema = z.object({
  ok: z.boolean(),
  result: z.object({ message_id: z.number() }).optional(),
  description: z.string().optional(),
});

export const telegramMessageOutputSchema = z.object({
  ok: z.literal(true),
  chatId: z.string(),
  messageId: z.number(),
});

export type TelegramMessageInput = z.infer<typeof telegramMessageInputSchema>;
export type TelegramMessageOptions = z.infer<
  typeof telegramMessageOptionsSchema
>;
export type TelegramMessageOutput = z.infer<typeof telegramMessageOutputSchema>;
