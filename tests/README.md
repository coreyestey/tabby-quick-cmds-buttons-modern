# Manual end-to-end tests

These scripts drive a **running Tabby instance** over the Chrome DevTools
Protocol, so they cannot run in CI. They are kept for manual verification.

Start Tabby with remote debugging enabled so it listens on port 9222, then
run a script with Node, for example:

```bash
node tests/test-edit-first.js
```

- `test-e2e.js` — general panel smoke test
- `test-edit-first.js` — "Edit first" checkbox behaviour
- `test-minimize.js` — minimize / restore behaviour
- `test-real-click.js` — clicking a command button sends it

The automated, headless tests that *do* run in CI live in `../test`
(`layout-test.mjs` and `button-visibility.mjs`) and are run by `npm test`.
They render the plugin CSS against HTML fixtures and need no Tabby instance.
