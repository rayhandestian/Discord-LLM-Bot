const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'serverConfigs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load configurations from file
function loadConfigs() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading configurations:', error);
    }
    return {};
}

// Save configurations to file
function saveConfigs(configs) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
    } catch (error) {
        console.error('Error saving configurations:', error);
    }
}

module.exports = { loadConfigs, saveConfigs }; 