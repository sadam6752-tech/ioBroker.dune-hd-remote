# Older Changelog

### 1.2.8
- Add a link to the PWA remote control next to the instance in the admin Instances tab (localLinks)
- Update @iobroker/testing to 6.2.2 and @types/node to 22.20.4

### 1.2.7
- Fix E6029/W6030: add the missing changelog entry for 1.2.6
- Fix W6034: complete MIT license text in the README
- CI: Node.js 26 in the test matrix and a new deploy job using npm Trusted Publishing (OIDC) with provenance

### 1.2.6
- Fix W0066: pin @types/node to >=22 <23 (was ^26)
- Update @alcalzone/release-script-plugin-license to 5.2.2 (S0064)
- Update @iobroker/testing to 6.2.x (S0064)

### 1.2.5
- Migrate i18n to short format ({lang}.json)
- Update adapter-core range to ^3.4.3 in package.json

### 1.2.4
- Update @iobroker/adapter-core to 3.4.3

### 1.2.3
- Fix W0066: downgrade @types/node to >=22 <23
- Add extends clause to tsconfig.json (@tsconfig/node22)
- Add 1.2.2 changelog entry to README

### 1.2.2
- Fix W5612: add missing i18n keys for notify section (all 11 languages)
- Add prettier.config.mjs, tsconfig.json, @types/node, @tsconfig/node22
- Update devDependencies (eslint-config 2.3.4, release-script 5.2.1)
- Fix jsdoc types in lib files

### 1.2.1
- Fix E8915: add dependabot cooldown (7 days) to reduce supply chain risk
- Fix deploy step: use Node.js 24 for trusted publishing compatibility
- Remove redundant `eslint` and `prettier` devDependencies (included via `@iobroker/eslint-config`)
- Add manufacturer link and device description to README
- Add CHANGELOG_OLD.md for older changelog entries

### 1.2.0
- Add dune-notify plugin integration: show notifications on screen during playback

### 1.1.5
- Fixed README: added missing changelog entry for 1.1.4

### 1.1.4
- Fixed README changelog (E6006), added `needs: check-and-lint` to adapter-tests job (S3014)

### 1.1.3
- Use standard workflow and testing scripts as provided by create-adapter
- Added `needs: check-and-lint` to adapter-tests job
- Restructured test directory to match ioBroker.example template

### 1.1.2
- Use `node:` prefix for all built-in Node.js modules (fs, http, path, url)

### 1.1.1
- Fixed prettier formatting errors in lib files
- Added `test:integration` script for CI/CD compatibility

### 1.1.0
- Fixed CI/CD: use official ioBroker testing actions (check, adapter, deploy)
- Updated dependabot config: added github-actions support, cron schedule, auto-merge

### 1.0.9
- Improved CI/CD workflow with official ioBroker testing actions and concurrency
- Added dependabot for automatic dependency updates
- Use `node:` prefix for built-in Node.js modules

### 1.0.8
- Fixed missing devDependencies (manual-review, adapter-dev) — permanent fix

### 1.0.7
- Fixed missing devDependencies (manual-review, adapter-dev)

### 1.0.6
- Fixed CI/CD workflow (required jobs, tags pattern)
- Updated VS Code schema definitions

### 1.0.5
- Repository preparation: updated dependencies (node>=20, adapter-core 3.3.2), added CI/CD workflow, fixed repochecker issues

### 1.0.4
- Added `media.setText` state to send text to player on-screen keyboard from ioBroker

### 1.0.3
- PWA: disabled double-tap zoom on buttons (iOS)

### 1.0.2
- PWA: quick navigation shortcuts (TV, Sources, Apps, Setup, Favorites, Home)
- PWA: improved button layout on Main tab

### 1.0.1
- PWA: text input field to send text to the player's on-screen keyboard
- PWA: Play URL field for direct media playback from any URL

### 1.0.0
- First stable release
- PWA remote control (Main, Digits, Settings tabs)
- Status polling with configurable online/offline intervals
- Smart offline detection (warn on first failure, debug on repeated)
- Full i18n — 11 languages
