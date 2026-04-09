(async () => {
  const src = chrome.runtime.getURL('content.js');
  const module = await import(src);
  // The module will execute its top-level code upon import
})();
