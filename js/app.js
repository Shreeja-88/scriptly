// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get editor elements
    const htmlEditor = document.getElementById('htmlEditor');
    const cssEditor = document.getElementById('cssEditor');
    const jsEditor = document.getElementById('jsEditor');
    const preview = document.getElementById('preview');
    const tabs = document.querySelectorAll('.tab');
    const editors = [htmlEditor, cssEditor, jsEditor];
    let currentEditor = htmlEditor;

    // Tab switching functionality
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all editors
            editors.forEach(e => e.style.display = 'none');
            
            // Show selected editor
            const lang = tab.dataset.lang;
            if (lang === 'html') currentEditor = htmlEditor;
            else if (lang === 'css') currentEditor = cssEditor;
            else if (lang === 'js') currentEditor = jsEditor;
            
            currentEditor.style.display = 'block';
            updateStats();
        });
    });

    // Run code and update preview
    function runCode() {
        const html = htmlEditor.value;
        const css = cssEditor.value;
        const js = jsEditor.value;

        // Create the preview document with console capture
        const output = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>
                    // Capture console output and send to parent
                    (function() {
                        const originalLog = console.log;
                        const originalError = console.error;
                        const originalWarn = console.warn;
                        
                        console.log = function(...args) {
                            window.parent.postMessage({
                                type: 'console',
                                method: 'log',
                                args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
                            }, '*');
                            originalLog.apply(console, args);
                        };
                        
                        console.error = function(...args) {
                            window.parent.postMessage({
                                type: 'console',
                                method: 'error',
                                args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
                            }, '*');
                            originalError.apply(console, args);
                        };
                        
                        console.warn = function(...args) {
                            window.parent.postMessage({
                                type: 'console',
                                method: 'warn',
                                args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
                            }, '*');
                            originalWarn.apply(console, args);
                        };
                        
                        // Catch runtime errors
                        window.onerror = function(msg, url, line, col, error) {
                            window.parent.postMessage({
                                type: 'console',
                                method: 'error',
                                args: ['Error: ' + msg + ' (Line ' + line + ')']
                            }, '*');
                            return false;
                        };
                    })();
                    
                    try {
                        ${js}
                    } catch(e) {
                        console.error(e.message);
                    }
                <\/script>
            </body>
            </html>
        `;

        preview.srcdoc = output;
        updateLastSaved();
    }

    // Make runCode available globally
    window.runCode = runCode;

    // Save functionality
    function saveCode() {
        const code = {
            html: htmlEditor.value,
            css: cssEditor.value,
            js: jsEditor.value,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('savedCode', JSON.stringify(code));
        alert('💾 Code saved successfully!');
    }
    window.saveCode = saveCode;

    // Load functionality
    function loadCode() {
        const savedCode = localStorage.getItem('savedCode');
        if (savedCode) {
            const code = JSON.parse(savedCode);
            htmlEditor.value = code.html;
            cssEditor.value = code.css;
            jsEditor.value = code.js;
            runCode();
            updateStats();
            alert('📁 Code loaded successfully!');
        } else {
            alert('❌ No saved code found!');
        }
    }
    window.loadCode = loadCode;

    // Export functionality
    function exportCode() {
        const html = htmlEditor.value;
        const css = cssEditor.value;
        const js = jsEditor.value;

        const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Code</title>
    <style>
${css}
    </style>
</head>
<body>
${html}
    <script>
${js}
    </script>
</body>
</html>`;

        const blob = new Blob([fullHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'code-portfolio.html';
        a.click();
        URL.revokeObjectURL(url);
        alert('📤 Code exported successfully!');
    }
    window.exportCode = exportCode;

    // Share functionality
    function shareCode() {
        const code = {
            html: htmlEditor.value,
            css: cssEditor.value,
            js: jsEditor.value
        };
        const encoded = btoa(JSON.stringify(code));
        const shareUrl = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('🔗 Share link copied to clipboard!');
        }).catch(() => {
            prompt('Copy this link to share:', shareUrl);
        });
    }
    window.shareCode = shareCode;

    // Clear functionality
    function clearCode() {
        if (confirm('⚠️ Are you sure you want to clear all code?')) {
            htmlEditor.value = '';
            cssEditor.value = '';
            jsEditor.value = '';
            runCode();
            updateStats();
            clearConsole();
            alert('🗑️ All code cleared!');
        }
    }
    window.clearCode = clearCode;

    // Toggle dark mode
    function toggleDarkMode() {
        document.body.classList.toggle('light-mode');
        alert('🌙 Dark mode toggle - Feature coming soon!');
    }
    window.toggleDarkMode = toggleDarkMode;

    // Listen for console messages from iframe
    window.addEventListener('message', (event) => {
        if (event.data.type === 'console') {
            addConsoleMessage(event.data.method, event.data.args);
        }
    });

    // Add message to console
    function addConsoleMessage(method, args) {
        const consoleOutput = document.getElementById('consoleOutput');
        const message = document.createElement('div');
        message.style.marginBottom = '8px';
        message.style.padding = '4px 0';
        
        // Style based on console method
        if (method === 'error') {
            message.style.color = '#fda4af';
            message.textContent = '❌ ' + args.join(' ');
        } else if (method === 'warn') {
            message.style.color = '#fde68a';
            message.textContent = '⚠️ ' + args.join(' ');
        } else {
            message.style.color = '#86efac';
            message.textContent = '> ' + args.join(' ');
        }
        
        consoleOutput.appendChild(message);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Update line and character count
    function updateStats() {
        const content = currentEditor.value;
        const lines = content.split('\n').length;
        const chars = content.length;
        
        document.getElementById('lineCount').textContent = lines;
        document.getElementById('charCount').textContent = chars;
    }

    // Update last saved timestamp
    function updateLastSaved() {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        });
        document.getElementById('lastSaved').textContent = time;
    }

    // Clear console output
    function clearConsole() {
        document.getElementById('consoleOutput').innerHTML = '';
    }

    // Make clearConsole available globally
    window.clearConsole = clearConsole;

    // Auto-run on input with debouncing
    let autoRunTimeout;
    editors.forEach(editor => {
        editor.addEventListener('input', () => {
            updateStats();
            
            // Debounce auto-run to avoid excessive updates
            clearTimeout(autoRunTimeout);
            autoRunTimeout = setTimeout(() => {
                runCode();
            }, 500);
        });
    });

    // Auto-save functionality (simulated)
    setInterval(() => {
        updateLastSaved();
    }, 1000);

    // Check for shared code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCode = urlParams.get('code');
    if (sharedCode) {
        try {
            const code = JSON.parse(atob(sharedCode));
            htmlEditor.value = code.html;
            cssEditor.value = code.css;
            jsEditor.value = code.js;
            alert('📥 Shared code loaded successfully!');
        } catch (e) {
            console.error('Failed to load shared code');
        }
    }

    // Initial run
    runCode();
    updateStats();
});