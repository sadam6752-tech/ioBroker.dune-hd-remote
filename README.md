# ioBroker.dune-hd-remote

![Logo](admin/dune-hd-remote.png)

Control Dune HD media players via IP network from ioBroker.

## Features

- Full playback control (play, pause, stop, seek, prev/next, fast-forward/rewind)
- Navigation (D-pad, enter, return, menus)
- Volume and mute control
- Status polling (player state, position, duration, volume, bitrate, audio language, video resolution)
- Built-in PWA web remote — use your phone as a remote control
- Smart offline polling — reduces poll frequency when player is unreachable
- PWA text input — send text directly to the player's on-screen keyboard
- PWA Play URL — start media playback from any URL directly from the remote

## Supported Models

All Dune HD media players with IP control support (Linux-based firmware).  
Tested on: **Dune HD Pro 4K** (firmware with XML response format).

| Model type | Default port |
|---|---|
| Linux-based (Pro 4K, Solo 4K, etc.) | 80 |
| Android/ATV-based | 11080 |

## Configuration

### Player
| Field | Description |
|---|---|
| Player Name | Display name (for reference only) |
| Player IP Address | IP address of the Dune HD player |
| Player Port | HTTP port (default: 80) |
| Connection Timeout | Request timeout in ms (default: 5000) |

### Status Polling
| Field | Description |
|---|---|
| Enable Status Polling | Enable periodic status updates |
| Polling Interval | Interval in seconds when player is online (default: 5) |
| Offline Polling Interval | Interval in seconds when player is unreachable (default: 30) |

### PWA Remote Control
Enable the built-in web remote to control the player from any browser or mobile device.

| Field | Description |
|---|---|
| Enable PWA Remote Control | Start the built-in web server |
| Bind IP Address | Network interface to bind to (0.0.0.0 = all interfaces) |
| PWA Server Port | Port for the web remote (default: 8765) |

After enabling, open `http://<iobroker-host>:8765/` in your browser.  
The URL is also stored in the `info.pwaUrl` state.

**PWA features:**
- Main tab: D-pad, playback controls, volume, seek
- Main tab: text input field — sends text to the active player keyboard (`set_text` API)
- Main tab: Play URL field — starts media playback from any URL (`launch_media_url` API)
- Digits tab: number keys, color buttons (A/B/C/D), subtitle, zoom, eject, REC
- Settings tab: dark/light theme, connection settings
- Works as installable PWA on iOS and Android (Add to Home Screen)

## States

| State | Type | Description |
|---|---|---|
| `info.connection` | boolean | Player reachable |
| `info.pwaUrl` | string | PWA remote URL |
| `info.playerModel` | string | Player model name |
| `info.firmwareVersion` | string | Firmware version |
| `status.playerStatus` | string | playing / stopped / paused |
| `status.position` | number | Playback position (seconds) |
| `status.duration` | number | Total duration (seconds) |
| `status.volume` | number | Volume level |
| `status.mute` | boolean | Mute state |
| `status.caption` | string | Current media title |
| `status.audioLang` | string | Audio language |
| `status.videoWidth/Height` | number | Video resolution |
| `status.bitrate` | number | Current bitrate (bit/s) |
| `control.play/pause/stop` | boolean | Trigger playback actions |
| `control.volume` | number | Set volume |
| `navigation.up/down/left/right/ok/back` | boolean | Navigation buttons |
| `media.playUrl` | string | Play media from URL |
| `media.seek` | number | Seek to position (seconds) |

## Changelog

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

## License

MIT © 2026 sadam6752-tech

Copyright (c) 2026 sadam6752-tech <sadam6752@gmail.com>
