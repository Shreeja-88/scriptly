/* ==================== Global Variables ==================== */
let htmlEditor, cssEditor, jsEditor;
let currentTab = 'html';
let autoSaveTimeout;
let errorMarker = null;

/* ==================== Initialize Editors ==================== */
function initializeEditors() {
    htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-editor'), {
        mode: 'htmlmixed',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        lineWrapping: true
    });

    cssEditor = CodeMirror.fromTextArea(document.getElementById('css-editor'), {
        mode: 'css',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        lineWrapping: true
    });

    jsEditor = CodeMirror.fromTextArea(document.getElementById('js-editor'), {
        mode: 'javascript',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        lineWrapping: true
    });

    cssEditor.getWrapperElement().style.display = 'none';
    jsEditor.getWrapperElement().style.display = 'none';

    htmlEditor.on('change', handleEditorChange);
    cssEditor.on('change', handleEditorChange);
    jsEditor.on('change', handleEditorChange);
}

/* ==================== Editor Change ==================== */
function handleEditorChange() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        autoSave();
        runCode();
        updateStats();
    }, 1000);
}

/* ==================== Tabs ==================== */
function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    htmlEditor.getWrapperElement().style.display = tab === 'html' ? 'block' : 'none';
    cssEditor.getWrapperElement().style.display = tab === 'css' ? 'block' : 'none';
    jsEditor.getWrapperElement().style.display = tab === 'js' ? 'block' : 'none';

    htmlEditor.refresh();
    cssEditor.refresh();
    jsEditor.refresh();
}

/* ==================== Console ==================== */
function addConsoleMessage(type, args) {
    const output = document.getElementById('consoleOutput');
    const msg = document.createElement('div');

    msg.className = `console-message ${type}`;
    msg.textContent =
        '> ' +
        args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

    output.appendChild(msg);
    output.scrollTop = output.scrollHeight;
}

function clearConsole() {
    document.getElementById('consoleOutput').innerHTML = '';
}

/* ==================== Run Code ==================== */
function runCode() {
    const preview = document.getElementById('preview');
    clearConsole();

    if (errorMarker) {
        errorMarker.clear();
        errorMarker = null;
    }

    const content = `
<!DOCTYPE html>
<html>
<head>
<style>${cssEditor.getValue()}</style>
</head>
<body>
${htmlEditor.getValue()}

<script>
(function(){
    function send(type, args){
        parent.postMessage({ type, args }, '*');
    }

    console.log = (...args) => send('log', args);
    console.warn = (...args) => send('warn', args);
    console.error = (...args) => send('error', args);

    try {
${jsEditor.getValue()}
    } catch (e) {
        send('error', [e.message, e.stack]);
        throw e;
    }
})();
<\/script>
</body>
</html>
`;

    preview.srcdoc = content;
    updateStatus('Running...', false);

    setTimeout(() => updateStatus('Ready', false), 400);
}

/* ==================== Console Listener ==================== */
window.addEventListener('message', e => {
    if (!e.data || !e.data.type) return;

    addConsoleMessage(e.data.type, e.data.args);

    if (e.data.type === 'error' && e.data.args[1]) {
        highlightJsError(e.data.args[1]);
        updateStatus('Error', true);
    }
});

/* ==================== Error Highlight ==================== */
function highlightJsError(stack) {
    const match = stack.match(/<anonymous>:(\d+):(\d+)/);
    if (!match) return;

    const line = parseInt(match[1], 10) - 1;

    if (errorMarker) errorMarker.clear();

    errorMarker = jsEditor.markText(
        { line, ch: 0 },
        { line, ch: 100 },
        { className: 'cm-error-line' }
    );

    jsEditor.focus();
    jsEditor.setCursor({ line, ch: 0 });
}

/* ==================== Storage ==================== */
function autoSave() {
    localStorage.setItem('codePortfolio', JSON.stringify({
        html: htmlEditor.getValue(),
        css: cssEditor.getValue(),
        js: jsEditor.getValue(),
        timestamp: new Date().toISOString()
    }));
    updateTimestamp();
}

function saveCode() {
    autoSave();
    updateStatus('Saved!', false);
}

function loadCode() {
    const saved = localStorage.getItem('codePortfolio');
    if (!saved) return;

    const data = JSON.parse(saved);
    htmlEditor.setValue(data.html || '');
    cssEditor.setValue(data.css || '');
    jsEditor.setValue(data.js || '');
    runCode();
}

/* ==================== Export ==================== */
function exportCode() {
    const blob = new Blob([`
<!DOCTYPE html>
<html>
<head><style>${cssEditor.getValue()}</style></head>
<body>
${htmlEditor.getValue()}
<script>${jsEditor.getValue()}<\/script>
</body>
</html>`], { type: 'text/html' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project.html';
    a.click();
}

/* ==================== Share ==================== */
function shareCode() {
    const data = {
        html: htmlEditor.getValue(),
        css: cssEditor.getValue(),
        js: jsEditor.getValue()
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = `${location.origin}${location.pathname}?code=${encoded}`;

    navigator.clipboard.writeText(url);
    updateStatus('Link Copied!', false);
}

/* ==================== Load Shared ==================== */
function loadSharedCode() {
    const params = new URLSearchParams(location.search);
    if (!params.has('code')) return;

    try {
        const data = JSON.parse(decodeURIComponent(atob(params.get('code'))));
        htmlEditor.setValue(data.html || '');
        cssEditor.setValue(data.css || '');
        jsEditor.setValue(data.js || '');
        runCode();
    } catch {}
}

/* ==================== Theme ==================== */
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const light = document.body.classList.contains('light-theme');
    const theme = light ? 'eclipse' : 'monokai';

    htmlEditor.setOption('theme', theme);
    cssEditor.setOption('theme', theme);
    jsEditor.setOption('theme', theme);

    document.getElementById('themeIcon').textContent = light ? '☀️' : '🌙';
}

/* ==================== Stats ==================== */
function updateStats() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();

    document.getElementById('charCount').textContent =
        (html.length + css.length + js.length).toLocaleString();

    document.getElementById('lineCount').textContent =
        (html.split('\n').length + css.split('\n').length + js.split('\n').length).toLocaleString();
}

function updateTimestamp() {
    const saved = localStorage.getItem('codePortfolio');
    if (!saved) return;

    const t = new Date(JSON.parse(saved).timestamp);
    document.getElementById('timestamp').textContent = t.toLocaleTimeString();
}

function updateStatus(msg, err) {
    const s = document.getElementById('status');
    s.textContent = msg;
    s.className = 'status' + (err ? ' error' : '');
}

/* ==================== Templates ==================== */
const templates = {
    blank: { html: '', css: '', js: '' }
};

function loadTemplate(name) {
    const t = templates[name];
    if (!t) return;

    htmlEditor.setValue(t.html);
    cssEditor.setValue(t.css);
    jsEditor.setValue(t.js);
    runCode();
    closeModal('templateModal');
}

/* ==================== Modals ==================== */
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

/* ==================== Init ==================== */
document.addEventListener('DOMContentLoaded', () => {
    initializeEditors();

    loadSharedCode();
    loadCode();
    updateStats();

    document.querySelectorAll('.tab').forEach(tab =>
        tab.onclick = () => switchTab(tab.dataset.tab)
    );

    document.getElementById('runBtn').onclick = runCode;
    document.getElementById('saveBtn').onclick = saveCode;
    document.getElementById('loadBtn').onclick = loadCode;
    document.getElementById('exportBtn').onclick = exportCode;
    document.getElementById('shareBtn').onclick = shareCode;
    document.getElementById('clearBtn').onclick = () => {
        htmlEditor.setValue('');
        cssEditor.setValue('');
        jsEditor.setValue('');
        runCode();
    };

    document.getElementById('themeToggle').onclick = toggleTheme;
    document.getElementById('templateBtn').onclick = () => openModal('templateModal');
    document.getElementById('clearConsole').onclick = clearConsole;

    document.querySelectorAll('.close').forEach(c =>
        c.onclick = () => closeModal(c.closest('.modal').id)
    );

    document.querySelectorAll('.template-card').forEach(card =>
        card.onclick = () => loadTemplate(card.dataset.template)
    );

    setInterval(autoSave, 30000);
});
