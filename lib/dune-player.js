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
    // Source: https://dune-hd.com/support/rc
    // Format: 00 BF XX YY → IP Control = YY XX BF 00

    static IR_CODES = {
        POWER:       'BC43BF00',  // 00 BF 43 BC
        UP:          'EA15BF00',  // 00 BF 15 EA
        DOWN:        'E916BF00',  // 00 BF 16 E9
        LEFT:        'E817BF00',  // 00 BF 17 E8
        RIGHT:       'E718BF00',  // 00 BF 18 E7
        ENTER:       'EB14BF00',  // 00 BF 14 EB
        RETURN:      'FB04BF00',  // 00 BF 04 FB
        INFO:        'AF50BF00',  // 00 BF 50 AF
        POP_UP_MENU: 'F807BF00',  // 00 BF 07 F8
        TOP_MENU:    'AE51BF00',  // 00 BF 51 AE
        MUTE:        'B946BF00',  // 00 BF 46 B9
        V_UP:        'AD52BF00',  // 00 BF 52 AD
        V_DOWN:      'AC53BF00',  // 00 BF 53 AC
        AUDIO:       'BB44BF00',  // 00 BF 44 BB
        SUBTITLE:    'AB54BF00',  // 00 BF 54 AB
        ZOOM:        'FD02BF00',  // 00 BF 02 FD
        EJECT:       'EF10BF00',  // 00 BF 10 EF
        '0': 'F50ABF00',  // 00 BF 0A F5
        '1': 'F40BBF00',  // 00 BF 0B F4
        '2': 'F30CBF00',  // 00 BF 0C F3
        '3': 'F20DBF00',  // 00 BF 0D F2
        '4': 'F10EBF00',  // 00 BF 0E F1
        '5': 'F00FBF00',  // 00 BF 0F F0
        '6': 'FE01BF00',  // 00 BF 01 FE
        '7': 'EE11BF00',  // 00 BF 11 EE
        '8': 'ED12BF00',  // 00 BF 12 ED
        '9': 'EC13BF00',  // 00 BF 13 EC
        CLEAR:       'FA05BF00',  // 00 BF 05 FA
        SELECT:      'BD42BF00',  // 00 BF 42 BD
        A:           'BF40BF00',  // 00 BF 40 BF
        B:           'E01FBF00',  // 00 BF 1F E0
        C:           'FF00BF00',  // 00 BF 00 FF
        D:           'BE41BF00',  // 00 BF 41 BE
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
    async mute()      { return this.pressButton('MUTE'); }
    async audio()     { return this.pressButton('AUDIO'); }
    async subtitle()  { return this.pressButton('SUBTITLE'); }
    async volumeUp()  { return this.pressButton('V_UP'); }
    async volumeDown(){ return this.pressButton('V_DOWN'); }
    async number(n)   { return this.pressButton(String(n)); }

    // ── Playback control (use API commands, not IR) ──────────────────────────

    async play()    { return this.setPlaybackState({ speed: 256 }); }   // resume 1x
    async pause()   { return this.setPlaybackState({ speed: 0 }); }     // pause
    async stop()    { return this.playbackAction('stop'); }              // stop (v5+)
    async rewind()  { return this.setPlaybackState({ speed: -512 }); }  // rewind 2x
    async forward() { return this.setPlaybackState({ speed: 512 }); }   // ff 2x

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
