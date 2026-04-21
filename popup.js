/**
 * popup.js
 * Application entry point for the extension popup.
 */

import { initApp } from "./app.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp(document);
});
