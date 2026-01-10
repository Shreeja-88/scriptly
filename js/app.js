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
    let autoRunEnabled = true;

    // Track cursor position
    function updateCursorPosition() {
        const editor = currentEditor;
        const pos = editor.selectionStart;
        const text = editor.value.substring(0, pos);
        const lines = text.split('\n');
        const lineNum = lines.length;
        const colNum = lines[lines.length - 1].length + 1;
        
        document.getElementById('lineNum').textContent = lineNum;
        document.getElementById('colNum').textContent = colNum;
    }

    // Update language display
    function updateLanguage(lang) {
        const langMap = { html: 'HTML', css: 'CSS', js: 'JavaScript' };
        document.getElementById('currentLang').textContent = langMap[lang] || 'HTML';
    }

    // Toggle auto-run
    function toggleAutoRun() {
        autoRunEnabled = !autoRunEnabled;
        const toggleSwitch = document.getElementById('autoRunSwitch');
        const label = document.getElementById('autoRunLabel');
        
        toggleSwitch.classList.toggle('active');
        label.textContent = autoRunEnabled ? 'Auto Run' : 'Manual';
        
        if (autoRunEnabled) {
            runCode();
        }
    }
    window.toggleAutoRun = toggleAutoRun;

    // Empty state visibility
    function updateEmptyState() {
        const isEmpty = currentEditor.value.trim() === '';
        const emptyState = document.getElementById('emptyState');
        
        if (isEmpty) {
            emptyState.classList.add('visible');
        } else {
            emptyState.classList.remove('visible');
        }
    }

    // Resizer functionality
    const resizer = document.getElementById('resizer');
    const editorSection = document.querySelector('.editor-section');
    const previewSection = document.querySelector('.preview-section');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerWidth = document.querySelector('.main-container').offsetWidth;
        const newEditorWidth = (e.clientX / containerWidth) * 100;
        
        if (newEditorWidth > 20 && newEditorWidth < 80) {
            editorSection.style.flex = `0 0 ${newEditorWidth}%`;
            previewSection.style.flex = `0 0 ${100 - newEditorWidth}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    });

    // Console resizer
    const consoleResizer = document.getElementById('consoleResizer');
    const consoleDiv = document.querySelector('.console');
    let isResizingConsole = false;
    let startY = 0;
    let startHeight = 0;

    consoleResizer.addEventListener('mousedown', (e) => {
        isResizingConsole = true;
        startY = e.clientY;
        startHeight = consoleDiv.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizingConsole) return;
        
        const deltaY = startY - e.clientY;
        const newHeight = startHeight + deltaY;
        
        if (newHeight > 100 && newHeight < 400) {
            consoleDiv.style.height = `${newHeight}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizingConsole = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + Enter: Run code
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            runCode();
        }
        
        // Ctrl + S: Save project
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCode();
        }
        
        // Ctrl + O: Load project
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            loadCode();
        }
        
        // Ctrl + L: Clear console
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            clearConsole();
        }
        
        // Ctrl + /: Toggle shortcuts modal
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            toggleShortcuts();
        }
    });

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
            updateLanguage(lang);
            updateCursorPosition();
            updateEmptyState();
        });
    });

    // Run code and update preview
    function runCode() {
        const html = htmlEditor.value;
        const css = cssEditor.value;
        const js = jsEditor.value;

        // Show loading animation
        const previewContainer = document.querySelector('.preview-container');
        previewContainer.classList.add('loading');
        
        setTimeout(() => {
            previewContainer.classList.remove('loading');
        }, 600);

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

    // Save functionality with project name
    function saveCode() {
        const projectName = prompt('Enter project name:', 'My Project');
        if (!projectName) return;
        
        const code = {
            name: projectName,
            html: htmlEditor.value,
            css: cssEditor.value,
            js: jsEditor.value,
            timestamp: new Date().toISOString()
        };
        
        // Get existing projects
        let projects = JSON.parse(localStorage.getItem('codeProjects') || '[]');
        
        // Check if project exists and update it
        const existingIndex = projects.findIndex(p => p.name === projectName);
        if (existingIndex !== -1) {
            projects[existingIndex] = code;
        } else {
            projects.push(code);
        }
        
        localStorage.setItem('codeProjects', JSON.stringify(projects));
        alert(`💾 Project "${projectName}" saved successfully!`);
    }
    window.saveCode = saveCode;

    // Load functionality with project selection
    function loadCode() {
        const projects = JSON.parse(localStorage.getItem('codeProjects') || '[]');
        
        if (projects.length === 0) {
            alert('❌ No saved projects found!');
            return;
        }
        
        // Create project list
        let projectList = 'Select a project to load:\n\n';
        projects.forEach((p, i) => {
            const date = new Date(p.timestamp).toLocaleString();
            projectList += `${i + 1}. ${p.name} (${date})\n`;
        });
        
        const selection = prompt(projectList + '\nEnter project number:');
        const index = parseInt(selection) - 1;
        
        if (index >= 0 && index < projects.length) {
            const code = projects[index];
            htmlEditor.value = code.html;
            cssEditor.value = code.css;
            jsEditor.value = code.js;
            runCode();
            updateStats();
            alert(`📁 Project "${code.name}" loaded successfully!`);
        } else {
            alert('❌ Invalid selection!');
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

    // Toggle shortcuts modal
    function toggleShortcuts() {
        const modal = document.getElementById('shortcutsModal');
        modal.classList.toggle('active');
    }
    window.toggleShortcuts = toggleShortcuts;

    // Close modal when clicking outside
    document.getElementById('shortcutsModal').addEventListener('click', (e) => {
        if (e.target.id === 'shortcutsModal') {
            toggleShortcuts();
        }
    });

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
        const isLight = document.body.classList.contains('light-mode');
        
        // Save preference
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        // Update button icon (optional)
        const btn = event.target.closest('.btn');
        if (btn) {
            btn.textContent = isLight ? '☀️' : '🌙';
        }
    }
    window.toggleDarkMode = toggleDarkMode;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        // Update button if needed
        const darkModeBtn = document.querySelector('.btn-dark');
        if (darkModeBtn && darkModeBtn.textContent.includes('🌙')) {
            darkModeBtn.textContent = '☀️';
        }
    }

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
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'console-timestamp';
        timeSpan.textContent = `[${timestamp}]`;
        message.appendChild(timeSpan);
        
        // Add message content
        const contentSpan = document.createElement('span');
        
        // Style based on console method
        if (method === 'error') {
            contentSpan.className = 'console-error';
            contentSpan.textContent = '❌ ' + args.join(' ');
        } else if (method === 'warn') {
            contentSpan.className = 'console-warn';
            contentSpan.textContent = '⚠️ ' + args.join(' ');
        } else {
            contentSpan.className = 'console-log';
            contentSpan.textContent = '> ' + args.join(' ');
        }
        
        message.appendChild(contentSpan);
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

    // Update stats on input (no auto-run)
    editors.forEach(editor => {
        editor.addEventListener('input', () => {
            updateStats();
            updateCursorPosition();
            updateEmptyState();
            
            // Auto-run if enabled
            if (autoRunEnabled) {
                clearTimeout(window.autoRunTimeout);
                window.autoRunTimeout = setTimeout(() => {
                    runCode();
                }, 500);
            }
        });
        
        // Track cursor position on click and keyup
        editor.addEventListener('click', updateCursorPosition);
        editor.addEventListener('keyup', updateCursorPosition);
    });

    // Auto-save functionality (simulated)
    setInterval(() => {
        // Auto-save to localStorage
        const autoSave = {
            html: htmlEditor.value,
            css: cssEditor.value,
            js: jsEditor.value,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('autoSave', JSON.stringify(autoSave));
    }, 5000);

    // Load auto-save on start
    const autoSave = localStorage.getItem('autoSave');
    if (autoSave && htmlEditor.value.trim() === '<h1 id="hi">Hello world!</h1>') {
        const saved = JSON.parse(autoSave);
        if (confirm('🔄 Found auto-saved work. Would you like to restore it?')) {
            htmlEditor.value = saved.html;
            cssEditor.value = saved.css;
            jsEditor.value = saved.js;
        }
    }

    // Check for shared code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCode = urlParams.get('code');
    if (sharedCode) {
        try {
            const code = JSON.parse(atob(sharedCode));
            htmlEditor.value = code.html;
            cssEditor.value = code.css;
            jsEditor.value = code.js;
        } catch (e) {
            console.error('Failed to load shared code');
        }
    }

    // Initial setup - IMPORTANT: Must run code to populate preview
    updateStats();
    updateCursorPosition();
    updateEmptyState();
    runCode(); // This runs the initial code to show in preview
});