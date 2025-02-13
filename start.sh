#!/bin/bash
# Install dependencies
npm install --save --production

# Deploy slash commands
node src/deploy-commands.js

# Start the bot
node . 