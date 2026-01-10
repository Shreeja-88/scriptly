// ==================== Global Variables ====================
let htmlEditor, cssEditor, jsEditor;
let currentTab = 'html';
let autoSaveTimeout;
let consoleMessages = [];

// ==================== CodeMirror Initialization ====================
function initializeEditors() {
    // HTML Editor
    htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-editor'), {
        mode: 'htmlmixed',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
    });

    // CSS Editor
    cssEditor = CodeMirror.fromTextArea(document.getElementById('css-editor'), {
        mode: 'css',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
    });

    // JavaScript Editor
    jsEditor = CodeMirror.fromTextArea(document.getElementById('js-editor'), {
        mode: 'javascript',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
    });

    // Hide all editors initially except HTML
    cssEditor.getWrapperElement().style.display = 'none';
    jsEditor.getWrapperElement().style.display = 'none';

    // Add change listeners
    htmlEditor.on('change', handleEditorChange);
    cssEditor.on('change', handleEditorChange);
    jsEditor.on('change', handleEditorChange);
}

// ==================== Editor Change Handler ====================
function handleEditorChange() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        autoSave();
        runCode();
        updateStats();
    }, 1000);
}

// ==================== Tab Switching ====================
function switchTab(tabName) {
    currentTab = tabName;

    // Update tab styling
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Show/hide editors
    htmlEditor.getWrapperElement().style.display = tabName === 'html' ? 'block' : 'none';
    cssEditor.getWrapperElement().style.display = tabName === 'css' ? 'block' : 'none';
    jsEditor.getWrapperElement().style.display = tabName === 'js' ? 'block' : 'none';

    // Refresh the visible editor
    if (tabName === 'html') htmlEditor.refresh();
    if (tabName === 'css') cssEditor.refresh();
    if (tabName === 'js') jsEditor.refresh();
}

// ==================== Run Code ====================
function runCode() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue();

    const preview = document.getElementById('preview');
    
    // Clear console
    consoleMessages = [];
    
    const content = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${css}</style>
        </head>
        <body>
            ${html}
            <script>
                // Override console methods to capture output
                (function() {
                    const originalLog = console.log;
                    const originalError = console.error;
                    const originalWarn = console.warn;

                    console.log = function(...args) {
                        window.parent.postMessage({
                            type: 'console',
                            method: 'log',
                            data: args
                        }, '*');
                        originalLog.apply(console, args);
                    };

                    console.error = function(...args) {
                        window.parent.postMessage({
                            type: 'console',
                            method: 'error',
                            data: args
                        }, '*');
                        originalError.apply(console, args);
                    };

                    console.warn = function(...args) {
                        window.parent.postMessage({
                            type: 'console',
                            method: 'warn',
                            data: args
                        }, '*');
                        originalWarn.apply(console, args);
                    };

                    try {
                        ${js}
                    } catch(e) {
                        console.error('Error: ' + e.message);
                        document.body.innerHTML += '<div style="background:#fee;color:#c33;padding:20px;margin:10px;border-left:4px solid #c33;border-radius:4px;font-family:monospace;"><strong>⚠️ JavaScript Error:</strong><br>' + e.message + '</div>';
                    }
                })();
            <\/script>
        </body>
        </html>
    `;

    preview.srcdoc = content;
    updateStatus('Running...', false);

    setTimeout(() => {
        updateStatus('Ready', false);
    }, 500);
}

// ==================== Console Message Handler ====================
window.addEventListener('message', (event) => {
    if (event.data.type === 'console') {
        addConsoleMessage(event.data.method, event.data.data);
    }
});

function addConsoleMessage(method, data) {
    const consoleOutput = document.getElementById('consoleOutput');
    const message = document.createElement('div');
    message.className = `console-message ${method}`;
    
    const formattedData = data.map(item => {
        if (typeof item === 'object') {
            return JSON.stringify(item, null, 2);
        }
        return String(item);
    }).join(' ');
    
    message.textContent = `> ${formattedData}`;
    consoleOutput.appendChild(message);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// ==================== Storage Functions ====================
function saveCode() {
    const data = {
        html: htmlEditor.getValue(),
        css: cssEditor.getValue(),
        js: jsEditor.getValue(),
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('codePortfolio', JSON.stringify(data));
    updateStatus('Saved!', false);
    updateTimestamp();

    setTimeout(() => {
        updateStatus('Ready', false);
    }, 2000);
}

function autoSave() {
    const data = {
        html: htmlEditor.getValue(),
        css: cssEditor.getValue(),
        js: jsEditor.getValue(),
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('codePortfolio', JSON.stringify(data));
    updateTimestamp();
}

function loadCode() {
    const saved = localStorage.getItem('codePortfolio');
    if (saved) {
        const data = JSON.parse(saved);
        htmlEditor.setValue(data.html || '');
        cssEditor.setValue(data.css || '');
        jsEditor.setValue(data.js || '');
        runCode();
        updateStatus('Loaded!', false);
        updateTimestamp();

        setTimeout(() => {
            updateStatus('Ready', false);
        }, 2000);
    } else {
        updateStatus('No saved code', true);
        setTimeout(() => {
            updateStatus('Ready', false);
        }, 2000);
    }
}

function clearAll() {
    if (confirm('Are you sure you want to clear all code? This cannot be undone.')) {
        htmlEditor.setValue('');