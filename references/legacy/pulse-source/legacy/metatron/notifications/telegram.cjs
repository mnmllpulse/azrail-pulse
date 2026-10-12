const axios = require('axios');
let config = {};
try {
    config = require('../config.json');
} catch (e) {
    console.warn('[TELEGRAM WARNING] config.json load failed:', e.message);
}

async function sendTelegramAlert(message) {
    const token = process.env.TG_BOT_TOKEN || config.tgBotToken;
    const chatId = process.env.TG_CHAT_ID || config.tgChatId;

    if (!token || !chatId) {
        console.log(`[TELEGRAM ALERT MUTED]: Missing token or chatId. Message: ${message}`);
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        console.log(`[TELEGRAM NOTIFICATION SENT]`);
    } catch (error) {
        console.error(`[TELEGRAM NOTIFICATION FAILED]: ${error.message}`);
    }
}

module.exports = { sendTelegramAlert };
