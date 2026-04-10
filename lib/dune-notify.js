"use strict";

const http = require("node:http");

/**
 * DuneNotify — client for the dune-notify PHP plugin.
 *
 * Sends HTTP requests to the plugin's CGI endpoint on the player:
 *   http://<playerIp>/cgi-bin/plugins/dune-notify/api.php
 */
class DuneNotify {
  /**
   * @param {object} opts - Constructor options
   * @param {string}   opts.playerIp   - Player IP address
   * @param {number}   opts.playerPort - Player HTTP port (default 80)
   * @param {number}   opts.timeout    - Request timeout ms (default 3000)
   * @param {Function} opts.log        - Logger (level, msg) => void
   */
  constructor(opts) {
    this.playerIp = opts.playerIp;
    this.playerPort = opts.playerPort || 80;
    this.timeout = opts.timeout || 3000;
    this.log = opts.log || (() => {});
  }

  /**
   * Show a notification on the player screen.
   *
   * @param {object} params - Notification parameters
   * @param {string}  params.text     - Notification text (required)
   * @param {string}  [params.title]  - Title (optional)
   * @param {number}  [params.duration] - Display duration in seconds (default 5)
   * @param {string}  [params.icon]   - Icon type: info|warning|error|bell|home or HTTP URL
   * @returns {Promise<{status: string, message: string}>} Plugin response
   */
  async show(params) {
    if (!params.text) {
      return { status: "error", message: "text is required" };
    }
    const query = new URLSearchParams({
      cmd: "show",
      text: params.text,
      title: params.title || "",
      duration: String(params.duration || 5),
      icon: params.icon || "info",
    });
    return this._request(query.toString());
  }

  /**
   * Hide the current notification.
   *
   * @returns {Promise<{status: string, message: string}>} Plugin response
   */
  async hide() {
    return this._request("cmd=hide");
  }

  /**
   * Get current notification status from the plugin.
   *
   * @returns {Promise<{status: string, active: boolean, current: object|null}>} Plugin status
   */
  async status() {
    return this._request("cmd=status");
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /**
   * Send HTTP request to the dune-notify plugin API.
   *
   * @param {string} queryString - URL query string
   * @returns {Promise<object>} Parsed JSON response
   */
  _request(queryString) {
    return new Promise((resolve) => {
      const path = `/cgi-bin/plugins/dune-notify/api.php?${queryString}`;

      const req = http.request(
        {
          hostname: this.playerIp,
          port: this.playerPort,
          path,
          method: "GET",
          timeout: this.timeout,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ status: "error", message: "Invalid JSON response" });
            }
          });
        },
      );

      req.on("error", (err) => {
        this.log("warn", `dune-notify: request failed: ${err.message}`);
        resolve({ status: "error", message: err.message });
      });

      req.on("timeout", () => {
        req.destroy();
        this.log("warn", "dune-notify: request timeout");
        resolve({ status: "error", message: "timeout" });
      });

      req.end();
    });
  }
}

module.exports = DuneNotify;
