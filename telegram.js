/**
 * telegram.js
 * Utility for sending messages via Telegram Bot API.
 */

/**
 * Send a message to a Telegram chat.
 * @param {string} token - The Telegram Bot Token.
 * @param {string} chatId - The Telegram Chat ID.
 * @param {string} message - The message text to send.
 * @returns {Promise<Object>} - The response from Telegram API.
 */
export async function sendTelegramMessage(token, chatId, message) {
  if (!token || !chatId || !message) {
    throw new Error("Missing Telegram configuration or message content.");
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || "Failed to send Telegram message.");
  }
  return data;
}
