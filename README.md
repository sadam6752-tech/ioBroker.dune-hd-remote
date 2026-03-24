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

### 0.2.0
- Built-in PWA web remote control
- Smart offline polling (configurable interval)
- Full translations for all ioBroker languages
- Extended status states (bitrate, audio language, video resolution, buffering)

### 0.1.0
- Initial release

## License

MIT © sadam6752-tech
