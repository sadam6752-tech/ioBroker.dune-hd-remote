'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
    '.svg':  'image/svg+xml',
    '.webp': 'image/webp',
};

const PWA_DIR = path.join(__dirname, '..', 'admin', 'pwa');

/**
 * Minimal HTTP server that:
 *  - serves static files from admin/pwa/
 *  - proxies /api/command?cmd=...&params to the Dune HD player
 */
class PwaServer {
    /**
     * @param {object} opts
     * @param {string}   opts.playerIp
     * @param {number}   opts.playerPort
     * @param {number}   opts.playerTimeout
     * @param {number}   opts.pwaPort
     * @param {Function} opts.log  - (level, msg) => void
     */
    constructor(opts) {
        this.playerIp      = opts.playerIp;
        this.playerPort    = opts.playerPort    || 80;
        this.playerTimeout = opts.playerTimeout || 5000;
        this.pwaPort       = opts.pwaPort       || 8765;
        this.log           = opts.log || (() => {});
        this._server       = null;
    }

    start() {
        return new Promise((resolve, reject) => {
            this._server = http.createServer((req, res) => this._handle(req, res));
            this._server.on('error', reject);
            this._server.listen(this.pwaPort, () => {
                this.log('info', `PWA server listening on port ${this.pwaPort}`);
                resolve();
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (!this._server) return resolve();
            this._server.close(() => resolve());
            this._server = null;
        });
    }

    // ── Request router ───────────────────────────────────────────────────────

    _handle(req, res) {
        const parsed = url.parse(req.url, true);
        const pathname = parsed.pathname;

        // CORS headers — allow any origin (local network use)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (pathname === '/api/command') {
            this._proxyCommand(parsed.query, res);
        } else {
            this._serveStatic(pathname, res);
        }
    }

    // ── Proxy to player ──────────────────────────────────────────────────────

    _proxyCommand(query, res) {
        const { cmd, ...rest } = query;
        if (!cmd) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'missing cmd' }));
            return;
        }

        const qs = new URLSearchParams({ cmd, ...rest }).toString();
        const playerPath = `/cgi-bin/do?${qs}`;

        const proxyReq = http.request(
            {
                hostname: this.playerIp,
                port:     this.playerPort,
                path:     playerPath,
                method:   'GET',
                timeout:  this.playerTimeout,
            },
            (proxyRes) => {
                let data = '';
                proxyRes.on('data', (chunk) => (data += chunk));
                proxyRes.on('end', () => {
                    try {
                        const parsed = this._parseResponse(data.trim());
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(parsed));
                    } catch {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ raw: data.trim() }));
                    }
                });
            },
        );

        proxyReq.on('error', (err) => {
            this.log('warn', `PWA proxy error: ${err.message}`);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'timeout' }));
        });

        proxyReq.end();
    }

    _parseResponse(text) {
        if (text.startsWith('<')) {
            const result = {};
            if (text.includes('<command_result')) result.command_status = 'ok';
            const re = /<param\s+name="([^"]+)"\s+value="([^"]*)"/g;
            let m;
            while ((m = re.exec(text)) !== null) result[m[1]] = m[2];
            return result;
        }
        if (text.startsWith('{')) return JSON.parse(text);
        // key=value
        const result = {};
        for (const line of text.split('\n')) {
            const idx = line.indexOf('=');
            if (idx > 0) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
        return result;
    }

    // ── Static file server ───────────────────────────────────────────────────

    _serveStatic(pathname, res) {
        // Default to index.html
        let filePath = pathname === '/' ? '/index.html' : pathname;
        filePath = path.join(PWA_DIR, filePath.replace(/\.\./g, ''));

        fs.readFile(filePath, (err, data) => {
            if (err) {
                // Fallback to index.html for SPA routing
                fs.readFile(path.join(PWA_DIR, 'index.html'), (err2, html) => {
                    if (err2) {
                        res.writeHead(404);
                        res.end('Not found');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': MIME['.html'] });
                    res.end(html);
                });
                return;
            }
            const ext  = path.extname(filePath).toLowerCase();
            const mime = MIME[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        });
    }
}

module.exports = PwaServer;
