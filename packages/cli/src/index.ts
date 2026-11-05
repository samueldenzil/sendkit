import { Command } from "commander";
import process from "node:process";
import { getErrorMessage, sendTelegramMessage } from "sendkit-core";

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

    try {
      const result = await sendTelegramMessage({
        botToken: token,
        chatId,
        message,
      });

      console.log(`Sent Telegram message to chat ${result.chatId}`);
      console.log(`Telegram message ID: ${result.messageId}`);
    } catch (error) {
      console.error(
        `Telegram API request failed: ${getErrorMessage(error)}`,
      );
      process.exitCode = 1;
      return;
    }
  });

await program.parseAsync(process.argv);
