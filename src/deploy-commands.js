require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Validation
if (!process.env.DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN in environment variables');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('Missing CLIENT_ID in environment variables');
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

console.log('Loading commands from:', commandsPath);

// Ensure the commands directory exists
if (!fs.existsSync(commandsPath)) {
    console.error('Commands directory not found:', commandsPath);
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('Found command files:', commandFiles);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            console.log(`Loading command: ${command.data.name}`);
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
        }
    } catch (error) {
        console.error(`[ERROR] Error loading command from ${filePath}:`, error);
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Log the commands being deployed
        console.log('Deploying commands:', commands.map(cmd => cmd.name));

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        console.log('Deployed commands:', data.map(cmd => cmd.name));
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
})(); 