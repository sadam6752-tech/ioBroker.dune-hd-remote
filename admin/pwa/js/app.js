'use strict';

// ── Theme ──────────────────────────────────────────────────────────────────
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pwa_theme', theme);
    const cb = document.getElementById('themeToggle');
    if (cb) cb.checked = (theme === 'light');
}

function initTheme() {
    const saved = localStorage.getItem('pwa_theme') || 'dark';
    applyTheme(saved);
}

// ── Toast ──────────────────────────────────────────────────────────────────
let _toastTimer = null;
function toast(msg, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.background = isError ? '#c62828' : '#333';
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

// ── Tabs ───────────────────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${target}`).classList.add('active');
        });
    });
}

// ── Command helper ─────────────────────────────────────────────────────────
async function cmd(command, params = {}) {
    try {
        await API.send(command, params);
    } catch (e) {
        toast(e.message, true);
    }
}

async function ir(irCode) {
    return cmd('ir_code', { ir_code: irCode });
}

// IR code map (same as dune-player.js)
const IR = {
    POWER:       'BC43BF00',
    UP:          'EA15BF00',
    DOWN:        'E916BF00',
    LEFT:        'E817BF00',
    RIGHT:       'E718BF00',
    ENTER:       'EB14BF00',
    RETURN:      'FB04BF00',
    TOP_MENU:    'AE51BF00',
    POP_UP_MENU: 'F807BF00',
    MUTE:        'B946BF00',
    V_UP:        'AD52BF00',
    V_DOWN:      'AC53BF00',
    PLAY:        'B54ABF00',
    PAUSE:       'B649BF00',
    STOP:        'B748BF00',
    FF:          'B34CBF00',
    REW:         'B44BBF00',
    AUDIO:       'BB44BF00',
    SUBTITLE:    'BA45BF00',
    INFO:        'E11EBF00',
    ZOOM:        'A35CBF00',
    ANGLE:       'A45BBF00',
    AB:          'A55ABF00',
    REPEAT:      'A659BF00',
    EJECT:       'A758BF00',
    '0': 'EF10BF00',
    '1': 'F00FBF00',
    '2': 'F10EBF00',
    '3': 'F20DBF00',
    '4': 'F30CBF00',
    '5': 'F40BBF00',
    '6': 'F50ABF00',
    '7': 'EE11BF00',
    '8': 'F708BF00',
    '9': 'F807BF00',
    // Color buttons (A/B/C/D)
    RED:    'E31CBF00',
    GREEN:  'E21DBF00',
    YELLOW: 'E11EBF00',
    BLUE:   'E01FBF00',
};

// ── Button wiring ──────────────────────────────────────────────────────────
function wire(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', action);
}

function wireIR(id, irKey) {
    wire(id, () => ir(IR[irKey]));
}

function initButtons() {
    // Main tab — top row
    wireIR('btn-mute',      'MUTE');
    wireIR('btn-audio',     'AUDIO');
    wireIR('btn-power',     'POWER');

    // D-pad
    wireIR('btn-up',        'UP');
    wireIR('btn-down',      'DOWN');
    wireIR('btn-left',      'LEFT');
    wireIR('btn-right',     'RIGHT');
    wireIR('btn-enter',     'ENTER');

    // Side buttons
    wireIR('btn-info',      'INFO');
    wireIR('btn-popup',     'POP_UP_MENU');
    wireIR('btn-return',    'RETURN');
    wireIR('btn-topmenu',   'TOP_MENU');

    // Playback row 1
    wireIR('btn-play',      'PLAY');
    wireIR('btn-pause',     'PAUSE');
    wireIR('btn-prev',      'REW');
    wireIR('btn-next',      'FF');

    // Playback row 2
    wireIR('btn-stop',      'STOP');
    wireIR('btn-slow',      'AB');
    wireIR('btn-rew',       'REW');
    wireIR('btn-ff',        'FF');

    // Digits tab — color buttons
    wireIR('btn-a',         'RED');
    wireIR('btn-b',         'GREEN');
    wireIR('btn-c',         'YELLOW');
    wireIR('btn-d',         'BLUE');

    // Digits 0-9
    for (let i = 0; i <= 9; i++) {
        wireIR(`btn-${i}`, String(i));
    }

    // Other tab
    wireIR('btn-subtitle',  'SUBTITLE');
    wireIR('btn-zoom',      'ZOOM');
    wireIR('btn-angle',     'ANGLE');
    wireIR('btn-repeat',    'REPEAT');
    wireIR('btn-eject',     'EJECT');

    // Volume
    wire('btn-vol-up',   () => ir(IR.V_UP));
    wire('btn-vol-down', () => ir(IR.V_DOWN));
}

// ── Settings ───────────────────────────────────────────────────────────────
function initSettings() {
    // Load saved values
    const hostEl = document.getElementById('set-host');
    const portEl = document.getElementById('set-port');
    if (hostEl) hostEl.value = localStorage.getItem('pwa_host') || window.location.hostname;
    if (portEl) portEl.value = localStorage.getItem('pwa_port') || window.location.port || '8765';

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            applyTheme(themeToggle.checked ? 'light' : 'dark');
        });
    }

    const saveBtn = document.getElementById('settings-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (hostEl) localStorage.setItem('pwa_host', hostEl.value.trim());
            if (portEl) localStorage.setItem('pwa_port', portEl.value.trim());
            toast('Settings saved');
        });
    }
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();
    initButtons();
    initSettings();
});
