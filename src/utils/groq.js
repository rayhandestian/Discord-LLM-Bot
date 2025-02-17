const OpenAI = require('openai');

// Rate limiting setup
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50;

const groq = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
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

    // Add current request
    validRequests.push(now);
    rateLimits.set(channelId, validRequests);
}

async function getCompletion(messageHistory, systemPrompt, model = 'llama-3.3-70b-versatile', temperature = 0.7, channelId) {
    checkRateLimit(channelId);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...messageHistory
    ];

    try {
        const completion = await groq.chat.completions.create({
            messages,
            model,
            temperature,
        });

        return completion.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Error in Groq API call:', error);
        throw new Error('Failed to get response from Groq API');
    }
}

module.exports = {
    getCompletion
}; 