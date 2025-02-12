const OpenAI = require('openai');

// Rate limiting setup
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50; // Adjust this based on your OpenRouter plan

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'Discord Bot',
    },
});

// Check rate limit for a channel
function checkRateLimit(channelId) {
    const now = Date.now();
    const channelRequests = rateLimits.get(channelId) || [];
    
    // Remove old requests outside the window
    const validRequests = channelRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    rateLimits.set(channelId, validRequests);

    if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        const oldestRequest = validRequests[0];
        const timeToWait = RATE_LIMIT_WINDOW - (now - oldestRequest);
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(timeToWait / 1000)} seconds.`);
    }

    // Add new request timestamp
    validRequests.push(now);
    rateLimits.set(channelId, validRequests);
}

async function getCompletion(messageHistory, systemPrompt, model, temperature = 0.7, channelId) {
    try {
        // Check rate limit before making the request
        checkRateLimit(channelId);

        const messages = [
            {
                role: 'system',
                content: systemPrompt
            },
            ...messageHistory // Spread the conversation history
        ];

        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: 1000,
        });

        if (!response?.choices?.[0]?.message?.content) {
            throw new Error('Invalid response from OpenRouter');
        }

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenRouter API Error:', error);
        
        // Handle specific error types
        if (error.message.includes('Rate limit')) {
            throw new Error(error.message);
        } else if (error.status === 429) {
            throw new Error('OpenRouter rate limit reached. Please try again later.');
        } else if (error.status === 401 || error.status === 403) {
            throw new Error('Authentication error with OpenRouter. Please check your API key.');
        } else if (error.message.includes('Invalid response')) {
            throw new Error('Received an invalid response from the AI model. Please try again.');
        }
        
        throw new Error('Failed to get completion from OpenRouter. Please try again in a moment.');
    }
}

module.exports = { getCompletion }; 