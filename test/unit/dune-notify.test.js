'use strict';

const assert = require('node:assert');
const DuneNotify = require('../../lib/dune-notify');

describe('DuneNotify', () => {
    let notify;

    beforeEach(() => {
        notify = new DuneNotify({
            playerIp: '192.168.1.120',
            playerPort: 80,
            timeout: 1000,
            log: () => {},
        });
    });

    it('should instantiate with correct properties', () => {
        assert.strictEqual(notify.playerIp, '192.168.1.120');
        assert.strictEqual(notify.playerPort, 80);
        assert.strictEqual(notify.timeout, 1000);
    });

    it('show() should return error when text is missing', async () => {
        const result = await notify.show({});
        assert.strictEqual(result.status, 'error');
        assert.ok(result.message.includes('text'));
    });

    it('show() should return error on connection refused', async () => {
        // No real player — expect network error
        const result = await notify.show({ text: 'Test', title: 'ioBroker' });
        assert.strictEqual(result.status, 'error');
    });

    it('hide() should return error on connection refused', async () => {
        const result = await notify.hide();
        assert.strictEqual(result.status, 'error');
    });

    it('status() should return error on connection refused', async () => {
        const result = await notify.status();
        assert.strictEqual(result.status, 'error');
    });
});
