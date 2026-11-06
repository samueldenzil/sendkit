import process from "node:process";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import {
  getErrorMessage,
  sendTelegramMessage,
  telegramMessageInputSchema,
} from "sendkit-core";

const server = new McpServer({
  name: "sendkit-mcp",
  version: "0.0.0",
});

function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is required. Configure it in your MCP client environment.",
    );
  }

  return token;
}

server.registerTool(
  "send_telegram_message",
  {
    title: "Telegram",
    description: "Send a Telegram message to a specified chat.",
    inputSchema: telegramMessageInputSchema,
  },
  async (input) => {
    try {
      const result = await sendTelegramMessage({
        ...input,
        botToken: getTelegramBotToken(),
      });

      return {
        content: [
          {
            type: "text",
            text: `Sent Telegram message ${result.messageId} to chat ${result.chatId}`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: getErrorMessage(error),
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
