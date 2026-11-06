'use strict';

const assert = require('node:assert/strict');
const { registryOf, tcpPayload, checkTcpPort, registerTcpPort } = require('../../lib/used-resources');

/**
 * @param {object} [opts] - Behaviour of the fake controller
 * @param {boolean} [opts.feature] - Controller has the registry
 * @param {Array<{instance: string}>} [opts.held] - Answer of checkUsedResource
 * @param {Error} [opts.fail] - Every registry call rejects with it
 * @returns {any} Fake adapter recording its calls
 */
function fakeAdapter({ feature = true, held = [], fail } = {}) {
    const a = {
        calls: [],
        logs: [],
        log: {
            warn: m => a.logs.push(['warn', m]),
            debug: m => a.logs.push(['debug', m]),
        },
        supportsFeature: f => feature && f === 'CONTROLLER_USED_RESOURCES',
        checkUsedResource: async (type, data) => {
            a.calls.push(['check', type, data]);
            if (fail) {
                throw fail;
            }
            return held;
        },
        registerUsedResource: async (type, data) => {
            a.calls.push(['register', type, data]);
            if (fail) {
                throw fail;
            }
        },
    };
    return a;
}

describe('used-resources', () => {
    it('finds no registry on an old controller', () => {
        assert.equal(registryOf(fakeAdapter({ feature: false })), null);
        assert.equal(registryOf({}), null);
        assert.equal(registryOf(null), null);
    });

    it('names the bind address only when there is one', () => {
        assert.deepEqual(tcpPayload(8080), { port: 8080 });
        assert.deepEqual(tcpPayload(8080, ''), { port: 8080 });
        assert.deepEqual(tcpPayload(8080, '0.0.0.0'), { port: 8080, bind: '0.0.0.0' });
    });

    it('does nothing without registry', async () => {
        const a = fakeAdapter({ feature: false });
        assert.deepEqual(await checkTcpPort(a, 8080, '0.0.0.0'), []);
        assert.equal(await registerTcpPort(a, 8080, '0.0.0.0'), false);
        assert.deepEqual(a.calls, []);
    });

    it('registers the port with its address', async () => {
        const a = fakeAdapter();
        assert.equal(await registerTcpPort(a, 8080, '192.168.1.5'), true);
        assert.deepEqual(a.calls, [['register', 'tcpPort', { port: 8080, bind: '192.168.1.5' }]]);
    });

    it('warns once per instance that holds the port', async () => {
        const a = fakeAdapter({ held: [{ instance: 'web.0' }, { instance: 'web.0' }, { instance: 'mqtt.0' }] });
        assert.deepEqual(await checkTcpPort(a, 8080, '', 'Webhook'), ['web.0', 'mqtt.0']);
        assert.deepEqual(a.calls, [['check', 'tcpPort', { port: 8080 }]]);
        assert.deepEqual(a.logs, [['warn', 'Webhook: TCP port 8080 is already used by web.0, mqtt.0']]);
    });

    it('stays quiet when the port is free', async () => {
        const a = fakeAdapter();
        assert.deepEqual(await checkTcpPort(a, 8080), []);
        assert.deepEqual(a.logs, []);
    });

    it('never throws when the controller refuses', async () => {
        const a = fakeAdapter({ fail: new Error('Timeout exceeded') });
        assert.deepEqual(await checkTcpPort(a, 8080), []);
        assert.equal(await registerTcpPort(a, 8080), false);
        assert.equal(a.logs.length, 2);
        assert.ok(a.logs.every(([level]) => level === 'debug'));
    });

    it('skips an unset port', async () => {
        const a = fakeAdapter();
        assert.equal(await registerTcpPort(a, 0), false);
        assert.deepEqual(await checkTcpPort(a, NaN), []);
        assert.deepEqual(a.calls, []);
    });
});
