'use strict';

const utils = require('@iobroker/adapter-core');
const DunePlayer = require('./lib/dune-player');

class DuneHdRemote extends utils.Adapter {
    constructor(options = {}) {
        super({ ...options, name: 'dune-hd-remote' });

        /** @type {DunePlayer|null} */
        this.player = null;
        this._pollingTimer = null;

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.on('message', this.onMessage.bind(this));
    }

    async onReady() {
        const ip = this.config.playerIP;
        if (!ip) {
            this.log.error('Player IP not configured!');
            await this.setStateAsync('info.connection', { val: false, ack: true });
            return;
        }

        const port    = this.config.playerPort    || 80;
        const timeout = this.config.connectionTimeout || 5000;

        this.player = new DunePlayer(ip, port, timeout);
        this.log.info(`Dune HD Remote: connecting to ${ip}:${port}`);

        await this._createObjects();
        await this.subscribeStatesAsync('control.*');
        await this.subscribeStatesAsync('navigation.*');
        await this.subscribeStatesAsync('media.*');

        await this._updateStatus();

        if (this.config.pollingEnabled) {
            const intervalMs = (this.config.pollingInterval || 5) * 1000;
            this._pollingTimer = this.setInterval(() => this._updateStatus(), intervalMs);
        }
    }

    async onUnload(callback) {
        try {
            if (this._pollingTimer) {
                this.clearInterval(this._pollingTimer);
                this._pollingTimer = null;
            }
            await this.setStateAsync('info.connection', { val: false, ack: true });
        } finally {
            callback();
        }
    }

    async onStateChange(id, state) {
        if (!state || state.ack) return;

        const parts   = id.split('.');
        const channel = parts[2];
        const name    = parts[3];

        try {
            switch (channel) {
                case 'control':    await this._handleControl(name, state.val);    break;
                case 'navigation': await this._handleNavigation(name, state.val); break;
                case 'media':      await this._handleMedia(name, state.val);      break;
            }
        } catch (err) {
            this.log.error(`Error handling ${id}: ${err.message}`);
        }
    }

    async onMessage(obj) {
        if (!obj || obj.command !== 'testConnection') return;
        if (!this.player) {
            this.sendTo(obj.from, obj.command, { error: 'Player not initialized' }, obj.callback);
            return;
        }
        const result = await this.player.testConnection();
        this.sendTo(obj.from, obj.command, result, obj.callback);
    }

    // ── Control handler ──────────────────────────────────────────────────────

    async _handleControl(command, value) {
        if (!this.player) return;

        switch (command) {
            case 'power':   await this.player.power();              break;
            case 'play':    if (value) await this.player.play();    break;
            case 'pause':   if (value) await this.player.pause();   break;
            case 'stop':    if (value) await this.player.stop();    break;
            case 'resume':  if (value) await this.player.resumePlayback(); break;
            case 'prev':    if (value) await this.player.playbackAction('prev'); break;
            case 'next':    if (value) await this.player.playbackAction('next'); break;
            case 'rewind':  if (value) await this.player.rewind();  break;
            case 'forward': if (value) await this.player.forward(); break;
            case 'mute':    if (value) await this.player.mute();    break;
            case 'volume':
                await this.player.setVolume(value);
                await this.setStateAsync('status.volume', { val: value, ack: true });
                return; // no reset for volume
        }

        // Reset button state
        if (command !== 'volume') {
            await this.setStateAsync(`control.${command}`, { val: false, ack: true });
        }
    }

    // ── Navigation handler ───────────────────────────────────────────────────

    async _handleNavigation(command, value) {
        if (!this.player || !value) return;

        const map = {
            up:   () => this.player.up(),
            down: () => this.player.down(),
            left: () => this.player.left(),
            right:() => this.player.right(),
            ok:   () => this.player.ok(),
            back: () => this.player.back(),
            menu: () => this.player.menu(),
            home: () => this.player.mainScreen(),
        };

        if (map[command]) await map[command]();
        await this.setStateAsync(`navigation.${command}`, { val: false, ack: true });
    }

    // ── Media handler ────────────────────────────────────────────────────────

    async _handleMedia(command, value) {
        if (!this.player) return;

        switch (command) {
            case 'playUrl':
                if (value) {
                    await this.player.launchMediaUrl(value);
                    await this.setStateAsync('status.currentUrl', { val: value, ack: true });
                }
                break;
            case 'seek':
                if (typeof value === 'number') {
                    await this.player.seek(value);
                }
                break;
        }
    }

    // ── Status polling ───────────────────────────────────────────────────────

    async _updateStatus() {
        if (!this.player) return;

        try {
            const s = await this.player.getStatus(false);
            const connected = s.command_status === 'ok';
            await this.setStateAsync('info.connection', { val: connected, ack: true });

            if (!connected) {
                this.log.debug(`Player responded but command_status=${s.command_status}`);
                return;
            }

            // player_state → simplified status
            const stateMap = {
                file_playback:   'playing',
                dvd_playback:    'playing',
                bluray_playback: 'playing',
                navigator:       'stopped',
                black_screen:    'stopped',
                standby:         'stopped',
            };
            const playerStatus = stateMap[s.player_state] || s.player_state || 'stopped';
            await this.setStateAsync('status.playerStatus', { val: playerStatus, ack: true });

            if (s.playback_position !== undefined) {
                await this.setStateAsync('status.position', { val: parseInt(s.playback_position) || 0, ack: true });
            }
            if (s.playback_duration !== undefined) {
                await this.setStateAsync('status.duration', { val: parseInt(s.playback_duration) || 0, ack: true });
            }
            // XML uses playback_volume, text/json uses volume
            const vol = s.playback_volume !== undefined ? s.playback_volume : s.volume;
            if (vol !== undefined) {
                await this.setStateAsync('status.volume', { val: parseInt(vol) || 0, ack: true });
            }
            // XML uses playback_mute
            const mute = s.playback_mute !== undefined ? s.playback_mute : s.mute;
            if (mute !== undefined) {
                await this.setStateAsync('status.mute', { val: mute === '1' || mute === true, ack: true });
            }
            if (s.playback_url !== undefined) {
                await this.setStateAsync('status.currentUrl', { val: s.playback_url, ack: true });
            }
            // Extra info from XML
            if (s.playback_caption !== undefined) {
                await this.setStateAsync('status.caption', { val: s.playback_caption, ack: true });
            }
            if (s.playback_picture !== undefined) {
                await this.setStateAsync('status.picture', { val: s.playback_picture, ack: true });
            }
            if (s.playback_state !== undefined) {
                await this.setStateAsync('status.playbackState', { val: s.playback_state, ack: true });
            }
            if (s.playback_current_bitrate !== undefined) {
                await this.setStateAsync('status.bitrate', { val: parseInt(s.playback_current_bitrate) || 0, ack: true });
            }
            if (s.playback_is_buffering !== undefined) {
                await this.setStateAsync('status.isBuffering', { val: s.playback_is_buffering === '1' || s.playback_is_buffering === true, ack: true });
            }
            if (s['audio_track.0.lang'] !== undefined) {
                await this.setStateAsync('status.audioLang', { val: s['audio_track.0.lang'], ack: true });
            }
            if (s.playback_video_width !== undefined) {
                await this.setStateAsync('status.videoWidth', { val: parseInt(s.playback_video_width) || 0, ack: true });
            }
            if (s.playback_video_height !== undefined) {
                await this.setStateAsync('status.videoHeight', { val: parseInt(s.playback_video_height) || 0, ack: true });
            }
            if (s.product_name !== undefined) {
                await this.setStateAsync('info.playerModel', { val: s.product_name, ack: true });
            }
            if (s.firmware_version !== undefined) {
                await this.setStateAsync('info.firmwareVersion', { val: s.firmware_version, ack: true });
            }
        } catch (err) {
            this.log.warn(`Status update failed (${this.config.playerIP}:${this.config.playerPort}): ${err.message}`);
            await this.setStateAsync('info.connection', { val: false, ack: true });
        }
    }

    // ── Object creation ──────────────────────────────────────────────────────

    async _createObjects() {
        // control channel
        await this.extendObjectAsync('control', { type: 'channel', common: { name: 'Control' }, native: {} });

        const buttons = ['power', 'play', 'pause', 'stop', 'resume', 'prev', 'next', 'rewind', 'forward', 'mute'];
        for (const btn of buttons) {
            await this.extendObjectAsync(`control.${btn}`, {
                type: 'state',
                common: { name: btn, type: 'boolean', role: `button.${btn}`, read: true, write: true, def: false },
                native: {},
            });
        }
        await this.extendObjectAsync('control.volume', {
            type: 'state',
            common: { name: 'Volume', type: 'number', role: 'level.volume', read: true, write: true, min: 0, max: 100, def: 50, unit: '%' },
            native: {},
        });

        // navigation channel
        await this.extendObjectAsync('navigation', { type: 'channel', common: { name: 'Navigation' }, native: {} });
        for (const btn of ['up', 'down', 'left', 'right', 'ok', 'back', 'menu', 'home']) {
            await this.extendObjectAsync(`navigation.${btn}`, {
                type: 'state',
                common: { name: btn, type: 'boolean', role: 'button', read: true, write: true, def: false },
                native: {},
            });
        }

        // media channel
        await this.extendObjectAsync('media', { type: 'channel', common: { name: 'Media' }, native: {} });
        await this.extendObjectAsync('media.playUrl', {
            type: 'state',
            common: { name: 'Play URL', type: 'string', role: 'media.url', read: true, write: true, def: '' },
            native: {},
        });
        await this.extendObjectAsync('media.seek', {
            type: 'state',
            common: { name: 'Seek (seconds)', type: 'number', role: 'media.seek', read: true, write: true, def: 0, unit: 's' },
            native: {},
        });

        // status channel
        await this.extendObjectAsync('status', { type: 'channel', common: { name: 'Status' }, native: {} });
        await this.extendObjectAsync('status.playerStatus', {
            type: 'state',
            common: {
                name: 'Player Status', type: 'string', role: 'media.state', read: true, write: false, def: 'stopped',
                states: { stopped: 'Stopped', paused: 'Paused', playing: 'Playing' },
            },
            native: {},
        });
        await this.extendObjectAsync('status.position', {
            type: 'state',
            common: { name: 'Position', type: 'number', role: 'media.elapsed', read: true, write: false, def: 0, unit: 's' },
            native: {},
        });
        await this.extendObjectAsync('status.duration', {
            type: 'state',
            common: { name: 'Duration', type: 'number', role: 'media.duration', read: true, write: false, def: 0, unit: 's' },
            native: {},
        });
        await this.extendObjectAsync('status.volume', {
            type: 'state',
            common: { name: 'Volume', type: 'number', role: 'level.volume', read: true, write: false, def: 0, unit: '%' },
            native: {},
        });
        await this.extendObjectAsync('status.mute', {
            type: 'state',
            common: { name: 'Mute', type: 'boolean', role: 'media.mute', read: true, write: false, def: false },
            native: {},
        });
        await this.extendObjectAsync('status.currentUrl', {
            type: 'state',
            common: { name: 'Current URL', type: 'string', role: 'media.url', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObjectAsync('status.caption', {
            type: 'state',
            common: { name: 'Caption / Channel Name', type: 'string', role: 'media.title', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObjectAsync('status.picture', {
            type: 'state',
            common: { name: 'Channel Logo URL', type: 'string', role: 'media.cover', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObjectAsync('status.playbackState', {
            type: 'state',
            common: {
                name: 'Playback State', type: 'string', role: 'media.state', read: true, write: false, def: '',
                states: { playing: 'Playing', paused: 'Paused', buffering: 'Buffering' },
            },
            native: {},
        });
        await this.extendObjectAsync('status.bitrate', {
            type: 'state',
            common: { name: 'Current Bitrate', type: 'number', role: 'media.bitrate', read: true, write: false, def: 0, unit: 'bit/s' },
            native: {},
        });
        await this.extendObjectAsync('status.isBuffering', {
            type: 'state',
            common: { name: 'Is Buffering', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
            native: {},
        });
        await this.extendObjectAsync('status.audioLang', {
            type: 'state',
            common: { name: 'Audio Language', type: 'string', role: 'media.track', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObjectAsync('status.videoWidth', {
            type: 'state',
            common: { name: 'Video Width', type: 'number', role: 'value', read: true, write: false, def: 0, unit: 'px' },
            native: {},
        });
        await this.extendObjectAsync('status.videoHeight', {
            type: 'state',
            common: { name: 'Video Height', type: 'number', role: 'value', read: true, write: false, def: 0, unit: 'px' },
            native: {},
        });
        // info extras
        await this.extendObjectAsync('info.playerModel', {
            type: 'state',
            common: { name: 'Player Model', type: 'string', role: 'info.hardware', read: true, write: false, def: '' },
            native: {},
        });
        await this.extendObjectAsync('info.firmwareVersion', {
            type: 'state',
            common: { name: 'Firmware Version', type: 'string', role: 'info.firmware', read: true, write: false, def: '' },
            native: {},
        });
    }
}

if (require.main !== module) {
    module.exports = (options) => new DuneHdRemote(options);
} else {
    new DuneHdRemote();
}
