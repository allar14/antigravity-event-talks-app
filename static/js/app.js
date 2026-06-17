// Application State
let appState = {
    updates: [],
    filteredUpdates: [],
    currentTypeFilter: 'all',
    searchQuery: '',
    selectedUpdate: null
};

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    spinnerIcon: document.getElementById('spinner-icon'),
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statAnnouncements: document.getElementById('stat-announcements'),
    statIssues: document.getElementById('stat-issues'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    filterPills: document.querySelectorAll('.filter-pill'),
    statCards: document.querySelectorAll('.stat-card'),
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    notesGrid: document.getElementById('notes-grid'),
    toastContainer: document.getElementById('toast-container'),
    
    // Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    charMax: document.getElementById('char-max'),
    charProgressIndicator: document.getElementById('char-progress-indicator'),
    charWarning: document.getElementById('char-warning'),
    modalUpdateBadge: document.getElementById('modal-update-badge'),
    modalUpdateDate: document.getElementById('modal-update-date'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelTweet: document.getElementById('btn-cancel-tweet'),
    btnSubmitTweet: document.getElementById('btn-submit-tweet')
};

// Map types to styling and icons
const typeConfig = {
    'Feature': { icon: 'zap', badgeClass: 'badge-feature' },
    'Announcement': { icon: 'megaphone', badgeClass: 'badge-announcement' },
    'Issue': { icon: 'alert-triangle', badgeClass: 'badge-issue' },
    'Deprecation': { icon: 'trash-2', badgeClass: 'badge-deprecation' },
    'Update': { icon: 'info', badgeClass: 'badge-update' }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Refresh buttons
    elements.btnRefresh.addEventListener('click', () => fetchReleases(true));
    elements.btnRetry.addEventListener('click', () => fetchReleases(true));
    
    // Search inputs
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.trim().toLowerCase();
        toggleClearSearchButton();
        applyFiltersAndSearch();
    });
    
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        toggleClearSearchButton();
        applyFiltersAndSearch();
        elements.searchInput.focus();
    });
    
    // Pill filters
    elements.filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            elements.filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            appState.currentTypeFilter = pill.dataset.type;
            applyFiltersAndSearch();
        });
    });
    
    // Clicking Stat cards acts as type filters
    elements.statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.dataset.filter;
            
            // Map stat card values to pill data-types
            let targetType = 'all';
            if (filterType === 'Feature') targetType = 'Feature';
            else if (filterType === 'Announcement') targetType = 'Announcement';
            else if (filterType === 'Issue') targetType = 'Issue';
            
            // Activate correct pill
            elements.filterPills.forEach(pill => {
                if (pill.dataset.type === targetType) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });
            
            appState.currentTypeFilter = targetType;
            applyFiltersAndSearch();
            
            // Scroll down slightly if needed to search section
            elements.searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });
    
    // Reset filters button
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Tweet modal event handlers
    elements.btnCloseModal.addEventListener('click', closeTweetModal);
    elements.btnCancelTweet.addEventListener('click', closeTweetModal);
    elements.tweetTextarea.addEventListener('input', handleTweetTextareaInput);
    elements.btnSubmitTweet.addEventListener('click', submitTweet);
    
    // Close modal on click outside of content
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });
}

// Fetch release notes from API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    
    if (forceRefresh) {
        elements.spinnerIcon.classList.add('spin');
        elements.btnRefresh.disabled = true;
    }
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server error');
        }
        
        const data = await response.json();
        appState.updates = data.updates || [];
        
        // Update stats
        updateStats();
        
        // Render Notes
        applyFiltersAndSearch();
        
        if (forceRefresh) {
            showToast('Feed refreshed successfully!', 'success');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        elements.errorMessage.textContent = error.message || 'Something went wrong while connecting to the feed.';
        showError(true);
        if (forceRefresh) {
            showToast('Failed to refresh feed', 'error');
        }
    } finally {
        showLoading(false);
        if (forceRefresh) {
            elements.spinnerIcon.classList.remove('spin');
            elements.btnRefresh.disabled = false;
        }
    }
}

// Stats Calculation
function updateStats() {
    const total = appState.updates.length;
    const features = appState.updates.filter(u => u.type === 'Feature').length;
    const announcements = appState.updates.filter(u => u.type === 'Announcement').length;
    const issues = appState.updates.filter(u => u.type === 'Issue').length;
    
    elements.statTotal.textContent = total;
    elements.statFeatures.textContent = features;
    elements.statAnnouncements.textContent = announcements;
    elements.statIssues.textContent = issues;
}

// Filter and Search Logic
function applyFiltersAndSearch() {
    let results = appState.updates;
    
    // 1. Type Filter
    if (appState.currentTypeFilter !== 'all') {
        results = results.filter(update => update.type === appState.currentTypeFilter);
    }
    
    // 2. Search Query
    if (appState.searchQuery) {
        results = results.filter(update => {
            const inDate = update.date.toLowerCase().includes(appState.searchQuery);
            const inType = update.type.toLowerCase().includes(appState.searchQuery);
            const inText = update.text.toLowerCase().includes(appState.searchQuery);
            return inDate || inType || inText;
        });
    }
    
    appState.filteredUpdates = results;
    renderGrid();
}

// Render Release Notes Grid
function renderGrid() {
    elements.notesGrid.innerHTML = '';
    
    if (appState.filteredUpdates.length === 0) {
        elements.notesGrid.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.notesGrid.style.display = 'grid';
    
    appState.filteredUpdates.forEach((update, index) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.style.animationDelay = `${Math.min(index * 0.04, 0.4)}s`;
        
        // Select custom config for badge and icon
        const config = typeConfig[update.type] || typeConfig['Update'];
        
        card.innerHTML = `
            <div class="note-card-header">
                <span class="note-badge ${config.badgeClass}">
                    <i data-lucide="${config.icon}" style="width: 12px; height: 12px; margin-right: 4px; vertical-align: middle;"></i>
                    ${update.type}
                </span>
                <span class="note-date">${update.date}</span>
            </div>
            <div class="note-card-body">
                ${update.html}
            </div>
            <div class="note-card-footer">
                <button class="btn-card-action btn-card-tweet" title="Share this update on X / Twitter">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style="vertical-align: middle;">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </button>
                <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="link-original">
                    <span>View Official</span>
                    <i data-lucide="external-link"></i>
                </a>
            </div>
        `;
        
        // Attach tweet event
        const tweetBtn = card.querySelector('.btn-card-tweet');
        tweetBtn.addEventListener('click', () => openTweetModal(update));
        
        elements.notesGrid.appendChild(card);
    });
    
    // Hydrate Lucide Icons for dynamically generated elements
    lucide.createIcons();
}

// Tweet Modal Handlers
function openTweetModal(update) {
    appState.selectedUpdate = update;
    
    // Badge and date in modal
    elements.modalUpdateBadge.textContent = update.type;
    elements.modalUpdateBadge.className = `preview-badge ${typeConfig[update.type]?.badgeClass || 'badge-update'}`;
    elements.modalUpdateDate.textContent = update.date;
    
    // Prep tweet contents
    elements.tweetTextarea.value = update.tweet_draft;
    
    // Show modal
    elements.tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock background scrolling
    
    // Calculate initial character counts
    handleTweetTextareaInput();
    
    // Focus textarea
    setTimeout(() => {
        elements.tweetTextarea.focus();
        elements.tweetTextarea.setSelectionRange(0, 0); // Put cursor at start for convenience
    }, 100);
}

function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scroll
    appState.selectedUpdate = null;
}

// Twitter-compliant character counter
// Accounts for standard t.co URL shortening where any URL counts as exactly 23 characters.
function calculateTwitterLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    // Remove all URLs to count plain text length
    let plainText = text.replace(urlRegex, '');
    
    // Add 23 characters for each URL matched
    return plainText.length + (urls.length * 23);
}

function handleTweetTextareaInput() {
    const text = elements.tweetTextarea.value;
    const charLen = calculateTwitterLength(text);
    
    elements.charCount.textContent = charLen;
    
    // Calculate percentage for progress bar
    const percent = Math.min((charLen / 280) * 100, 100);
    elements.charProgressIndicator.style.width = `${percent}%`;
    
    // Color progression matching status
    if (charLen > 280) {
        elements.charProgressIndicator.style.backgroundColor = 'var(--color-issue)';
        elements.charWarning.style.display = 'inline-flex';
        elements.charCount.style.color = 'var(--color-issue)';
        elements.btnSubmitTweet.disabled = true;
        elements.btnSubmitTweet.style.opacity = '0.5';
    } else {
        elements.charProgressIndicator.style.backgroundColor = charLen > 250 ? 'var(--color-deprecation)' : 'var(--twitter-color)';
        elements.charWarning.style.display = 'none';
        elements.charCount.style.color = charLen > 250 ? 'var(--color-deprecation)' : 'var(--text-secondary)';
        elements.btnSubmitTweet.disabled = false;
        elements.btnSubmitTweet.style.opacity = '1';
    }
}

function submitTweet() {
    const tweetText = elements.tweetTextarea.value;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
    showToast('Redirected to Twitter/X to share!', 'success');
}

// UI Helpers
function showLoading(isLoading) {
    elements.loadingState.style.display = isLoading ? 'flex' : 'none';
    if (isLoading) {
        elements.notesGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.errorState.style.display = 'none';
    }
}

function showError(isError) {
    elements.errorState.style.display = isError ? 'flex' : 'none';
    if (isError) {
        elements.notesGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.loadingState.style.display = 'none';
    }
}

function resetFilters() {
    elements.searchInput.value = '';
    appState.searchQuery = '';
    toggleClearSearchButton();
    
    elements.filterPills.forEach(pill => {
        if (pill.dataset.type === 'all') {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
    
    appState.currentTypeFilter = 'all';
    applyFiltersAndSearch();
}

function toggleClearSearchButton() {
    if (appState.searchQuery.length > 0) {
        elements.clearSearch.style.display = 'flex';
    } else {
        elements.clearSearch.style.display = 'none';
    }
}

// Toast notification implementation
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Auto-remove toast
    setTimeout(() => {
        toast.style.animation = 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse both';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}
