# Tabby Quick Cmd Buttons Modern

A modernized Tabby terminal plugin that displays your **Quick Commands** as a compact, draggable button panel.

This fork updates the original plugin UI so it follows Tabby's active theme instead of using fixed colors and an unrelated component theme.

## Features

- Quick Command groups shown as tabs
- Command buttons that follow Tabby's current theme
- `${name}` parameter prompts compatible with `tabby-quick-cmds` command syntax
- Repeated parameters are prompted once and replaced everywhere in the command
- Active tab can be clicked again to collapse its command list
- Compact minimize / restore behavior
- Add, edit and delete Quick Commands from the panel
- **Edit first** mode to insert a resolved command without immediately pressing Enter
- Draggable and resizable panel that remembers its position and size
- Show / hide the panel with a configurable hotkey or the terminal context menu
- Light, dark and custom Tabby theme support

## Showing and hiding the panel

Closing the panel with the **✕** button hides it; it does not have to be
rebuilt by restarting Tabby. Bring it back with either:

- The **Show/hide QuickCmdBtn** hotkey (set a key binding under
  Settings → Hotkeys), or
- The **Toggle Quick Commands panel** item in a terminal's right-click menu.

## Auto commands

A Quick Command placed in a group named `auto` is run automatically whenever
its name appears in the terminal output of the focused tab. Use this
sparingly: every line of output is scanned for the command names in the
`auto` group.

## Requirement

Install **tabby-quick-cmds** first and create Quick Commands there. This plugin uses the commands stored in Tabby's `qc.cmds` configuration and follows its `${name}` parameter syntax when commands are launched from the button panel.

## Installation

Install **tabby-quick-cmds-buttons-modern** from Tabby's plugin manager.

For development or local testing, clone this repository directly into Tabby's plugin modules directory and build it.

Windows example:

```bat
cd %APPDATA%\tabby\plugins\node_modules
git clone https://github.com/danhk0612/tabby-quick-cmds-buttons-modern.git
cd tabby-quick-cmds-buttons-modern
npm install
npm run build
```

Restart Tabby after building.

To update an existing development install:

```bat
git pull
npm install
npm run build
```

## Build

```bash
npm ci
npm run build
```

Compiled files are written to `dist/`.

## Publishing

A change to the version in `package.json` that is merged into `master` triggers `.github/workflows/nodejs.yml` and publishes the new version to npm automatically.

npm Trusted Publishing is configured for this repository and workflow, so publishing uses GitHub OIDC without an `NPM_TOKEN` secret.

For each release, update `package.json` to a new npm version in the release pull request. Merge only after CI passes.

## Upstream

This repository is a fork of Richard's original project:

- https://github.com/weijia/tabby-quick-cmds-buttons/

The original plugin was based on Eugene Pankov's `tabby-clippy` work.

## License

MIT. The original copyright and license notice are retained in [LICENSE](./LICENSE).
