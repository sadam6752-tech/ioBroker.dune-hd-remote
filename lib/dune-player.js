'use strict';

const http = require('http');

/**
 * DunePlayer — HTTP API client for Dune HD media players.
 * Supports XML (Pro 4K / newer firmware), text (key=value) and JSON responses.
 */
class DunePlayer {
    /**
     * @param {string} ip
     * @param {number} port
     * @param {number} timeout - ms
     */
    constructor(ip, port = 80, timeout = 5000) {
        this.ip = ip;
        this.port = port;
        this.timeout = timeout;
    }

    /**
     * Send HTTP command to Dune HD player.
     * @param {string} cmd
     * @param {object} params
     * @returns {Promise<object>}
     */
    async sendCommand(cmd, params = {}) {
        return new Promise((resolve, reject) => {
            const queryParams = new URLSearchParams({ cmd, ...params });
            const path = `/cgi-bin/do?${queryParams.toString()}`;

            const req = http.request(
                {
                    hostname: this.ip,
                    port: this.port,
                    path,
                    method: 'GET',
                    timeout: this.timeout,
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        try {
                            const trimmed = data.trim();
                            if (trimmed.startsWith('<')) {
                                resolve(this._parseXml(trimmed));
                            } else if (trimmed.startsWith('{')) {
                                resolve(JSON.parse(trimmed));
                            } else {
                                resolve(this._parseText(trimmed));
                            }
                        } catch {
                            resolve({ raw: data.trim() });
                        }
                    });
                },
            );

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });
    }

    /**
     * Parse XML response: <param name="key" value="val"/>
     * @param {string} xml
     * @returns {object}
     */
    _parseXml(xml) {
        const result = {};
        // command_status from <command_result> tag presence = ok
        if (xml.includes('<command_result')) {
            result.command_status = 'ok';
        }
        const re = /<param\s+name="([^"]+)"\s+value="([^"]*)"/g;
        let m;
        while ((m = re.exec(xml)) !== null) {
            result[m[1]] = m[2];
        }
        return result;
    }

    /**
     * Parse key=value text response.
     * @param {string} text
     * @returns {object}
     */
    _parseText(text) {
        const result = {};
        for (const line of text.split('\n')) {
            const idx = line.indexOf('=');
            if (idx > 0) {
                result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            }
        }
        return result;
    }

    // ── IR codes ────────────────────────────────────────────────────────────

    static IR_CODES = {
        POWER:       'BC43BF00',
        UP:          'EA15BF00',
        DOWN:        'E916BF00',
        LEFT:        'E817BF00',
        RIGHT:       'E718BF00',
        ENTER:       'EB14BF00',
        RETURN:      'FB04BF00',
        TOP_MENU:    'AE51BF00',
        POP_UP_MENU: 'F807BF00',
        MUTE:        'B946BF00',
        V_UP:        'AD52BF00',
        V_DOWN:      'AC53BF00',
        PLAY:        'B54ABF00',
        PAUSE:       'B649BF00',
        STOP:        'B748BF00',
        FF:          'B34CBF00',
        REW:         'B44BBF00',
        AUDIO:       'BB44BF00',
        SUBTITLE:    'BA45BF00',
        '0': 'EF10BF00',
        '1': 'F00FBF00',
        '2': 'F10EBF00',
        '3': 'F20DBF00',
        '4': 'F30CBF00',
        '5': 'F40BBF00',
        '6': 'F50ABF00',
        '7': 'EE11BF00',
        '8': 'F708BF00',
        '9': 'F807BF00',
    };

    /**
     * Press a remote button by name.
     * @param {string} button
     */
    async pressButton(button) {
        const irCode = DunePlayer.IR_CODES[button.toUpperCase()];
        if (!irCode) throw new Error(`Unknown button: ${button}`);
        return this.sendCommand('ir_code', { ir_code: irCode });
    }

    // ── Convenience button methods ───────────────────────────────────────────

    async power()     { return this.pressButton('POWER'); }
    async up()        { return this.pressButton('UP'); }
    async down()      { return this.pressButton('DOWN'); }
    async left()      { return this.pressButton('LEFT'); }
    async right()     { return this.pressButton('RIGHT'); }
    async ok()        { return this.pressButton('ENTER'); }
    async back()      { return this.pressButton('RETURN'); }
    async menu()      { return this.pressButton('TOP_MENU'); }
    async popupMenu() { return this.pressButton('POP_UP_MENU'); }
    async play()      { return this.pressButton('PLAY'); }
    async pause()     { return this.pressButton('PAUSE'); }
    async stop()      { return this.pressButton('STOP'); }
    async rewind()    { return this.pressButton('REW'); }
    async forward()   { return this.pressButton('FF'); }
    async volumeUp()  { return this.pressButton('V_UP'); }
    async volumeDown(){ return this.pressButton('V_DOWN'); }
    async mute()      { return this.pressButton('MUTE'); }
    async audio()     { return this.pressButton('AUDIO'); }
    async subtitle()  { return this.pressButton('SUBTITLE'); }
    async number(n)   { return this.pressButton(String(n)); }

    // ── Playback control ─────────────────────────────────────────────────────

    async setPlaybackState(params = {}) {
        return this.sendCommand('set_playback_state', params);
    }

    async pausePlayback()  { return this.setPlaybackState({ speed: 0 }); }
    async resumePlayback() { return this.setPlaybackState({ speed: 256 }); }

    async seek(seconds) {
        return this.setPlaybackState({ position: seconds });
    }

    /** Set volume 0-100 (Android models, protocol v2+) */
    async setVolume(level) {
        return this.setPlaybackState({ volume: Math.max(0, Math.min(100, level)) });
    }

    // ── Status & navigation ──────────────────────────────────────────────────

    async getStatus(useJson = true) {
        return this.sendCommand('status', useJson ? { result_syntax: 'json' } : {});
    }

    async mainScreen()  { return this.sendCommand('main_screen'); }
    async blackScreen() { return this.sendCommand('black_screen'); }
    async standby()     { return this.sendCommand('standby'); }

    // ── Media playback ───────────────────────────────────────────────────────

    async playFile(url, options = {}) {
        return this.sendCommand('start_file_playback', { media_url: url, ...options });
    }

    async launchMediaUrl(url) {
        return this.sendCommand('launch_media_url', { media_url: url });
    }

    async playbackAction(action) {
        return this.sendCommand('playback_action', { action });
    }

    // ── Navigation paths ─────────────────────────────────────────────────────

    async openPath(path)      { return this.sendCommand('open_path', { url: path }); }
    async openApplications()  { return this.openPath('root://applications'); }
    async openSetup()         { return this.openPath('root://setup'); }
    async openFavorites()     { return this.openPath('root://favorites'); }
    async openSources()       { return this.openPath('root://sources'); }

    // ── Connection test ──────────────────────────────────────────────────────

    async testConnection() {
        try {
            const status = await this.getStatus();
            return { success: status.command_status === 'ok', status };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

module.exports = DunePlayer;
