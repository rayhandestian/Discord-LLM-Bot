const { getCompletion: getOpenRouterCompletion, getModelCapabilities: getOpenRouterCapabilities } = require('./openrouter');
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

async function getModelCapabilities(model, provider = 'openrouter') {
    switch (provider.toLowerCase()) {
        case 'openrouter':
            // Provide default implementation just in case openrouter.js doesn't export it
            if (typeof getOpenRouterCapabilities === 'function') {
                return await getOpenRouterCapabilities(model);
            }
            return ['text'];
        case 'groq':
            // Groq models generally only support text for now
            return ['text'];
        default:
            return ['text'];
    }
}

module.exports = {
    getCompletion,
    getModelCapabilities
}; 