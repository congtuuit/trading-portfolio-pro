---
name: verify
description: Run syntax checks and validation for the Trading Portfolio Pro extension files
---

To verify the codebase:
1. Run static syntax check on all JS files using `node --check <file>` to ensure there are no parser errors.
2. Verify that `manifest.json` has all permissions and resource mappings correctly configured.
3. Verify that the popup UI (`popup.html`, `ui.js`, `style.css`) contains properly balanced HTML tags.
