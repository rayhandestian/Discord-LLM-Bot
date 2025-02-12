const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription(`Configure ${process.env.BOT_NAME} bot settings`)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription(`Set the channel for ${process.env.BOT_NAME} to respond in`)
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to use')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('model')
                .setDescription('Set the AI model to use')
                .addStringOption(option =>
                    option
                        .setName('model')
                        .setDescription('The model identifier (e.g. mistralai/mistral-small-24b-instruct-2501:free)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('system_prompt')
                .setDescription('Set the system prompt')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('The system prompt to use')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temperature')
                .setDescription('Set the temperature (0.0 to 1.0)')
                .addNumberOption(option =>
                    option
                        .setName('value')
                        .setDescription('Temperature value')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('max_history')
                .setDescription('Set how many recent messages to remember in the conversation')
                .addIntegerOption(option =>
                    option
                        .setName('count')
                        .setDescription('Number of most recent messages to keep in conversation history (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear_history')
                .setDescription('Clear conversation history for the current channel')),

    async execute(interaction) {
        const { client } = interaction;
        const guildId = interaction.guildId;
        
        // Get or create server config
        let config = client.serverConfigs.get(guildId) || {
            channelId: null,
            model: process.env.DEFAULT_MODEL || 'mistral-7b-instruct',
            systemPrompt: process.env.DEFAULT_SYSTEM_PROMPT?.replace('${BOT_NAME}', process.env.BOT_NAME) || `You are ${process.env.BOT_NAME}, a helpful and friendly AI assistant.`,
            temperature: 0.7,
            maxHistory: 10
        };

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'channel':
                const channel = interaction.options.getChannel('channel');
                config.channelId = channel.id;
                await interaction.reply(`${process.env.BOT_NAME} will now respond in ${channel}`);
                break;

            case 'model':
                const model = interaction.options.getString('model');
                config.model = model;
                await interaction.reply(`Model set to ${model}`);
                break;

            case 'system_prompt':
                const prompt = interaction.options.getString('prompt');
                config.systemPrompt = prompt;
                await interaction.reply('System prompt updated successfully');
                break;

            case 'temperature':
                const temperature = interaction.options.getNumber('value');
                config.temperature = temperature;
                await interaction.reply(`Temperature set to ${temperature}`);
                break;

            case 'max_history':
                const count = interaction.options.getInteger('count');
                config.maxHistory = count;
                await interaction.reply(`Message history length set to ${count} messages. ${process.env.BOT_NAME} will remember the ${count} most recent messages in the conversation.`);
                break;

            case 'clear_history':
                client.conversations.delete(interaction.channelId);
                await interaction.reply('Conversation history has been cleared for this channel');
                break;
        }

        // Save the updated config
        client.serverConfigs.set(guildId, config);
    },
}; 