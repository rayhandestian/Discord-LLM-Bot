require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadConfigs, saveConfigs } = require('./utils/storage');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Store commands and server configurations
client.commands = new Collection();
client.serverConfigs = new Collection();

// Default configuration for servers
const defaultConfig = {
    channelId: null,
    model: process.env.DEFAULT_MODEL || 'mistral-7b-instruct',
    systemPrompt: process.env.DEFAULT_SYSTEM_PROMPT?.replace('${BOT_NAME}', process.env.BOT_NAME) || `You are ${process.env.BOT_NAME}, a helpful and friendly AI assistant.`,
    temperature: 0.7,
    maxHistory: 10 // Maximum number of messages to fetch from channel history
};

// Load saved configurations
const savedConfigs = loadConfigs();
for (const [guildId, config] of Object.entries(savedConfigs)) {
    client.serverConfigs.set(guildId, { ...defaultConfig, ...config });
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

// Event handler for when the bot is ready
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
        
        // Save configurations after any command execution
        const configs = {};
        for (const [guildId, config] of client.serverConfigs) {
            configs[guildId] = config;
        }
        saveConfigs(configs);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'There was an error executing this command!',
            ephemeral: true
        });
    }
});

// Handle messages for LLM responses
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    const serverConfig = client.serverConfigs.get(message.guildId) || defaultConfig;
    
    // Check if the message is in the configured channel
    if (serverConfig.channelId && message.channelId !== serverConfig.channelId) return;

    // If no channel is configured, ignore messages
    if (!serverConfig.channelId) return;

    // Check if the bot should respond
    const isBotMentioned = message.mentions.users.has(client.user.id);
    const isReplyToBot = message.reference?.messageId && 
        (await message.channel.messages.fetch(message.reference.messageId))?.author.id === client.user.id;

    if (!isBotMentioned && !isReplyToBot) return;

    try {
        // Show typing indicator
        await message.channel.sendTyping();

        // Fetch recent messages for context
        const messages = await message.channel.messages.fetch({ 
            limit: serverConfig.maxHistory,
            before: message.id
        });

        // Build conversation history from channel messages
        const history = [];
        
        // Add previous messages to history
        messages.reverse().forEach(msg => {
            if (msg.author.bot && msg.author.id !== client.user.id) return; // Skip other bots' messages
            
            const member = msg.member;
            const displayName = member?.displayName || msg.author.username;
            
            // Check if message was a direct interaction with the bot
            const isDirectInteraction = 
                msg.mentions.users.has(client.user.id) || // was a mention
                (msg.reference?.messageId && messages.get(msg.reference.messageId)?.author.id === client.user.id); // was reply to bot

            // Format the message based on the sender
            let formattedContent;
            if (msg.author.id === client.user.id) {
                // For bot's own messages, don't include name prefix
                formattedContent = msg.content;
            } else {
                // For user messages, include the name prefix
                formattedContent = isDirectInteraction
                    ? `${displayName}: ${msg.content}`
                    : `[Channel context] ${displayName}: ${msg.content}`;
            }

            history.push({
                role: msg.author.id === client.user.id ? 'assistant' : 'user',
                content: formattedContent
            });
        });

        // Add the current message
        const member = message.member;
        const displayName = member?.displayName || message.author.username;
        let cleanContent = message.content;
        if (isBotMentioned) {
            // Remove the bot mention and any extra whitespace
            cleanContent = cleanContent.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
        }

        history.push({
            role: 'user',
            content: `${displayName}: ${cleanContent}`
        });

        // Enhance system prompt with current user info and channel context
        const enhancedSystemPrompt = `${serverConfig.systemPrompt}
You are in a Discord channel where you can see messages from multiple users.
When you see messages in the conversation history:
- Messages from users will be prefixed with their name (e.g. "Username: message content")
- Messages marked with [Channel context] are conversations you observed but weren't directly involved in
- Your own previous responses are shown without any prefix
The current message is from ${displayName} who has ${isReplyToBot ? "replied to your previous message" : "mentioned you"}.

IMPORTANT RESPONSE FORMATTING:
1. DO NOT use any name prefixes in your response (not the user's name, not your name, nothing)
2. DO NOT include [Channel context] or any other formatting
3. Simply provide your response as a direct message
4. Respond naturally as if in a direct conversation

Example of how to respond:
❌ "Sparky: Hello, how are you?"
❌ "Sen: Hello, how are you?"
❌ "[Channel context] Hello, how are you?"
✅ "Hello, how are you?"`;

        // Get response from the configured provider
        const { getCompletion } = require('./utils/ai-provider');
        const response = await getCompletion(
            history,
            enhancedSystemPrompt,
            serverConfig.model,
            serverConfig.temperature,
            message.channelId,
            serverConfig.provider
        );

        // Clean the response by removing any potential name prefix or [Channel context]
        let cleanedResponse = response.trim();
        // Remove "[Channel context] " prefix if present
        cleanedResponse = cleanedResponse.replace(/^\[Channel context\]\s*/i, '');
        // Remove "BotName: " prefix if present
        const botNamePattern = new RegExp(`^${process.env.BOT_NAME}:\\s*`, 'i');
        cleanedResponse = cleanedResponse.replace(botNamePattern, '');

        // Simply reply to the message
        await message.reply(cleanedResponse);

    } catch (error) {
        console.error('Error processing message:', error);
        
        // Send a more specific error message
        let errorMessage = 'Sorry, I encountered an error while processing your message.';
        if (error.message.includes('Rate limit')) {
            errorMessage = `⌛ ${error.message}`;
        } else if (error.message.includes('authentication')) {
            errorMessage = '🔑 Bot configuration error. Please contact the server administrator.';
        } else if (error.message.includes('Invalid response')) {
            errorMessage = '⚠️ The AI model returned an invalid response. Please try again.';
        }
        
        await message.reply(errorMessage);
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN); 