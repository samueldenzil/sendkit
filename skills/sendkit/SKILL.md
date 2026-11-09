---
name: sendkit
description: Use SendKit to send Telegram messages from agents through the SendKit MCP tool, with the CLI as a fallback. Trigger this skill whenever the user asks to send a Telegram message, use SendKit, interact with the SendKit toolset, manually verify SendKit, or choose between SendKit MCP and CLI workflows. Also use when troubleshooting SendKit credentials or message delivery failures.
---

# SendKit Skill

SendKit is a messaging toolkit designed to enable AI agents and developers to send messages across communication platforms, beginning with Telegram.

This skill guides agents and users on sending Telegram messages, selecting the appropriate integration layer (MCP vs. CLI), performing manual verification, and troubleshooting delivery issues.

---

## Workflow Selection: Choosing Between MCP and CLI

Always select the integration path according to the operational context:

| Context / Requirement                 | Recommended Workflow     | Rationale                                                                                            |
| :------------------------------------ | :----------------------- | :--------------------------------------------------------------------------------------------------- |
| **Agent tool invocation** (default)   | **SendKit MCP Tool**     | Direct function call in agent loop, native structured JSON response, zero shell escaping overhead.   |
| **MCP server unavailable or failing** | **SendKit CLI**          | Independent fallback path running directly in the shell without relying on the MCP daemon transport. |
| **Interactive developer terminal**    | **SendKit CLI**          | Quick manual testing, command-line scripting, and piped shell commands.                              |
| **Credential initialization**         | **SendKit CLI (`init`)** | Writes secure local credentials (`~/.config/sendkit/config.json`) with strict file permissions.      |

---

## Primary Workflow: Send Messages via SendKit MCP

The SendKit MCP tool provides a structured interface for agents to dispatch Telegram messages without manual subprocess handling.

### Tool Specification

- **Tool Name**: `send_telegram_message` (or namespaced as `sendkit_sendkit:send_telegram_message` depending on client)
- **Input Parameters**:
  - `chatId` (`string`, required): Numeric user ID (e.g., `"123456789"`), supergroup/group ID (e.g., `"-1001234567890"`), or public channel username (e.g., `"@mychannel"`).
  - `message` (`string`, required): Message body text (up to 4,096 characters).

### Prerequisites

The SendKit MCP server requires the `TELEGRAM_BOT_TOKEN` environment variable in the MCP configuration:

```json
{
  "mcpServers": {
    "sendkit": {
      "command": "npx",
      "args": ["-y", "@samueldenzil-org/sendkit-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "<bot_token_from_BotFather>"
      }
    }
  }
}
```

### Execution Example

When calling the MCP tool:

```json
{
  "chatId": "123456789",
  "message": "Hello from SendKit!"
}
```

### Expected Response

A successful dispatch returns structured content:

```json
{
  "ok": true,
  "chatId": "123456789",
  "messageId": 1042
}
```

---

## Fallback Workflow: Send Messages via SendKit CLI

When the MCP server is not configured, unresponsive, or running in an environment without MCP tool support, fall back to the SendKit CLI.

### 1. Initialize Credentials

Configure the local bot token (saved to `~/.config/sendkit/config.json` with `0o600` permissions):

**Globally or via npx:**

```bash
sendkit init --telegram-bot-token "<bot_token>"
# or
npx @samueldenzil-org/sendkit init --telegram-bot-token "<bot_token>"
```

**Inside SendKit repository development:**

```bash
bun run dev:cli init --telegram-bot-token "<bot_token>"
```

### 2. Send Telegram Message

**Globally or via npx:**

```bash
sendkit telegram "<chatId>" "<message>"
# or
npx @samueldenzil-org/sendkit telegram "<chatId>" "<message>"
```

**Inside SendKit repository development:**

```bash
bun run dev:cli telegram "<chatId>" "<message>"
```

**Example:**

```bash
bun run dev:cli telegram "123456789" "System deployment completed successfully."
```

Output:

```json
{ "ok": true, "chatId": "123456789", "messageId": 1043 }
```

---

## Manual Verification Guide

Follow these steps when manually verifying SendKit functionality:

1. **Verify Bot Token Existence**:
   - For MCP: Ensure `TELEGRAM_BOT_TOKEN` is present in the MCP server's environment configuration.
   - For CLI: Check that `~/.config/sendkit/config.json` exists and contains a valid `telegramBotToken`, or run `sendkit init`.

2. **Verify Target Chat Accessibility**:
   - **Private Chat**: The target recipient must have opened the bot and clicked `/start`. Telegram bots cannot initiate unsolicited contact.
   - **Groups / Supergroups**: The bot must be added as a member. If the group has restricted posting, the bot must be an administrator with "Post Messages" permission.
   - **Channels**: The bot must be added as an administrator with "Post Messages" permission.

3. **Dispatch a Smoke Test Message via MCP**:
   - Invoke `send_telegram_message` with a simple verification string (e.g., `"SendKit verification test: $(Get-Date)"`).
   - Confirm that the returned object contains `ok: true` and a valid numeric `messageId`.

4. **Verify Fallback via CLI**:
   - Execute `sendkit telegram <chatId> "SendKit CLI fallback verification"` (or `bun run dev:cli telegram ...`).
   - Confirm receipt on the target Telegram client and note the returned JSON payload.

---

## Error Handling & Troubleshooting

| Error Message / Symptom                                            | Root Cause                                                                 | Resolution                                                                                                         |
| :----------------------------------------------------------------- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN environment variable is required`              | MCP server was started without `TELEGRAM_BOT_TOKEN`.                       | Add `TELEGRAM_BOT_TOKEN` to MCP server definition in `.mcp.json` or client settings, then restart the MCP client.  |
| `No Telegram Bot token configured. Run sendkit init...`            | CLI config file missing or empty.                                          | Run `sendkit init --telegram-bot-token <token>`.                                                                   |
| `Telegram API error: [400] Bad Request: chat not found`            | The `chatId` does not exist, is mistyped, or user has not started the bot. | Ensure recipient clicked `/start` with the bot, or verify the channel username/group ID.                           |
| `Telegram API error: [403] Forbidden: bot was blocked by the user` | The recipient blocked the bot or removed it from the group.                | Ask the recipient to unblock the bot or re-add it to the target group/channel.                                     |
| `Message exceeds Telegram's limit of 4096 characters`              | The payload text is longer than 4,096 characters.                          | Truncate, split into multiple messages, or send a summary.                                                         |
| Token values in errors show `[REDACTED]`                           | Expected behavior.                                                         | SendKit automatically redacts secret tokens from logs and error messages to prevent accidental credential leakage. |
