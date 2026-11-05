import { Command } from "commander";
import process from "node:process";

import { getErrorMessage, redactToken } from "./utils";

const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;

type TelegramResponse = {
  ok: boolean;
  result?: {
    message_id?: number;
  };
  description?: string;
};

const program = new Command();

program.name("sendkit").description("SendKit tutorial CLI");

program
  .command("telegram")
  .description("Send a Telegram message")
  .argument("<chatId>", "Telegram chat ID")
  .argument("<message>", "Message text to send")
  .action(async (chatId: string, message: string) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
      process.exitCode = 1;
      return;
    }

    if (!chatId.trim()) {
      console.error("Telegram chat ID cannot be empty.");
      process.exitCode = 1;
      return;
    }

    if (!message.trim()) {
      console.error("Telegram message cannot be empty.");
      process.exitCode = 1;
      return;
    }

    if (message.length > MAX_TELEGRAM_MESSAGE_LENGTH) {
      console.error(
        `Message exceeds Telegram limit of ${MAX_TELEGRAM_MESSAGE_LENGTH} characters (${message.length} provided).`,
      );
      process.exitCode = 1;
      return;
    }

    let response: Response;

    try {
      response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
          }),
        },
      );
    } catch (err) {
      console.error(
        "Network error: Failed to connect to Telegram API.",
        getErrorMessage(err, token),
      );
      process.exitCode = 1;
      return;
    }

    let data: TelegramResponse;
    try {
      data = (await response.json()) as TelegramResponse;
    } catch {
      console.error(
        `Telegram API error: Received unexpected response (HTTP ${response.status} ${response.statusText}).`,
      );
      process.exitCode = 1;
      return;
    }

    if (!response.ok || !data.ok) {
      const detail = data.description ?? response.statusText;
      console.error(
        `Telegram API request failed: ${redactToken(detail, token)}`,
      );
      process.exitCode = 1;
      return;
    }

    const messageId = data.result?.message_id;

    console.log(`Sent Telegram message to chat ${chatId}.`);

    if (messageId !== undefined) {
      console.log(`Telegram message ID: ${messageId}`);
    }
  });

await program.parseAsync(process.argv);
