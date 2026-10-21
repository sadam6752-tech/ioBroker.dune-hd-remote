'use strict';

const assert = require('node:assert');
const http = require('node:http');
const PwaServer = require('../../lib/pwa-server');

/**
 * GET a path from a local server.
 *
 * @param {number} port - Server port
 * @param {string} path - Request path
 * @returns {Promise<{status: number, body: string}>} Status and body
 */
function get(port, path) {
    return new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port, path }, res => {
            let body = '';
            res.on('data', chunk => (body += chunk));
            res.on('end', () => resolve({ status: res.statusCode, body }));
        }).on('error', reject);
    });
}

/**
 * Start a fake player that answers with the given handler.
 *
 * @param {http.RequestListener} handler - Request handler
 * @returns {Promise<http.Server>} Listening server
 */
function fakePlayer(handler) {
    return new Promise(resolve => {
        const server = http.createServer(handler);
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

describe('PwaServer', () => {
    let player;
    let pwa;
    let pwaPort;
    let uncaught;
    const onUncaught = err => (uncaught = err);

    beforeEach(() => {
        uncaught = null;
        process.on('uncaughtException', onUncaught);
    });

    afterEach(async () => {
        process.removeListener('uncaughtException', onUncaught);
        if (pwa) {
            await pwa.stop();
            pwa = null;
        }
        if (player) {
            player.closeAllConnections();
            await new Promise(resolve => player.close(() => resolve()));
            player = null;
        }
    });

    /**
     * Start the PWA server in front of the fake player.
     *
     * @param {number} timeout - Player timeout in ms
     */
    async function startPwa(timeout = 1000) {
        pwaPort = 18700 + Math.floor(Math.random() * 200);
        pwa = new PwaServer({
            playerIp: '127.0.0.1',
            playerPort: player.address().port,
            playerTimeout: timeout,
            pwaPort,
            bindIp: '127.0.0.1',
            log: () => {},
        });
        await pwa.start();
    }

    it('proxies a command and returns the parsed XML response', async () => {
        player = await fakePlayer((req, res) => {
            assert.ok(req.url.startsWith('/cgi-bin/do?cmd=status'));
            res.end('<command_result><param name="player_state" value="navigator"/></command_result>');
        });
        await startPwa();
        const r = await get(pwaPort, '/api/command?cmd=status');
        assert.strictEqual(r.status, 200);
        assert.deepStrictEqual(JSON.parse(r.body), { command_status: 'ok', player_state: 'navigator' });
    });

    it('answers 504 once and does not crash when the player does not answer in time', async () => {
        player = await fakePlayer(() => {
            /* never answers */
        });
        await startPwa(300);
        const r = await get(pwaPort, '/api/command?cmd=status');
        assert.strictEqual(r.status, 504);
        // give the destroyed request time to emit its 'error' event
        await new Promise(resolve => setTimeout(resolve, 300));
        assert.strictEqual(uncaught, null, uncaught && uncaught.message);
    });

    it('answers 400 without cmd', async () => {
        player = await fakePlayer((req, res) => res.end(''));
        await startPwa();
        const r = await get(pwaPort, '/api/command');
        assert.strictEqual(r.status, 400);
    });

    it('serves index.html for the root path', async () => {
        player = await fakePlayer((req, res) => res.end(''));
        await startPwa();
        const r = await get(pwaPort, '/');
        assert.strictEqual(r.status, 200);
        assert.ok(r.body.includes('<html') || r.body.includes('<!DOCTYPE'));
    });
});
