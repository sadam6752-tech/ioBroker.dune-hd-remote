'use strict';

const assert = require('node:assert');
const http = require('node:http');
const DunePlayer = require('../../lib/dune-player');

describe('DunePlayer transport keys', () => {
    let server;
    let player;
    let androidApp;
    let requests;

    beforeEach(async () => {
        androidApp = '0';
        requests = [];
        server = http.createServer((req, res) => {
            const q = new URL(req.url, 'http://x').searchParams;
            requests.push(Object.fromEntries(q));
            res.end(
                `<command_result><param name="android_app_active" value="${androidApp}"/></command_result>`,
            );
        });
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        player = new DunePlayer('127.0.0.1', server.address().port, 1000);
    });

    afterEach(async () => {
        server.closeAllConnections();
        await new Promise(resolve => server.close(() => resolve()));
    });

    const commands = () => requests.filter(r => r.cmd !== 'status');

    it('uses the native API commands while the Dune player itself is active', async () => {
        await player.play();
        await player.stop();
        await player.rewind();
        assert.deepStrictEqual(
            commands().map(r => r.cmd),
            ['set_playback_state', 'playback_action', 'set_playback_state'],
        );
    });

    it('sends the transport IR codes while an Android app is active', async () => {
        androidApp = '1';
        await player.play();
        await player.pause();
        await player.stop();
        await player.prev();
        await player.next();
        await player.rewind();
        await player.forward();
        assert.deepStrictEqual(
            commands().map(r => r.ir_code),
            ['B748BF00', 'E11EBF00', 'E619BF00', 'B649BF00', 'E21DBF00', 'E31CBF00', 'E41BBF00'],
        );
        assert.ok(commands().every(r => r.cmd === 'ir_code'));
    });

    it('falls back to the native commands when the status cannot be read', async () => {
        await new Promise(resolve => server.close(() => resolve()));
        const dead = new DunePlayer('127.0.0.1', server.address ? 9 : 9, 500);
        assert.strictEqual(await dead.isAndroidAppActive(), false);
        server = http.createServer();
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    });
});
