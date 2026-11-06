'use strict';

/**
 * The used resources registry of js-controller (doc/used-resources.md in ioBroker.js-controller): an instance
 * declares the ports it listens on, so the admin can show which ones are taken. Older controllers do not have
 * it; every call is then a no-op. A failing call is logged at debug level and never stops the adapter.
 */

/**
 * @param {unknown} adapter - Adapter instance
 * @returns {{
 *     checkUsedResource: (type: string, data: object) => Promise<Array<{instance: string}>>,
 *     registerUsedResource: (type: string, data: object) => Promise<void>,
 *     log: {warn: (msg: string) => void, debug: (msg: string) => void},
 * } | null} The adapter when its controller has the registry, else null
 */
function registryOf(adapter) {
    // the registry calls are missing in the typings of older controllers
    const api = adapter ? Object(adapter) : null;
    try {
        return typeof api?.supportsFeature === 'function' && api.supportsFeature('CONTROLLER_USED_RESOURCES')
            ? api
            : null;
    } catch {
        return null;
    }
}

/**
 * @param {number} port - TCP port
 * @param {string} [bind] - Listen address, empty = not named
 * @returns {{port: number, bind?: string}} Payload of a tcpPort entry
 */
function tcpPayload(port, bind) {
    return bind ? { port, bind } : { port };
}

/**
 * Warns when another running instance declares the TCP port. Call it before listening.
 *
 * @param {unknown} adapter - Adapter instance
 * @param {number} port - TCP port
 * @param {string} [bind] - Listen address
 * @param {string} [what] - What the port is for (log)
 * @returns {Promise<string[]>} Instances holding the port (empty without registry)
 */
async function checkTcpPort(adapter, port, bind, what = 'Server') {
    const reg = registryOf(adapter);
    if (!reg || !(port > 0)) {
        return [];
    }
    try {
        const held = await reg.checkUsedResource('tcpPort', tcpPayload(port, bind));
        const instances = [...new Set((held || []).map(entry => entry.instance))];
        if (instances.length) {
            reg.log.warn(`${what}: TCP port ${port} is already used by ${instances.join(', ')}`);
        }
        return instances;
    } catch (e) {
        reg.log.debug(`Used resources: check of TCP port ${port} failed: ${e.message}`);
        return [];
    }
}

/**
 * Registers a TCP port this instance listens on. Call it once the server is listening.
 *
 * @param {unknown} adapter - Adapter instance
 * @param {number} port - TCP port
 * @param {string} [bind] - Listen address
 * @returns {Promise<boolean>} Registered
 */
async function registerTcpPort(adapter, port, bind) {
    const reg = registryOf(adapter);
    if (!reg || !(port > 0)) {
        return false;
    }
    try {
        await reg.registerUsedResource('tcpPort', tcpPayload(port, bind));
        return true;
    } catch (e) {
        reg.log.debug(`Used resources: TCP port ${port} not registered: ${e.message}`);
        return false;
    }
}

module.exports = { registryOf, tcpPayload, checkTcpPort, registerTcpPort };
