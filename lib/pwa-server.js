"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const PWA_DIR = path.join(__dirname, "..", "admin", "pwa");

/**
 * Minimal HTTP server that:
 *  - serves static files from admin/pwa/
 *  - proxies /api/command?cmd=...&params to the Dune HD player
 */
class PwaServer {
  /**
   * @param {object} opts - Server options
   * @param {string}   opts.playerIp - Player IP address
   * @param {number}   opts.playerPort - Player HTTP port
   * @param {number}   opts.playerTimeout - Request timeout in ms
   * @param {number}   opts.pwaPort - PWA server port
   * @param {Function} opts.log - Logger function (level, msg) => void
   */
  constructor(opts) {
    this.playerIp = opts.playerIp;
    this.playerPort = opts.playerPort || 80;
    this.playerTimeout = opts.playerTimeout || 5000;
    this.pwaPort = opts.pwaPort || 8765;
    this.bindIp = opts.bindIp || "0.0.0.0";
    this.log = opts.log || (() => {});
    this._server = null;
  }

  /**
   * Start the PWA HTTP server.
   *
   * @returns {Promise<string>} Display host string
   */
  start() {
    return new Promise((resolve, reject) => {
      this._server = http.createServer((req, res) => this._handle(req, res));
      this._server.on("error", reject);
      this._server.listen(this.pwaPort, this.bindIp, () => {
        const displayHost =
          this.bindIp === "0.0.0.0" ? "<iobroker-host>" : this.bindIp;
        this.log(
          "info",
          `PWA server listening on ${this.bindIp}:${this.pwaPort}`,
        );
        resolve(displayHost);
      });
    });
  }

  /**
   * Stop the PWA HTTP server.
   *
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve) => {
      if (!this._server) {
        return resolve();
      }
      this._server.close(() => resolve());
      this._server = null;
    });
  }

  // ── Request router ───────────────────────────────────────────────────────

  /**
   * Handle incoming HTTP request.
   *
   * @param {object} req - HTTP request
   * @param {object} res - HTTP response
   */
  _handle(req, res) {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === "/api/command") {
      this._proxyCommand(parsed.query, res);
    } else {
      this._serveStatic(pathname, res);
    }
  }

  // ── Proxy to player ──────────────────────────────────────────────────────

  /**
   * Proxy command to Dune HD player.
   *
   * @param {object} query - Parsed query parameters
   * @param {object} res - HTTP response
   */
  _proxyCommand(query, res) {
    const { cmd, ...rest } = query;
    if (!cmd) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "missing cmd" }));
      return;
    }

    const qs = new URLSearchParams({ cmd, ...rest }).toString();
    const playerPath = `/cgi-bin/do?${qs}`;

    const proxyReq = http.request(
      {
        hostname: this.playerIp,
        port: this.playerPort,
        path: playerPath,
        method: "GET",
        timeout: this.playerTimeout,
      },
      (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          try {
            const parsedData = this._parseResponse(data.trim());
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(parsedData));
          } catch {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ raw: data.trim() }));
          }
        });
      },
    );

    proxyReq.on("error", (err) => {
      this.log("warn", `PWA proxy error: ${err.message}`);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      res.writeHead(504, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "timeout" }));
    });

    proxyReq.end();
  }

  /**
   * Parse player response (XML, JSON or key=value text).
   *
   * @param {string} text - Raw response text
   * @returns {object} Parsed response object
   */
  _parseResponse(text) {
    if (text.startsWith("<")) {
      const result = {};
      if (text.includes("<command_result")) {
        result.command_status = "ok";
      }
      const re = /<param\s+name="([^"]+)"\s+value="([^"]*)"/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        result[m[1]] = m[2];
      }
      return result;
    }
    if (text.startsWith("{")) {
      return JSON.parse(text);
    }
    const result = {};
    for (const line of text.split("\n")) {
      const idx = line.indexOf("=");
      if (idx > 0) {
        result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    return result;
  }

  // ── Static file server ───────────────────────────────────────────────────

  /**
   * Serve static file from PWA directory.
   *
   * @param {string} pathname - URL pathname
   * @param {object} res - HTTP response
   */
  _serveStatic(pathname, res) {
    let filePath = pathname === "/" ? "/index.html" : pathname;
    filePath = path.join(PWA_DIR, filePath.replace(/\.\./g, ""));

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(PWA_DIR, "index.html"), (err2, html) => {
          if (err2) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          res.end(html);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(data);
    });
  }
}

module.exports = PwaServer;
