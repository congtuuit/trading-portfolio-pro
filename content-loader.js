(async () => {
  try {
    const src = chrome.runtime.getURL('content.js');
    const response = await fetch(src);
    let code = await response.text();

    // Convert relative ES module imports to absolute extension URLs
    // e.g. import { initApp } from "./app.js"; -> import { initApp } from "chrome-extension://<extension_id>/app.js";
    code = code.replace(/from\s+['"]\.\/([^'"]+)['"]/g, (match, path) => {
      return `from "${chrome.runtime.getURL(path)}"`;
    });

    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await import(url);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[TPP Loader] Blob import failed, trying fallback:", err);
    // Fallback to direct import if blob URL is blocked by strict CSP
    const src = chrome.runtime.getURL('content.js');
    await import(src);
  }
})();
