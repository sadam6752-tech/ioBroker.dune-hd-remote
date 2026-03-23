# ioBroker.dune-hd-remote

Control Dune HD media players via IP network.

## Features

- Remote control buttons (Play, Pause, Stop, Navigation, etc.)
- Media playback control (URL playback)
- Status polling (player state, position, duration)
- Multiple player instances supported
- 11 languages supported

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Player Name | Display name | Dune HD |
| Player IP Address | IP address of the player | 192.168.1.120 |
| Player Port | HTTP port (80 for Linux, 11080 for Android/ATV) | 80 |
| Connection Timeout | Timeout in ms | 5000 |
| Enable Status Polling | Poll player status periodically | true |
| Polling Interval | Polling interval in seconds | 5 |

## Object Structure

```
dune-hd-remote.0/
├── info.connection        – Connected to player
├── control/
│   ├── power              – Toggle standby (IR)
│   ├── play               – Play
│   ├── pause              – Pause
│   ├── stop               – Stop
│   ├── resume             – Resume playback
│   ├── prev               – Previous
│   ├── next               – Next
│   ├── rewind             – Rewind
│   ├── forward            – Fast forward
│   ├── mute               – Toggle mute (IR)
│   └── volume             – Set volume (0-100, Android only)
├── navigation/
│   ├── up / down / left / right
│   ├── ok / back / menu / home
├── media/
│   ├── playUrl            – URL to play
│   └── seek               – Seek to position (seconds)
└── status/
    ├── playerStatus       – stopped / playing
    ├── position           – Current position (s)
    ├── duration           – Total duration (s)
    ├── volume             – Current volume
    ├── mute               – Muted
    └── currentUrl         – Current media URL
```

## Supported Devices

All Dune HD models with firmware ≥ 2010:
- Dune HD Pro 4K, Duo 4K, Max Vision 4K (Linux, port 80)
- Dune HD TV-175L/a, AV1 4K (Android, port 11080)

## Changelog

### 0.1.0 (2026-03-23)
- (sadam6752-tech) Initial release

## License

MIT License — Copyright (c) 2026 sadam6752-tech
