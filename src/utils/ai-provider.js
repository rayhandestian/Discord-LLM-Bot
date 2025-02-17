const { getCompletion: getOpenRouterCompletion } = require('./openrouter');
const { getCompletion: getGroqCompletion } = require('./groq');

async function getCompletion(messageHistory, systemPrompt, model, temperature, channelId, provider = 'openrouter') {
    switch (provider.toLowerCase()) {
        case 'groq':
            return await getGroqCompletion(messageHistory, systemPrompt, model, temperature, channelId);
        case 'openrouter':
            return await getOpenRouterCompletion(messageHistory, systemPrompt, model, temperature, channelId);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

module.exports = {
    getCompletion
}; 