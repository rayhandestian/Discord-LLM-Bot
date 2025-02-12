# Discord LLM Bot

A Discord bot that uses OpenRouter to provide LLM capabilities in your server. The bot can engage in conversations and respond to messages using various AI models.

## Features

- Configurable AI model selection (Mistral, Claude, GPT-4o, etc.)
- Customizable system prompt
- Channel-specific responses
- Adjustable temperature settings
- Admin-only configuration commands
- Persistent storage for server settings

## Prerequisites

- Node.js 16.9.0 or higher
- Discord Bot Token
- OpenRouter API Key
- Discord Application with proper intents enabled

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `CLIENT_ID`: Your Discord application client ID
   - `OPENROUTER_API_KEY`: Your OpenRouter API key

4. Deploy slash commands:
   ```bash
   node src/deploy-commands.js
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Dependencies

- discord.js: ^14.14.1
- dotenv: ^16.4.5
- @discordjs/rest: ^2.2.0
- @discordjs/builders: ^1.7.0
- openai: ^4.28.0

## Commands

### Configuration Commands (`/config`)

All configuration commands require administrator permissions. Available subcommands:

- `/config channel <channel>`: Set the channel where the bot will respond
  - Required: Select a text channel where the bot should be active

- `/config model <model>`: Set the AI model to use
  - Required: Enter the full model identifier (e.g. mistralai/mistral-small-24b-instruct-2501:free)
  - Any model available through OpenRouter can be used
  - Default: mistral-7b-instruct

- `/config system_prompt <prompt>`: Set the system prompt for the AI
  - Required: Enter the prompt text that defines the bot's behavior
  - Default: "You are ${BOT_NAME}, a helpful and friendly AI assistant."

- `/config temperature <value>`: Adjust the temperature (randomness) of responses
  - Required: Enter a value between 0.0 and 1.0
  - Default: 0.7
  - Lower values make responses more focused and deterministic
  - Higher values make responses more creative and varied

- `/config max_history <count>`: Set the conversation memory length
  - Required: Enter a number between 1 and 100
  - Default: 10
  - Controls how many recent messages the bot remembers in conversations

- `/config clear_history`: Clear the conversation history for the current channel
  - Useful for starting fresh or if the bot seems stuck on a previous context

## Usage

1. Use `/config channel` to set up the channel where the bot should respond
2. (Optional) Configure the model, system prompt, and other settings using the config commands
3. Start chatting in the configured channel!

## Models Available

Any model available through OpenRouter can be used by providing its full identifier. Some examples include:
- mistralai/mistral-small-24b-instruct-2501:free
- anthropic/claude-3-opus
- google/gemini-pro
- openai/gpt-4o

Visit [OpenRouter's model list](https://openrouter.ai/models) for a complete list of available models and their identifiers.

## Notes

- The bot will only respond in the configured channel
- System prompt and model settings are per-server
- Temperature affects how random/creative the responses are (0.0 to 1.0)
- Settings are persistent across bot restarts
- The bot requires proper Discord permissions to function (Send Messages, View Channels, etc.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.