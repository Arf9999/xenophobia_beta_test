document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('report-content');
    const navLinks = document.getElementById('nav-links');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const searchInput = document.getElementById('search-input');

    let isTLDR = false;
    let headings = [];
    const toggleViewBtn = document.getElementById('toggle-view-btn');

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
        if (typeof reportData !== 'undefined') {
            let html = reportData;
            
            // The HTML payload already contains correct relative paths (`../networks/...`)
            // so no further path manipulation is needed here.
            
            contentArea.innerHTML = html;
        } else {
            contentArea.innerHTML = '<p>Error: Report data not found.</p>';
        }
    }

    function renderTLDR() {
        if (typeof tldrData !== 'undefined') {
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

    toggleViewBtn.addEventListener('click', () => {
        isTLDR = !isTLDR;
        toggleViewBtn.textContent = isTLDR ? 'Detailed View' : 'TL;DR';
        toggleViewBtn.title = isTLDR ? 'Switch to Detailed View' : 'Switch to TL;DR Version';
        render();
    });

    // Initial render
    render();

    // 3. Dark Mode Toggle
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
    });

    // 4. Search Functionality
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

    // 5. Scroll Spy
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

    // 6. Lightbox for Maps with Zoom and Pan
    // Create modal element
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
    
    // Use event delegation for dynamically loaded images in contentArea
    contentArea.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'IMG') {
            modalImg.src = e.target.src;
            modal.classList.add('active');
            // Reset zoom/pan
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
        modalImg.style.transition = 'none'; // Disable transition for smooth zoom
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        scale *= delta;
        scale = Math.min(Math.max(0.5, scale), 5); // Limit zoom
        updateTransform();
    });
    
    modalImg.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        moved = false;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        modalImg.style.cursor = 'grabbing';
        modalImg.style.transition = 'none'; // Disable transition for smooth pan
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
    
    // Close modal on click outside or on close button
    modal.addEventListener('click', (e) => {
        if (moved) {
            moved = false;
            return;
        }
        const closeBtn = modal.querySelector('.lightbox-close');
        if (e.target !== modalImg || e.target === closeBtn) {
            modal.classList.remove('active');
            // Restore transition for closing animation
            setTimeout(() => {
                modalImg.style.transition = '';
            }, 300);
        }
    });
    
    // Also support ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
            setTimeout(() => {
                modalImg.style.transition = '';
            }, 300);
        }
    });

    // 7. Mobile Menu Toggle
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggleBtn && sidebar) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== menuToggleBtn) {
                sidebar.classList.remove('active');
            }
        });
        
        // Close sidebar when a link is clicked (on mobile)
        const sidebarLinks = sidebar.querySelectorAll('a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            });
        });
    }
});
