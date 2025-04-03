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
    const maxRetries = 3;
    const initialDelay = 10000; // 10 seconds
    let lastError = null; // Store the last error for final throw if all retries fail

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Check rate limit before making the request (throws immediately if exceeded)
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
                max_tokens: 1000, // Consider making this configurable later if needed
            });

            if (!response?.choices?.[0]?.message?.content) {
                 // This specific error shouldn't be retried immediately
                throw new Error('Invalid response from OpenRouter');
            }

            // Success
            return response.choices[0].message.content.trim();

        } catch (error) {
            console.error(`OpenRouter API Error (Attempt ${attempt + 1}/${maxRetries + 1}):`, error);
            lastError = error; // Store the most recent error

            // Check for specific NON-RETRIABLE errors
            const isCustomRateLimit = error.message.includes('Rate limit exceeded'); // From checkRateLimit function
            const isApiRateLimit = error.status === 429;
            const isAuthError = error.status === 401 || error.status === 403;
            const isInvalidResponse = error.message.includes('Invalid response');

            if (isCustomRateLimit || isApiRateLimit || isAuthError || isInvalidResponse) {
                // These errors are not retriable, throw a specific error message immediately
                if (isCustomRateLimit) {
                    throw new Error(error.message); // Use the specific message from checkRateLimit
                } else if (isApiRateLimit) {
                    throw new Error('OpenRouter rate limit reached. Please try again later.');
                } else if (isAuthError) {
                    throw new Error('Authentication error with OpenRouter. Please check your API key.');
                } else if (isInvalidResponse) {
                    throw new Error('Received an invalid response from the AI model. Please try again.');
                }
            }

            // If it's the last attempt, break the loop and throw the last error below
            if (attempt === maxRetries) {
                break;
            }

            // It's a potentially transient error, calculate delay and wait before retrying
            const delay = initialDelay * (attempt + 1); // 10s, 20s, 30s
            console.log(`Retrying OpenRouter API call in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // If the loop finished without returning (i.e., all retries failed)
    console.error('OpenRouter API failed after multiple retries.');
    // Throw the last error encountered, or a generic one if somehow lastError is null
    throw lastError || new Error('Failed to get completion from OpenRouter after multiple retries. Please try again later.');
}

module.exports = { getCompletion }; 