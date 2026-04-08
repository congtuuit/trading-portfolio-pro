/**
 * storage.js
 * Chrome storage abstraction layer.
 * Uses chrome.storage.local for persistence.
 */

const STORAGE_KEY = "tpp_portfolio";

/**
 * Load the portfolio array from chrome.storage.local.
 * @returns {Promise<Array>}
 */
export async function getPortfolio() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

/**
 * Save a portfolio array to chrome.storage.local.
 * @param {Array} portfolio
 * @returns {Promise<void>}
 */
export async function savePortfolio(portfolio) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: portfolio }, resolve);
  });
}

const SETTINGS_KEY = "tpp_settings";

export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
      resolve(result[SETTINGS_KEY] || { 
        aiProvider: 'gemini', 
        apiKey: '',
        tgToken: '',
        tgChatId: '',
        tgEnabled: false
      });
    });
  });
}

export async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
  });
}
