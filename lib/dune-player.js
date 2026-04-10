"use strict";

const http = require("node:http");

/**
 * DunePlayer — HTTP API client for Dune HD media players.
 * Supports XML (Pro 4K / newer firmware), text (key=value) and JSON responses.
 */
class DunePlayer {
  /**
   * @param {string} ip - Player IP address
   * @param {number} port - HTTP port (default 80)
   * @param {number} timeout - Request timeout in ms
   */
  constructor(ip, port = 80, timeout = 5000) {
    this.ip = ip;
    this.port = port;
    this.timeout = timeout;
  }

  /**
   * Send HTTP command to Dune HD player.
   *
   * @param {string} cmd - Command name
   * @param {object} params - Additional parameters
   * @returns {Promise<object>} Parsed response
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
          method: "GET",
          timeout: this.timeout,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const trimmed = data.trim();
              if (trimmed.startsWith("<")) {
                resolve(this._parseXml(trimmed));
              } else if (trimmed.startsWith("{")) {
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

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
      req.end();
    });
  }

  /**
   * Parse XML response: <param name="key" value="val"/>
   *
   * @param {string} xml - Raw XML string
   * @returns {object} Parsed key-value object
   */
  _parseXml(xml) {
    const result = {};
    if (xml.includes("<command_result")) {
      result.command_status = "ok";
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
   *
   * @param {string} text - Raw text response
   * @returns {object} Parsed key-value object
   */
  _parseText(text) {
    const result = {};
    for (const line of text.split("\n")) {
      const idx = line.indexOf("=");
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
    POWER: "BC43BF00",
    UP: "EA15BF00",
    DOWN: "E916BF00",
    LEFT: "E817BF00",
    RIGHT: "E718BF00",
    ENTER: "EB14BF00",
    RETURN: "FB04BF00",
    INFO: "AF50BF00",
    POP_UP_MENU: "F807BF00",
    TOP_MENU: "AE51BF00",
    MUTE: "B946BF00",
    V_UP: "AD52BF00",
    V_DOWN: "AC53BF00",
    AUDIO: "BB44BF00",
    SUBTITLE: "AB54BF00",
    ZOOM: "FD02BF00",
    EJECT: "EF10BF00",
    0: "F50ABF00",
    1: "F40BBF00",
    2: "F30CBF00",
    3: "F20DBF00",
    4: "F10EBF00",
    5: "F00FBF00",
    6: "FE01BF00",
    7: "EE11BF00",
    8: "ED12BF00",
    9: "EC13BF00",
    CLEAR: "FA05BF00",
    SELECT: "BD42BF00",
    A: "BF40BF00",
    B: "E01FBF00",
    C: "FF00BF00",
    D: "BE41BF00",
  };

  /**
   * Press a remote button by name.
   *
   * @param {string} button - Button name (e.g. "POWER", "UP")
   * @returns {Promise<object>} Command result
   */
  async pressButton(button) {
    const irCode = DunePlayer.IR_CODES[button.toUpperCase()];
    if (!irCode) {
      throw new Error(`Unknown button: ${button}`);
    }
    return this.sendCommand("ir_code", { ir_code: irCode });
  }

  // ── Convenience button methods ───────────────────────────────────────────

  /** @returns {Promise<object>} Command result */ async power() {
    return this.pressButton("POWER");
  }
  /** @returns {Promise<object>} Command result */ async up() {
    return this.pressButton("UP");
  }
  /** @returns {Promise<object>} Command result */ async down() {
    return this.pressButton("DOWN");
  }
  /** @returns {Promise<object>} Command result */ async left() {
    return this.pressButton("LEFT");
  }
  /** @returns {Promise<object>} Command result */ async right() {
    return this.pressButton("RIGHT");
  }
  /** @returns {Promise<object>} Command result */ async ok() {
    return this.pressButton("ENTER");
  }
  /** @returns {Promise<object>} Command result */ async back() {
    return this.pressButton("RETURN");
  }
  /** @returns {Promise<object>} Command result */ async menu() {
    return this.pressButton("TOP_MENU");
  }
  /** @returns {Promise<object>} Command result */ async popupMenu() {
    return this.pressButton("POP_UP_MENU");
  }
  /** @returns {Promise<object>} Command result */ async mute() {
    return this.pressButton("MUTE");
  }
  /** @returns {Promise<object>} Command result */ async audio() {
    return this.pressButton("AUDIO");
  }
  /** @returns {Promise<object>} Command result */ async subtitle() {
    return this.pressButton("SUBTITLE");
  }
  /** @returns {Promise<object>} Command result */ async volumeUp() {
    return this.pressButton("V_UP");
  }
  /** @returns {Promise<object>} Command result */ async volumeDown() {
    return this.pressButton("V_DOWN");
  }

  /**
   * Press a number button (0-9).
   *
   * @param {number} n - Digit 0-9
   * @returns {Promise<object>} Command result
   */
  async number(n) {
    return this.pressButton(String(n));
  }

  // ── Playback control (use API commands, not IR) ──────────────────────────

  /** @returns {Promise<object>} Command result */ async play() {
    return this.setPlaybackState({ speed: 256 });
  }
  /** @returns {Promise<object>} Command result */ async pause() {
    return this.setPlaybackState({ speed: 0 });
  }
  /** @returns {Promise<object>} Command result */ async stop() {
    return this.playbackAction("stop");
  }
  /** @returns {Promise<object>} Command result */ async rewind() {
    return this.setPlaybackState({ speed: -512 });
  }
  /** @returns {Promise<object>} Command result */ async forward() {
    return this.setPlaybackState({ speed: 512 });
  }

  // ── Playback control ─────────────────────────────────────────────────────

  /**
   * Set playback state with parameters.
   *
   * @param {object} params - Playback parameters (speed, position, volume, etc.)
   * @returns {Promise<object>} Command result
   */
  async setPlaybackState(params = {}) {
    return this.sendCommand("set_playback_state", params);
  }

  /** @returns {Promise<object>} Command result */ async pausePlayback() {
    return this.setPlaybackState({ speed: 0 });
  }
  /** @returns {Promise<object>} Command result */ async resumePlayback() {
    return this.setPlaybackState({ speed: 256 });
  }

  /**
   * Seek to position.
   *
   * @param {number} seconds - Position in seconds
   * @returns {Promise<object>} Command result
   */
  async seek(seconds) {
    return this.setPlaybackState({ position: seconds });
  }

  /**
   * Set volume 0-100 (Android models, protocol v2+).
   *
   * @param {number} level - Volume level 0-100
   * @returns {Promise<object>} Command result
   */
  async setVolume(level) {
    return this.setPlaybackState({ volume: Math.max(0, Math.min(100, level)) });
  }

  // ── Status & navigation ──────────────────────────────────────────────────

  /**
   * Get player status.
   *
   * @param {boolean} useJson - Request JSON response format
   * @returns {Promise<object>} Status object
   */
  async getStatus(useJson = true) {
    return this.sendCommand("status", useJson ? { result_syntax: "json" } : {});
  }

  /** @returns {Promise<object>} Command result */ async mainScreen() {
    return this.sendCommand("main_screen");
  }
  /** @returns {Promise<object>} Command result */ async blackScreen() {
    return this.sendCommand("black_screen");
  }
  /** @returns {Promise<object>} Command result */ async standby() {
    return this.sendCommand("standby");
  }

  // ── Media playback ───────────────────────────────────────────────────────

  /**
   * Start file playback.
   *
   * @param {string} url - Media URL
   * @param {object} options - Additional playback options
   * @returns {Promise<object>} Command result
   */
  async playFile(url, options = {}) {
    return this.sendCommand("start_file_playback", {
      media_url: url,
      ...options,
    });
  }

  /**
   * Launch media URL.
   *
   * @param {string} url - Media URL to launch
   * @returns {Promise<object>} Command result
   */
  async launchMediaUrl(url) {
    return this.sendCommand("launch_media_url", { media_url: url });
  }

  /**
   * Execute a playback action.
   *
   * @param {string} action - Action name (stop, prev, next, etc.)
   * @returns {Promise<object>} Command result
   */
  async playbackAction(action) {
    return this.sendCommand("playback_action", { action });
  }

  // ── Navigation paths ─────────────────────────────────────────────────────

  /**
   * Open a path on the player.
   *
   * @param {string} path - Path to open
   * @returns {Promise<object>} Command result
   */
  async openPath(path) {
    return this.sendCommand("open_path", { url: path });
  }

  /** @returns {Promise<object>} Command result */ async openApplications() {
    return this.openPath("root://applications");
  }
  /** @returns {Promise<object>} Command result */ async openSetup() {
    return this.openPath("root://setup");
  }
  /** @returns {Promise<object>} Command result */ async openFavorites() {
    return this.openPath("root://favorites");
  }
  /** @returns {Promise<object>} Command result */ async openSources() {
    return this.openPath("root://sources");
  }

  // ── Connection test ──────────────────────────────────────────────────────

  /**
   * Test connection to the player.
   *
   * @returns {Promise<{success: boolean, status?: object, error?: string}>} Test result
   */
  async testConnection() {
    try {
      const status = await this.getStatus();
      return { success: status.command_status === "ok", status };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = DunePlayer;
