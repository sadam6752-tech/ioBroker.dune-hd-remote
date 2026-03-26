'use strict';

// Theme
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

// Toast
let _toastTimer = null;
function toast(msg, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.background = isError ? '#c62828' : '#333';
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

// Tabs
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + target).classList.add('active');
        });
    });
}

// API helpers
async function cmd(command, params) {
    params = params || {};
    try {
        await API.send(command, params);
    } catch (e) {
        toast(e.message, true);
    }
}
async function ir(irCode) {
    return cmd('ir_code', { ir_code: irCode });
}

// IR code map — source: https://dune-hd.com/support/rc
// Format: 00 BF XX YY -> IP Control = YY XX BF 00
const IR = {
    POWER:       'BC43BF00',
    UP:          'EA15BF00',
    DOWN:        'E916BF00',
    LEFT:        'E817BF00',
    RIGHT:       'E718BF00',
    ENTER:       'EB14BF00',
    RETURN:      'FB04BF00',
    INFO:        'AF50BF00',
    POP_UP_MENU: 'F807BF00',
    TOP_MENU:    'AE51BF00',
    MUTE:        'B946BF00',
    V_UP:        'AD52BF00',
    V_DOWN:      'AC53BF00',
    AUDIO:       'BB44BF00',
    SUBTITLE:    'AB54BF00',
    REWIND:      'E31CBF00',
    FORWARD:     'E41BBF00',
    ZOOM:        'FD02BF00',
    EJECT:       'EF10BF00',
    REC:         '9F60BF00',
    '0': 'F50ABF00',
    '1': 'F40BBF00',
    '2': 'F30CBF00',
    '3': 'F20DBF00',
    '4': 'F10EBF00',
    '5': 'F00FBF00',
    '6': 'FE01BF00',
    '7': 'EE11BF00',
    '8': 'ED12BF00',
    '9': 'EC13BF00',
    CLEAR:  'FA05BF00',
    SELECT: 'BD42BF00',
    A: 'BF40BF00',
    B: 'E01FBF00',
    C: 'FF00BF00',
    D: 'BE41BF00',
};

// Button wiring
function wire(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', action);
}
function wireIR(id, irKey) {
    wire(id, () => ir(IR[irKey]));
}

function initButtons() {
    // Main — top row
    wireIR('btn-info',    'INFO');
    wireIR('btn-power',   'POWER');
    wireIR('btn-popup',   'POP_UP_MENU');

    // D-pad
    wireIR('btn-up',    'UP');
    wireIR('btn-down',  'DOWN');
    wireIR('btn-left',  'LEFT');
    wireIR('btn-right', 'RIGHT');
    wireIR('btn-enter', 'ENTER');

    // Side
    wireIR('btn-return',  'RETURN');
    wireIR('btn-topmenu', 'TOP_MENU');

    // Playback row 1
    wire('btn-play',  () => cmd('set_playback_state', { speed: 256 }));
    wire('btn-pause', () => cmd('set_playback_state', { speed: 0 }));
    wire('btn-prev',  () => cmd('playback_action', { action: 'prev' }));
    wire('btn-next',  () => cmd('playback_action', { action: 'next' }));

    // Playback row 2
    wire('btn-stop', () => cmd('playback_action', { action: 'stop' }));
    wire('btn-slow', () => cmd('set_playback_state', { speed: 64 }));
    wire('btn-rew',  () => cmd('set_playback_state', { speed: -512 }));
    wire('btn-ff',   () => cmd('set_playback_state', { speed: 512 }));

    // Volume / Mute / Audio
    wireIR('btn-vol-up',   'V_UP');
    wireIR('btn-vol-down', 'V_DOWN');
    wireIR('btn-mute',     'MUTE');
    wireIR('btn-audio',    'AUDIO');

    // Digits — color buttons
    wireIR('btn-a', 'A');
    wireIR('btn-b', 'B');
    wireIR('btn-c', 'C');
    wireIR('btn-d', 'D');

    // Digits 0-9
    for (let i = 0; i <= 9; i++) {
        wireIR('btn-' + i, String(i));
    }
    wireIR('btn-clear',  'CLEAR');
    wireIR('btn-select', 'SELECT');

    // Seek backward / forward
    wireIR('btn-seek-bwd', 'REWIND');
    wireIR('btn-seek-fwd', 'FORWARD');

    // Quick nav shortcuts
    wire('btn-tv',          () => cmd('open_path', { url: 'root://tv' }));
    wire('btn-sources',     () => cmd('open_path', { url: 'root://sources' }));
    wire('btn-apps',        () => cmd('open_path', { url: 'root://applications' }));
    wire('btn-setup',       () => cmd('open_path', { url: 'root://setup' }));
    wire('btn-favorites',   () => cmd('open_path', { url: 'root://favorites' }));
    wire('btn-home-screen', () => cmd('main_screen', {}));

    // Other (merged into Digits tab)
    wireIR('btn-subtitle', 'SUBTITLE');
    wireIR('btn-zoom',     'ZOOM');
    wireIR('btn-eject',    'EJECT');
    wireIR('btn-rec',      'REC');
    wireIR('btn-return2',  'RETURN');
    wireIR('btn-enter2',   'ENTER');

    // Text input — send text to active player keyboard
    const textInput = document.getElementById('text-input');
    wire('btn-send-text', async () => {
        const text = textInput ? textInput.value.trim() : '';
        if (!text) return;
        try {
            const result = await API.send('set_text', { text });
            if (result && result.command_status === 'ok') {
                toast('Text sent');
                textInput.value = '';
            } else {
                toast('No active text field on player', true);
            }
        } catch (e) {
            toast(e.message, true);
        }
    });
    if (textInput) {
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-send-text').click();
        });
    }

    // Play URL
    const playUrlInput = document.getElementById('play-url-input');
    wire('btn-play-url', async () => {
        const url = playUrlInput ? playUrlInput.value.trim() : '';
        if (!url) return;
        try {
            await API.send('launch_media_url', { media_url: url });
            toast('Playback started');
        } catch (e) {
            toast(e.message, true);
        }
    });
    if (playUrlInput) {
        playUrlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-play-url').click();
        });
    }
}

// Settings
function initSettings() {
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

// Init
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();
    initButtons();
    initSettings();

    // In PWA mode (standalone) remove extra bottom padding — not needed
    if (window.navigator.standalone === true) {
        document.documentElement.style.setProperty('--content-pb', '12px');
    }
});