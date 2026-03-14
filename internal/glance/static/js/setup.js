const BASE_URL = (typeof setupData !== 'undefined' && setupData.baseURL) ? setupData.baseURL : '';

const editor      = document.getElementById('yaml-editor');
const preview     = document.getElementById('preview-frame');
const saveBtn     = document.getElementById('save-btn');
const validateBtn = document.getElementById('validate-btn');
const statusEl    = document.getElementById('setup-status');
const errorPanel  = document.getElementById('setup-errors');
const refreshBtn  = document.getElementById('refresh-btn');
const savedFlash  = document.getElementById('saved-flash');

// ── Status helper ────────────────────────────────────────────

function setStatus(text, type = '') {
    statusEl.textContent = text;
    statusEl.className = 'setup-status' + (type ? ' setup-status-' + type : '');
}

// ── Error panel ──────────────────────────────────────────────

function showErrors(message) {
    errorPanel.style.display = 'block';
    errorPanel.innerHTML = '';
    // Split on newlines so multi-line Go errors render cleanly
    message.split('\n').filter(l => l.trim()).forEach(line => {
        const div = document.createElement('div');
        div.className = 'setup-error-line';
        div.textContent = line;
        errorPanel.appendChild(div);
    });
}

function clearErrors() {
    errorPanel.style.display = 'none';
    errorPanel.innerHTML = '';
}

// ── API calls ────────────────────────────────────────────────

async function apiPost(path, body) {
    const resp = await fetch(BASE_URL + path, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body,
    });
    return resp.json();
}

// ── Validate ─────────────────────────────────────────────────

async function doValidate() {
    validateBtn.disabled = true;
    setStatus('validating…', 'busy');
    try {
        const result = await apiPost('/api/setup/validate', editor.value);
        if (result.ok) {
            setStatus('✓ valid', 'success');
            clearErrors();
        } else {
            setStatus('✗ invalid', 'error');
            showErrors(result.error || 'Unknown error');
        }
    } catch (e) {
        setStatus('✗ request failed', 'error');
        showErrors(String(e));
    } finally {
        validateBtn.disabled = false;
    }
}

// ── Save ─────────────────────────────────────────────────────

async function doSave() {
    saveBtn.disabled = true;
    setStatus('saving…', 'busy');
    try {
        const result = await apiPost('/api/setup/config', editor.value);
        if (result.ok) {
            setStatus('✓ saved — reloading…', 'success');
            clearErrors();
            flashSaved();
            // Give the server ~900ms to reload config before refreshing iframe
            setTimeout(refreshPreview, 900);
        } else {
            setStatus('✗ error', 'error');
            showErrors(result.error || 'Unknown error');
        }
    } catch (e) {
        setStatus('✗ request failed', 'error');
        showErrors(String(e));
    } finally {
        saveBtn.disabled = false;
    }
}

// ── Preview refresh ──────────────────────────────────────────

function refreshPreview() {
    // Re-assign src to force reload while keeping the same URL
    const current = preview.src || (BASE_URL + '/');
    preview.src = '';
    requestAnimationFrame(() => { preview.src = current; });
    setStatus('', '');
}

function flashSaved() {
    if (!savedFlash) return;
    savedFlash.classList.remove('active');
    void savedFlash.offsetWidth; // reflow
    savedFlash.classList.add('active');
    setTimeout(() => savedFlash.classList.remove('active'), 600);
}

// ── Tab key in textarea ──────────────────────────────────────

editor.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const start = editor.selectionStart;
    const end   = editor.selectionEnd;
    const spaces = '  '; // 2-space indent (YAML standard)
    editor.value = editor.value.slice(0, start) + spaces + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + spaces.length;
});

// Clear status on edit so stale "valid"/"saved" doesn't mislead
editor.addEventListener('input', () => {
    if (statusEl.className.includes('success') || statusEl.className.includes('error')) {
        setStatus('', '');
    }
    clearErrors();
});

// ── Wire up buttons ──────────────────────────────────────────

validateBtn.addEventListener('click', doValidate);
saveBtn.addEventListener('click', doSave);
refreshBtn.addEventListener('click', refreshPreview);

// ── Init: set iframe src ─────────────────────────────────────

preview.src = BASE_URL + '/';
