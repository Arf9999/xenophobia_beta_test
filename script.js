document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('report-content');
    const navLinks = document.getElementById('nav-links');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const searchInput = document.getElementById('search-input');

    let isTLDR = false;
    let headings = [];
    const toggleViewBtn = document.getElementById('toggle-view-btn');

    let reportData = window.reportData;
    let tldrData = window.tldrData;

    // --- Cryptographic Decryption Helpers ---
    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    async function deriveKey(password, saltBytes, iterations) {
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);
        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            passwordBytes,
            "PBKDF2",
            false,
            ["deriveKey", "deriveBits"]
        );
        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBytes,
                iterations: iterations,
                hash: "SHA-256"
            },
            baseKey,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["decrypt"]
        );
    }

    async function decryptPayload(payload, password) {
        const saltBytes = hexToBytes(payload.salt);
        const ivBytes = hexToBytes(payload.iv);
        const cipherBytes = hexToBytes(payload.ciphertext);
        const tagBytes = hexToBytes(payload.tag);
        
        const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
        combined.set(cipherBytes, 0);
        combined.set(tagBytes, cipherBytes.length);
        
        const key = await deriveKey(password, saltBytes, 100000);
        
        const decryptedBytes = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: ivBytes,
                tagLength: 128
            },
            key,
            combined
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBytes);
    }

    function parseMarkdown(text) {
        if (!text) return '';
        // Clean markdown escape backslashes (especially before underscores in social handles)
        let cleanText = text.replace(/\\_/g, '_').replace(/\\([*#-\[\]()])/g, '$1');
        // Basic bold
        let html = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Basic italics
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Simple links
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
        return html;
    }

    function render() {
        if (isTLDR) {
            renderTLDR();
        } else {
            renderDetailed();
        }
        generateSidebar();
    }

    function renderDetailed() {
        if (typeof reportData !== 'undefined' && reportData) {
            let html = reportData;
            contentArea.innerHTML = html;
        } else {
            contentArea.innerHTML = '<p>Error: Report data not found.</p>';
        }
    }

    function renderTLDR() {
        if (typeof tldrData !== 'undefined' && tldrData) {
            let html = `<h2>TL;DR Summary</h2>`;
            html += `<p style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 2rem;">${parseMarkdown(tldrData.high_level_summary)}</p>`;
            
            if (tldrData.data_note) {
                html += `
                <div style="
                    background: rgba(251, 191, 36, 0.08);
                    border: 1px solid rgba(251, 191, 36, 0.4);
                    border-left: 4px solid #FBBF24;
                    border-radius: 6px;
                    padding: 1rem 1.25rem;
                    margin-bottom: 2rem;
                    display: flex;
                    gap: 0.75rem;
                    align-items: flex-start;
                ">
                    <span style="font-size: 1.25rem; flex-shrink: 0; margin-top: 0.1rem;">⚠️</span>
                    <div>
                        <p style="margin: 0 0 0.35rem 0; font-weight: 700; color: #FBBF24; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">Sampling Caveat</p>
                        <p style="margin: 0; font-size: 0.875rem; color: #CBD5E1; line-height: 1.6;">${tldrData.data_note.replace(/^⚠️\s*Sampling Caveat:\s*/i, '')}</p>
                    </div>
                </div>`;
            }
            
            tldrData.narratives.forEach(n => {
                html += `
                    <div class="tldr-card" style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="margin-top: 0;">${n.title}</h3>
                        <p>
                            <span class="badge" title="Traditional Media mentions" style="background: var(--accent-color); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">TM: ${n.tm_freq}</span>
                            <span class="badge" title="Social Media mentions" style="background: #10b981; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-left: 0.5rem;">SM: ${n.sm_freq}</span>
                        </p>
                        <p>${parseMarkdown(n.summary)}</p>
                        <div style="margin-top: 1rem;">
                            <p style="margin-bottom: 0.5rem;"><strong>Top Entities:</strong></p>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${(Array.isArray(n.entities) ? n.entities : (n.entities ? [n.entities] : [])).map(e => `<span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${e}</span>`).join('')}
                            </div>
                        </div>
                        <div style="margin-top: 1rem;">
                            <p style="margin-bottom: 0.5rem;"><strong>Key Authors / Influencers:</strong></p>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${(Array.isArray(n.authors) ? n.authors : (n.authors ? [n.authors] : [])).map(a => `<span style="background: rgba(56, 189, 248, 0.2); color: var(--accent-color); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${a}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `;
            });
            contentArea.innerHTML = html;
        } else {
            contentArea.innerHTML = '<p>Error: TL;DR data not found.</p>';
        }
    }

    function generateSidebar() {
        headings = contentArea.querySelectorAll('h2, h3');
        navLinks.innerHTML = ''; // Clear existing
        
        let currentThemeContainer = null;
        let currentThemeList = null;
        
        headings.forEach((heading, index) => {
            const title = heading.textContent;
            const id = 'heading-' + index;
            heading.id = id; // Assign ID for anchor link
            
            if (heading.tagName === 'H2') {
                const group = document.createElement('div');
                group.className = 'theme-group';
                
                const a = document.createElement('a');
                a.href = '#' + id;
                a.textContent = title;
                a.className = 'theme-link';
                a.title = title;
                
                const list = document.createElement('div');
                list.className = 'narratives-list';
                
                group.appendChild(a);
                group.appendChild(list);
                navLinks.appendChild(group);
                
                currentThemeContainer = group;
                currentThemeList = list;
                
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
                    
                    const isActive = group.classList.contains('active');
                    document.querySelectorAll('.theme-group').forEach(g => g.classList.remove('active'));
                    
                    if (!isActive) {
                        group.classList.add('active');
                    }
                });
            } else if (heading.tagName === 'H3' && currentThemeList) {
                const a = document.createElement('a');
                a.href = '#' + id;
                let shortTitle = title.replace(/^Canonical Narrative:\s*/i, '');
                a.textContent = shortTitle;
                a.className = 'narrative-link';
                a.title = title;
                
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
                    
                    document.querySelectorAll('.narrative-link').forEach(link => link.classList.remove('active'));
                    a.classList.add('active');
                });
                
                currentThemeList.appendChild(a);
            }
        });
    }

    // --- Authentication & Initialization Flow ---
    async function attemptDecryption(password) {
        try {
            if (typeof window.encryptedReportData !== 'undefined') {
                const decryptedHTML = await decryptPayload(window.encryptedReportData, password);
                reportData = decryptedHTML;
            }
            if (typeof window.encryptedTldrData !== 'undefined') {
                const decryptedTLDR = await decryptPayload(window.encryptedTldrData, password);
                tldrData = JSON.parse(decryptedTLDR);
            }
            // Success: cache credentials and initialize application
            sessionStorage.setItem('report_passkey', password);
            return true;
        } catch (err) {
            return false;
        }
    }

    function initApp() {
        render();

        toggleViewBtn.addEventListener('click', () => {
            isTLDR = !isTLDR;
            toggleViewBtn.textContent = isTLDR ? 'Detailed View' : 'TL;DR';
            toggleViewBtn.title = isTLDR ? 'Switch to Detailed View' : 'Switch to TL;DR Version';
            render();
        });

        // Dark Mode Toggle
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            document.body.classList.toggle('dark-mode');
        });

        // Search Functionality
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const contentElements = contentArea.querySelectorAll('p, li, tr, h3, h4');
            
            contentElements.forEach(el => {
                const text = el.textContent.toLowerCase();
                if (term === '') {
                    el.style.display = '';
                    el.style.backgroundColor = '';
                } else if (text.includes(term)) {
                    el.style.display = '';
                    el.style.backgroundColor = 'rgba(56, 189, 248, 0.1)';
                } else {
                    el.style.display = 'none';
                    el.style.backgroundColor = '';
                }
            });
            
            if (term !== '') {
                document.querySelectorAll('.theme-group').forEach(g => g.classList.add('active'));
            } else {
                document.querySelectorAll('.theme-group').forEach(g => g.classList.remove('active'));
            }
        });

        // Scroll Spy
        const wrapper = document.getElementById('content-wrapper');
        wrapper.addEventListener('scroll', () => {
            let current = '';
            headings.forEach(heading => {
                const top = heading.getBoundingClientRect().top;
                if (top < 100) {
                    current = heading.id;
                }
            });
            
            document.querySelectorAll('.theme-link, .narrative-link').forEach(a => {
                a.classList.remove('active');
                if (a.getAttribute('href') === '#' + current) {
                    a.classList.add('active');
                    if (a.classList.contains('narrative-link')) {
                        a.closest('.theme-group').classList.add('active');
                    }
                }
            });
        });

        // Lightbox for Maps with Zoom and Pan
        const modal = document.createElement('div');
        modal.className = 'lightbox-modal';
        modal.innerHTML = `
            <button class="lightbox-close" title="Close">&times;</button>
            <div class="lightbox-content" style="overflow: hidden; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
                <img class="lightbox-img" src="" alt="Full size map" style="cursor: grab; max-width: 90%; max-height: 90%;">
            </div>
        `;
        document.body.appendChild(modal);
        
        const modalImg = modal.querySelector('.lightbox-img');
        
        let scale = 1;
        let isDragging = false;
        let moved = false;
        let startX, startY;
        let translateX = 0, translateY = 0;
        
        contentArea.addEventListener('click', (e) => {
            if (e.target && e.target.tagName === 'IMG') {
                modalImg.src = e.target.src;
                modal.classList.add('active');
                scale = 1;
                translateX = 0;
                translateY = 0;
                updateTransform();
            }
        });
        
        function updateTransform() {
            modalImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }
        
        modalImg.addEventListener('wheel', (e) => {
            e.preventDefault();
            modalImg.style.transition = 'none';
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            scale *= delta;
            scale = Math.min(Math.max(0.5, scale), 5);
            updateTransform();
        });
        
        modalImg.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            moved = false;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            modalImg.style.cursor = 'grabbing';
            modalImg.style.transition = 'none';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            moved = true;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
            modalImg.style.cursor = 'grab';
        });
        
        modal.addEventListener('click', (e) => {
            if (moved) {
                moved = false;
                return;
            }
            const closeBtn = modal.querySelector('.lightbox-close');
            if (e.target !== modalImg || e.target === closeBtn) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modalImg.style.transition = '';
                }, 300);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modalImg.style.transition = '';
                }, 300);
            }
        });

        // Mobile Menu Toggle
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggleBtn && sidebar) {
            menuToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('active');
            });
            
            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== menuToggleBtn) {
                    sidebar.classList.remove('active');
                }
            });
            
            const sidebarLinks = sidebar.querySelectorAll('a');
            sidebarLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('active');
                    }
                });
            });
        }
    }

    // --- Decryption & Auth Flow Execution ---
    const needsDecryption = (typeof window.encryptedReportData !== 'undefined' || typeof window.encryptedTldrData !== 'undefined');

    if (needsDecryption) {
        // Create premium login overlay UI
        const loginOverlay = document.createElement('div');
        loginOverlay.id = 'login-overlay';
        loginOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(16px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            transition: opacity 0.3s ease;
        `;
        loginOverlay.innerHTML = `
            <div style="
                background: rgba(30, 41, 59, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 3rem;
                width: 90%;
                max-width: 420px;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                font-family: system-ui, -apple-system, sans-serif;
            ">
                <h2 style="margin: 0 0 0.5rem 0; color: #fff; font-size: 1.75rem; font-weight: 700; letter-spacing: -0.025em;">Secure Portal</h2>
                <p style="color: #94a3b8; font-size: 0.95rem; margin: 0 0 2rem 0; line-height: 1.5;">This report is password protected. Enter the key to decrypt narrative assets.</p>
                <form id="login-form">
                    <input type="password" id="login-password" placeholder="Enter password" required autofocus style="
                        width: 100%;
                        padding: 0.85rem 1.15rem;
                        background: rgba(15, 23, 42, 0.8);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 8px;
                        color: #fff;
                        font-size: 1rem;
                        margin-bottom: 1.5rem;
                        outline: none;
                        box-sizing: border-box;
                        transition: border-color 0.2s, box-shadow 0.2s;
                    ">
                    <button type="submit" style="
                        width: 100%;
                        padding: 0.85rem;
                        background: #0284c7;
                        border: none;
                        border-radius: 8px;
                        color: #fff;
                        font-weight: 600;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: background-color 0.2s, transform 0.1s;
                    ">Decrypt & Ingest</button>
                </form>
                <p id="login-error" style="color: #ef4444; font-size: 0.875rem; margin: 1.25rem 0 0 0; display: none; font-weight: 500;"></p>
            </div>
        `;
        document.body.appendChild(loginOverlay);

        const loginPassword = loginOverlay.querySelector('#login-password');
        const loginForm = loginOverlay.querySelector('#login-form');
        const loginError = loginOverlay.querySelector('#login-error');

        // Focus styles
        loginPassword.addEventListener('focus', () => {
            loginPassword.style.borderColor = '#38bdf8';
            loginPassword.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.25)';
        });
        loginPassword.addEventListener('blur', () => {
            loginPassword.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            loginPassword.style.boxShadow = 'none';
        });

        // Check if we already have the passkey cached in session storage
        const cachedPass = sessionStorage.getItem('report_passkey');
        if (cachedPass) {
            attemptDecryption(cachedPass).then(success => {
                if (success) {
                    loginOverlay.style.opacity = '0';
                    setTimeout(() => {
                        loginOverlay.remove();
                        initApp();
                    }, 300);
                } else {
                    sessionStorage.removeItem('report_passkey');
                }
            });
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pass = loginPassword.value;
            loginError.style.display = 'none';
            const btn = loginForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Decrypting...';

            const success = await attemptDecryption(pass);
            if (success) {
                loginOverlay.style.opacity = '0';
                setTimeout(() => {
                    loginOverlay.remove();
                    initApp();
                }, 300);
            } else {
                btn.disabled = false;
                btn.textContent = 'Decrypt & Ingest';
                loginError.textContent = 'Invalid decryption key. Please try again.';
                loginError.style.display = 'block';
                loginPassword.value = '';
                loginPassword.focus();
            }
        });
    } else {
        initApp();
    }
});
