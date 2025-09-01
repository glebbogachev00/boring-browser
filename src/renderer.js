class BoringBrowser {
    constructor() {
        this.userTag = '';
        this.theme = 'light';
        this.accentColor = '#0066cc';
        this.history = [];
        this.historyIndex = -1;
        this.browsingStartTime = Date.now();
        this.lastActivityTime = Date.now();
        this.commentaryTimer = null;
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.checkFirstLaunch();
        this.showStartupMessage();
        this.startCommentarySystem();
    }

    loadSettings() {
        const settings = localStorage.getItem('boringBrowserSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.userTag = parsed.userTag || '';
            this.theme = parsed.theme || 'light';
            this.accentColor = parsed.accentColor || '#0066cc';
            this.applyTheme();
            this.updateTagDisplay();
        }
    }

    saveSettings() {
        const settings = {
            userTag: this.userTag,
            theme: this.theme,
            accentColor: this.accentColor
        };
        localStorage.setItem('boringBrowserSettings', JSON.stringify(settings));
    }

    checkFirstLaunch() {
        const hasLaunched = localStorage.getItem('boringBrowserLaunched');
        if (!hasLaunched) {
            this.showOnboarding();
        } else {
            this.showBrowser();
        }
    }

    showOnboarding() {
        document.getElementById('onboarding').classList.remove('hidden');
        document.getElementById('browser').classList.add('hidden');
    }

    showBrowser() {
        document.getElementById('onboarding').classList.add('hidden');
        document.getElementById('browser').classList.remove('hidden');
        document.getElementById('settings').classList.add('hidden');
        this.showEmptyState();
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.theme);
        document.documentElement.style.setProperty('--accent-color', this.accentColor);
    }

    updateTagDisplay() {
        const display = document.getElementById('userTagDisplay');
        if (display) {
            display.textContent = this.userTag ? `[${this.userTag}]©` : '';
        }
    }

    showStartupMessage() {
        const message = document.createElement('div');
        message.className = 'startup-message';
        message.textContent = 'This is a browser.';
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 500);
        }, 2000);
    }

    setupEventListeners() {
        // Address bar navigation
        const urlInput = document.getElementById('urlInput');
        const goBtn = document.getElementById('goBtn');
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        const reloadBtn = document.getElementById('reloadBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const webview = document.getElementById('webview');

        if (urlInput && goBtn) {
            goBtn.addEventListener('click', () => {
                this.trackActivity();
                this.navigate();
            });
            urlInput.addEventListener('keypress', (e) => {
                this.trackActivity();
                if (e.key === 'Enter') this.navigate();
            });
            urlInput.addEventListener('focus', () => {
                this.trackActivity();
                this.updateEmptyMessage();
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.trackActivity();
                this.goBack();
            });
        }

        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => {
                this.trackActivity();
                this.goForward();
            });
        }

        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                this.trackActivity();
                this.reload();
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.trackActivity();
                this.showSettings();
            });
        }

        if (webview) {
            webview.addEventListener('dom-ready', () => {
                webview.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BoringBrowser/1.0');
            });
            
            webview.addEventListener('did-navigate', (e) => {
                this.updateAddressBar(e.url);
                this.addToHistory(e.url);
                this.enforceHTTPS(e.url);
            });

            webview.addEventListener('did-navigate-in-page', (e) => {
                this.updateAddressBar(e.url);
            });

            webview.addEventListener('did-start-loading', () => {
                this.hideEmptyState();
                this.updateStatus(this.getRandomLoadingMessage());
            });

            webview.addEventListener('did-stop-loading', () => {
                this.updateStatus('Ready');
                this.showRandomCommentary();
            });

            webview.addEventListener('did-fail-load', (e) => {
                console.log('Load failed:', e.errorDescription, e.errorCode);
                if (e.errorCode === -3) {
                    this.updateStatus('Request aborted. The website didn\'t want to talk.');
                } else if (e.errorDescription.includes('ERR_CERT')) {
                    this.showSecurityWarning('Certificate error detected');
                } else if (e.errorDescription.includes('ERR_INTERNET_DISCONNECTED')) {
                    this.updateStatus('The internet seems to have wandered off.');
                } else {
                    this.updateStatus('Page not found. This happens sometimes.');
                }
                this.showEmptyState();
            });
        }

        // Easter eggs
        this.setupEasterEggs();
    }

    navigate() {
        const urlInput = document.getElementById('urlInput');
        const webview = document.getElementById('webview');
        
        if (!urlInput || !webview) return;

        let url = urlInput.value.trim();
        if (!url) {
            this.updateStatus('Type something first. We\'re not mind readers.');
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        this.hideEmptyState();
        webview.src = url;
        this.addToHistory(url);
    }

    addToHistory(url) {
        if (this.history[this.historyIndex] !== url) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(url);
            this.historyIndex = this.history.length - 1;
        }
        this.updateNavigationButtons();
    }

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const webview = document.getElementById('webview');
            if (webview) {
                webview.src = this.history[this.historyIndex];
            }
        }
        this.updateNavigationButtons();
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const webview = document.getElementById('webview');
            if (webview) {
                webview.src = this.history[this.historyIndex];
            }
        }
        this.updateNavigationButtons();
    }

    reload() {
        const webview = document.getElementById('webview');
        if (webview) {
            webview.reload();
        }
    }

    updateNavigationButtons() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        
        if (backBtn) {
            backBtn.disabled = this.historyIndex <= 0;
        }
        
        if (forwardBtn) {
            forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
        }
    }

    updateAddressBar(url) {
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.value = url;
        }
    }

    showSettings() {
        document.getElementById('browser').classList.add('hidden');
        document.getElementById('settings').classList.remove('hidden');
        
        // Populate current settings
        document.getElementById('settingsUserTag').value = this.userTag;
        document.querySelector(`input[name="settingsTheme"][value="${this.theme}"]`).checked = true;
        document.getElementById('accentColor').value = this.accentColor;
    }

    setupEasterEggs() {
        // Ctrl+Shift+B easter egg
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                this.showEasterEgg('You found something.');
            }
        });

        // Konami code
        let konamiSequence = [];
        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
        
        document.addEventListener('keydown', (e) => {
            konamiSequence.push(e.code);
            if (konamiSequence.length > konamiCode.length) {
                konamiSequence.shift();
            }
            
            if (konamiSequence.length === konamiCode.length && 
                konamiSequence.every((code, index) => code === konamiCode[index])) {
                this.triggerKonamiEasterEgg();
                konamiSequence = [];
            }
        });
    }

    showEasterEgg(message) {
        const easterEgg = document.getElementById('easterEgg');
        easterEgg.textContent = message;
        easterEgg.classList.remove('hidden');
        
        setTimeout(() => {
            easterEgg.classList.add('hidden');
        }, 1000);
    }

    triggerKonamiEasterEgg() {
        const originalTitle = document.title;
        document.title = 'Not Boring Browser';
        
        setTimeout(() => {
            document.title = originalTitle;
        }, 5000);
    }

    enforceHTTPS(url) {
        if (url.startsWith('http://') && !url.startsWith('http://localhost')) {
            this.showSecurityWarning('Insecure connection detected');
        }
    }

    showSecurityWarning(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            const originalText = statusText.textContent;
            statusText.textContent = message;
            statusText.style.color = '#ff4444';
            
            setTimeout(() => {
                statusText.textContent = originalText;
                statusText.style.color = '';
            }, 3000);
        }
    }

    hideEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
    }

    showEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            this.updateEmptyMessage();
        }
    }

    updateEmptyMessage() {
        const messages = [
            "What are we looking at today?",
            "Type something. Anything.",
            "Where to, captain?",
            "Still here. Still boring.",
            "The internet awaits your commands.",
            "Another day, another URL."
        ];
        
        const emptyMessage = document.getElementById('emptyMessage');
        if (emptyMessage) {
            emptyMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
        }
    }

    getRandomLoadingMessage() {
        const messages = [
            "Loading…",
            "Still loading… patience is a virtue, apparently.",
            "Loading… this better be worth it.",
            "Fetching pixels and disappointment.",
            "Loading… probably another corporate website.",
            "SAMO© AS AN END TO MIND WASH",
            "Downloading capitalism…",
            "Buffering reality…"
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    showRandomCommentary() {
        const webview = document.getElementById('webview');
        if (!webview || !webview.src || webview.src === 'about:blank') return;

        const url = webview.src;
        const commentary = this.getContextualCommentary(url);
        
        if (commentary && Math.random() < 0.3) {
            setTimeout(() => {
                this.updateStatus(commentary);
                setTimeout(() => {
                    this.updateStatus('Ready');
                }, 4000);
            }, 2000);
        }
    }

    getContextualCommentary(url) {
        const domain = new URL(url).hostname.toLowerCase();
        
        if (domain.includes('youtube.com')) {
            return "You've been browsing for " + Math.floor((Date.now() - this.browsingStartTime) / 60000) + " minutes. Maybe go outside?";
        }
        
        if (domain.includes('facebook.com') || domain.includes('instagram.com') || domain.includes('twitter.com') || domain.includes('tiktok.com')) {
            return "Another social media site. How original.";
        }
        
        if (domain.includes('amazon.com') || domain.includes('shopping')) {
            return "Capitalism at work.";
        }
        
        if (domain.includes('google.com')) {
            return "The all-seeing eye watches.";
        }

        const generalComments = [
            "This page loaded faster than most people make decisions.",
            "Another corporate website. How refreshing.",
            "At least this one doesn't have a cookie banner... yet.",
            "Someone actually made this website on purpose.",
            "Loading completed. Your browsing experience remains unchanged.",
            "SAMO© AS AN END TO CORPORATE WEB DESIGN",
            "Another pixel plantation.",
            "The digital wall gets another layer."
        ];
        
        return generalComments[Math.floor(Math.random() * generalComments.length)];
    }

    updateStatus(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = message;
        }
    }

    startCommentarySystem() {
        // Random idle commentary every 5-10 minutes
        this.commentaryTimer = setInterval(() => {
            const idleTime = Date.now() - this.lastActivityTime;
            if (idleTime > 300000) { // 5 minutes of inactivity
                const idleMessages = [
                    "Still here. Still boring.",
                    "The cursor blinks with existential dread.",
                    "Time passes. Pixels remain unchanged.",
                    "Another moment in digital purgatory.",
                    "SAMO© WATCHING YOU BROWSE",
                    "Digital graffiti on the wall of time."
                ];
                
                if (Math.random() < 0.2) { // 20% chance
                    this.updateStatus(idleMessages[Math.floor(Math.random() * idleMessages.length)]);
                    setTimeout(() => {
                        this.updateStatus('Ready');
                    }, 3000);
                }
            }
        }, 60000); // Check every minute
        
        // Random © symbols in corners
        this.addRandomCopyrightSymbols();
    }

    addRandomCopyrightSymbols() {
        setInterval(() => {
            if (Math.random() < 0.1) { // 10% chance every 30 seconds
                const symbol = document.createElement('div');
                symbol.textContent = '©';
                symbol.style.position = 'fixed';
                symbol.style.fontSize = '12px';
                symbol.style.color = 'var(--text-color)';
                symbol.style.opacity = '0.3';
                symbol.style.zIndex = '1000';
                symbol.style.pointerEvents = 'none';
                symbol.style.fontWeight = '700';
                symbol.style.transform = `rotate(${(Math.random() - 0.5) * 10}deg)`;
                
                // Random corner placement
                const corners = [
                    { top: '10px', left: '10px' },
                    { top: '10px', right: '10px' },
                    { bottom: '10px', left: '10px' },
                    { bottom: '10px', right: '10px' }
                ];
                const corner = corners[Math.floor(Math.random() * corners.length)];
                Object.assign(symbol.style, corner);
                
                document.body.appendChild(symbol);
                
                // Fade out and remove
                setTimeout(() => {
                    symbol.style.transition = 'opacity 2s ease';
                    symbol.style.opacity = '0';
                    setTimeout(() => {
                        if (symbol.parentNode) {
                            symbol.parentNode.removeChild(symbol);
                        }
                    }, 2000);
                }, 3000);
            }
        }, 30000);
    }

    trackActivity() {
        this.lastActivityTime = Date.now();
    }
}

// Global functions for onboarding
function nextStep() {
    const currentStep = document.querySelector('.step:not(.hidden)');
    const stepNumber = parseInt(currentStep.id.replace('step', ''));
    
    if (stepNumber === 1) {
        const tagInput = document.getElementById('userTag');
        if (!tagInput.value.trim()) {
            alert('Please enter a tag');
            return;
        }
        browser.userTag = tagInput.value.trim();
    }
    
    if (stepNumber === 2) {
        const selectedTheme = document.querySelector('input[name="theme"]:checked');
        browser.theme = selectedTheme.value;
        browser.applyTheme();
    }
    
    currentStep.classList.add('hidden');
    document.getElementById(`step${stepNumber + 1}`).classList.remove('hidden');
}

function finishOnboarding() {
    browser.saveSettings();
    localStorage.setItem('boringBrowserLaunched', 'true');
    browser.updateTagDisplay();
    browser.showBrowser();
}

function skipOnboarding() {
    localStorage.setItem('boringBrowserLaunched', 'true');
    browser.showBrowser();
}

function saveSettings() {
    const userTag = document.getElementById('settingsUserTag').value.trim();
    const selectedTheme = document.querySelector('input[name="settingsTheme"]:checked').value;
    const accentColor = document.getElementById('accentColor').value;
    
    browser.userTag = userTag;
    browser.theme = selectedTheme;
    browser.accentColor = accentColor;
    
    browser.applyTheme();
    browser.updateTagDisplay();
    browser.saveSettings();
    
    closeSettings();
}

function closeSettings() {
    browser.showBrowser();
}

// Initialize browser
const browser = new BoringBrowser();