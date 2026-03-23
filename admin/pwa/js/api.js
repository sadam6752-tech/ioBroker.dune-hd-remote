'use strict';

/**
 * API — sends commands to the Dune HD player via the adapter's proxy endpoint.
 * Base URL is auto-detected from window.location (same host, configured port).
 */
const API = (() => {
    function getBase() {
        // Settings may override host/port stored in localStorage
        const host = localStorage.getItem('pwa_host') || window.location.hostname;
        const port = localStorage.getItem('pwa_port') || window.location.port || 80;
        return `http://${host}:${port}`;
    }

    /**
     * Send a command through the adapter proxy.
     * @param {string} cmd
     * @param {object} params
     * @returns {Promise<object>}
     */
    async function send(cmd, params = {}) {
        const qs = new URLSearchParams({ cmd, ...params }).toString();
        const url = `${getBase()}/api/command?${qs}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    return { send };
})();
