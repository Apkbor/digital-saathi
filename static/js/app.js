/**
 * Digital Saathi - Complete Functional JavaScript
 * Senior-Friendly Smartphone Assistance App
 * Version: 2.0 Final
 */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
    API_BASE: window.location.origin + '/api',
    USER_ID: 'user_001',
    TOAST_DURATION: 4000,
    ANIMATION_DURATION: 300,
    STORAGE_KEY: 'digital_saathi_cache',
    CACHE_DURATION: 5 * 60 * 1000
};

// ========================================
// STATE MANAGEMENT
// ========================================

const state = {
    currentUser: null,
    currentGuide: null,
    currentModule: null,
    currentStep: 0,
    modalHistory: [],
    scamAlerts: [],
    isOnline: navigator.onLine,
    isLoading: false
};

// ========================================
// DOM ELEMENTS
// ========================================

const elements = {};

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatTime(date) {
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { hindi: 'सुप्रभात', english: 'Good Morning' };
    if (hour >= 12 && hour < 17) return { hindi: 'नमस्ते', english: 'Good Afternoon' };
    if (hour >= 17 && hour < 21) return { hindi: 'शुभ संध्या', english: 'Good Evening' };
    return { hindi: 'शुभ रात्रि', english: 'Good Night' };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function vibrate(pattern = [50]) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// ========================================
// API FUNCTIONS
// ========================================

async function fetchAPI(endpoint, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

async function fetchUser() {
    try {
        const data = await fetchAPI(`/user/${CONFIG.USER_ID}`);
        if (data.success) {
            state.currentUser = data.user;
            updateUserUI();
        }
        return data;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        state.currentUser = {
            id: 'user_001',
            name: 'श्रीमती शर्मा',
            name_en: 'Mrs. Sharma',
            emergency_contacts: [
                { name: 'राहुल शर्मा (बेटा)', phone: '+91-9876543211', relation: 'son' },
                { name: 'प्रिया शर्मा (बेटी)', phone: '+91-9876543212', relation: 'daughter' }
            ]
        };
        updateUserUI();
        return null;
    }
}

async function fetchGuide(guideType) {
    showLoading(true);
    
    try {
        const data = await fetchAPI(`/guide/${guideType}`);
        showLoading(false);
        if (data.success) {
            state.currentGuide = data.guide;
            showGuideHome(data.guide);
        }
        return data;
    } catch (error) {
        showLoading(false);
        showToast('warning', 'ऑफ़लाइन मोड', 'Offline data loaded');
        const offlineGuide = getOfflineGuide(guideType);
        if (offlineGuide) {
            state.currentGuide = offlineGuide;
            showGuideHome(offlineGuide);
        }
        return null;
    }
}

async function submitEmergency() {
    showLoading(true);
    vibrate([100, 50, 100]);
    
    try {
        const data = await fetchAPI('/emergency', {
            method: 'POST',
            body: JSON.stringify({ user_id: CONFIG.USER_ID })
        });
        showLoading(false);
        
        if (data.success) {
            showToast('success', 'SOS भेजा गया!', 'आपके संपर्कों को सूचित किया गया है');
            closeSOSModal();
            logActivity('emergency', 'Emergency SOS sent');
            return data;
        }
    } catch (error) {
        showLoading(false);
        showToast('error', 'त्रुटि', 'SOS भेजने में समस्या। कृपया 100 पर कॉल करें');
    }
    return null;
}

async function submitHelpRequest(type, subType, message) {
    showLoading(true);
    
    try {
        const data = await fetchAPI('/help', {
            method: 'POST',
            body: JSON.stringify({
                user_id: CONFIG.USER_ID,
                type: type,
                sub_type: subType,
                message: message
            })
        });
        showLoading(false);
        
        if (data.success) {
            showToast('success', 'मदद अनुरोध भेजा गया', `अनुरोध ID: ${data.request_id}`);
            closeModal();
            logActivity('help_request', `${type}: ${subType}`);
            return data;
        }
    } catch (error) {
        showLoading(false);
        showToast('error', 'त्रुटि', 'कृपया पुनः प्रयास करें');
    }
    return null;
}

async function submitScamReport(reportData) {
    showLoading(true);
    
    try {
        const data = await fetchAPI('/scam/report', {
            method: 'POST',
            body: JSON.stringify({
                user_id: CONFIG.USER_ID,
                type: reportData.type,
                description: reportData.description,
                phone: reportData.phone
            })
        });
        showLoading(false);
        
        if (data.success) {
            showToast('success', 'रिपोर्ट दर्ज हो गई', `रिपोर्ट ID: ${data.report_id}`);
            closeModal();
            logActivity('scam_report', reportData.type);
            return data;
        }
    } catch (error) {
        showLoading(false);
        showToast('error', 'त्रुटि', 'कृपया पुनः प्रयास करें');
    }
    return null;
}

async function logActivity(type, details) {
    try {
        await fetchAPI('/activity/log', {
            method: 'POST',
            body: JSON.stringify({
                user_id: CONFIG.USER_ID,
                type: type,
                details: details
            })
        });
    } catch (e) {
        console.log('Activity log skipped');
    }
}

// ========================================
// OFFLINE GUIDES
// ========================================

function getOfflineGuide(guideType) {
    const guides = {
        whatsapp: {
            title: "व्हाट्सएप गाइड",
            title_en: "WhatsApp Guide",
            modules: [
                {
                    id: "basics",
                    title: "व्हाट्सएप की शुरुआत",
                    title_en: "Getting Started",
                    steps: [
                        { step: 1, hindi: "व्हाट्सएप आइकन ढूंढें", english: "Find WhatsApp icon", hint: "हरे रंग का आइकन" },
                        { step: 2, hindi: "टैप करें", english: "Tap to open", hint: "एक बार टैप" },
                        { step: 3, hindi: "फोन नंबर डालें", english: "Enter phone number", hint: "+91 के साथ" },
                        { step: 4, hindi: "OTP वेरिफाई करें", english: "Verify OTP", hint: "स्वचालित वेरिफिकेशन" }
                    ]
                },
                {
                    id: "messaging",
                    title: "मैसेज भेजना",
                    title_en: "Send Messages",
                    steps: [
                        { step: 1, hindi: "नया मैसेज आइकन", english: "Tap new message", hint: "नीला गोल बटन" },
                        { step: 2, hindi: "संपर्क चुनें", english: "Select contact", hint: "खोजें या स्क्रॉल" },
                        { step: 3, hindi: "मैसेज टाइप करें", english: "Type message", hint: "कीबोर्ड उपयोग" },
                        { step: 4, hindi: "सेंड बटन", english: "Tap send", hint: "हरा तीर आइकन" }
                    ]
                }
            ]
        },
        upi: {
            title: "UPI सुरक्षा",
            title_en: "UPI Safety",
            modules: [
                {
                    id: "safety",
                    title: "सुरक्षा नियम",
                    title_en: "Safety Rules",
                    steps: [
                        { step: 1, hindi: "OTP कभी न बताएं", english: "Never share OTP", warning: true },
                        { step: 2, hindi: "अजनबी को पैसे न भेजें", english: "Don't send to strangers", warning: true },
                        { step: 3, hindi: "संदिग्ध लिंक न खोलें", english: "Don't open suspicious links", warning: true }
                    ]
                }
            ]
        },
        scam: {
            title: "घोटाला अलर्ट",
            title_en: "Scam Alert",
            active_alerts: [
                { alert_type: 'danger', title: 'फर्जी बैंक कॉल', description: 'बैंक के नाम पर OTP माँगने वाले फोन न लें', created_at: '2024-01-15', verified: true },
                { alert_type: 'danger', title: 'लॉटरी घोटाला', description: 'लॉटरी जीतने के मैसेज झूठे हैं', created_at: '2024-01-14', verified: true },
                { alert_type: 'warning', title: 'KYC अपडेट', description: 'KYC के लिए लिंक न खोलें', created_at: '2024-01-13', verified: true }
            ]
        },
        'ask-help': {
            title: "मदद माँगें",
            title_en: "Ask for Help",
            help_types: [
                { id: "technical", title: "तकनीकी समस्या", title_en: "Technical Issue", description: "फोन या ऐप में समस्या", sub_options: ["फोन धीमा है", "ऐप नहीं खुल रहा", "इंटरनेट समस्या", "अन्य"] },
                { id: "payment", title: "पेमेंट मदद", title_en: "Payment Help", description: "भुगतान समस्या", sub_options: ["गलत पैसे भेजे", "रिफंड नहीं मिला", "UPI समस्या", "अन्य"] },
                { id: "guidance", title: "मार्गदर्शन", title_en: "Guidance", description: "कुछ सीखना है", sub_options: ["नई ऐप", "ऑनलाइन सेवा", "सोशल मीडिया", "अन्य"] },
                { id: "report", title: "धोखाधड़ी रिपोर्ट", title_en: "Report Fraud", description: "घोटाला रिपोर्ट", sub_options: ["फोन कॉल घोटाला", "मैसेज घोटाला", "ऑनलाइन घोटाला", "अन्य"] }
            ],
            emergency_contacts: [
                { name: "Police", name_hi: "पुलिस", phone: "100" },
                { name: "Ambulance", name_hi: "अम्बुलेंस", phone: "102" },
                { name: "Women Helpline", name_hi: "महिला हेल्पलाइन", phone: "1091" },
                { name: "Cyber Crime", name_hi: "साइबर क्राइम", phone: "1930" }
            ]
        }
    };
    return guides[guideType] || null;
}

// ========================================
// UI FUNCTIONS
// ========================================

function initElements() {
    elements.currentTime = document.getElementById('currentTime');
    elements.greetingTime = document.getElementById('greetingTime');
    elements.userName = document.getElementById('userName');
    elements.statusText = document.getElementById('statusText');
    elements.scamAlertCount = document.getElementById('scamAlertCount');
    elements.quickCallBtn = document.getElementById('quickCallBtn');
    elements.sosButton = document.getElementById('sosButton');
    elements.menuCards = document.querySelectorAll('.menu-card');
    elements.navItems = document.querySelectorAll('.nav-item');
    elements.quickActionBtns = document.querySelectorAll('.quick-action-btn');
    elements.modalOverlay = document.getElementById('modalOverlay');
    elements.modal = document.getElementById('modal');
    elements.modalTitle = document.getElementById('modalTitle');
    elements.modalBody = document.getElementById('modalBody');
    elements.modalCloseBtn = document.getElementById('modalCloseBtn');
    elements.modalBackBtn = document.getElementById('modalBackBtn');
    elements.sosModalOverlay = document.getElementById('sosModalOverlay');
    elements.sosContactsList = document.getElementById('sosContactsList');
    elements.sosCancelBtn = document.getElementById('sosCancelBtn');
    elements.sosConfirmBtn = document.getElementById('sosConfirmBtn');
    elements.toast = document.getElementById('toast');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
}

function updateUserUI() {
    if (state.currentUser && elements.userName) {
        elements.userName.textContent = state.currentUser.name;
    }
    if (elements.greetingTime) {
        const greeting = getGreeting();
        elements.greetingTime.textContent = `${greeting.hindi}! ${greeting.english}`;
    }
}

function updateTime() {
    if (elements.currentTime) {
        elements.currentTime.textContent = formatTime(new Date());
    }
}

function showLoading(show) {
    state.isLoading = show;
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.toggle('active', show);
    }
}

function showToast(type, title, message, duration = CONFIG.TOAST_DURATION) {
    if (!elements.toast) return;
    
    elements.toast.className = `toast ${type} active`;
    elements.toast.querySelector('.toast-title').textContent = title;
    elements.toast.querySelector('.toast-message').textContent = message;
    
    vibrate(type === 'error' ? [100, 50, 100] : [50]);
    
    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, duration);
}

function openModal(title, content, showBack = false) {
    if (!elements.modalOverlay) return;
    
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = content;
    elements.modalOverlay.classList.add('active');
    elements.modalBackBtn.style.display = showBack ? 'flex' : 'none';
    
    if (showBack) {
        state.modalHistory.push({ title, content, showBack });
    }
    
    elements.modalBody.scrollTop = 0;
    vibrate([30]);
}

function closeModal() {
    if (elements.modalOverlay) {
        elements.modalOverlay.classList.remove('active');
    }
    state.modalHistory = [];
    state.currentGuide = null;
    state.currentModule = null;
    state.currentStep = 0;
}

function goBack() {
    if (state.modalHistory.length > 1) {
        state.modalHistory.pop();
        const prev = state.modalHistory[state.modalHistory.length - 1];
        elements.modalTitle.textContent = prev.title;
        elements.modalBody.innerHTML = prev.content;
        elements.modalBackBtn.style.display = prev.showBack ? 'flex' : 'none';
        bindModalEvents();
    }
}

function openSOSModal() {
    if (!elements.sosModalOverlay) return;
    
    const contacts = state.currentUser?.emergency_contacts || [
        { name: 'राहुल शर्मा (बेटा)', relation: 'son' },
        { name: 'प्रिया शर्मा (बेटी)', relation: 'daughter' }
    ];
    
    let contactsHTML = contacts.map(contact => {
        const initials = contact.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        return `
            <div class="sos-contact-item">
                <div class="sos-contact-avatar">${initials}</div>
                <div class="sos-contact-info">
                    <div class="sos-contact-name">${escapeHtml(contact.name)}</div>
                    <div class="sos-contact-relation">${escapeHtml(contact.relation || '')}</div>
                </div>
            </div>
        `;
    }).join('');
    
    elements.sosContactsList.innerHTML = contactsHTML;
    elements.sosModalOverlay.classList.add('active');
    vibrate([100, 50, 100]);
}

function closeSOSModal() {
    if (elements.sosModalOverlay) {
        elements.sosModalOverlay.classList.remove('active');
    }
}

// ========================================
// GUIDE DISPLAY FUNCTIONS
// ========================================

function showGuideHome(guide) {
    state.currentGuide = guide;
    state.currentModule = null;
    state.currentStep = 0;
    
    let content = '';
    
    // Learning guides (WhatsApp, UPI)
    if (guide.modules) {
        content = `
            <div style="text-align: center; margin-bottom: 1.5rem; color: var(--text-secondary);">
                मॉड्यूल चुनें और सीखना शुरू करें
            </div>
            <div class="module-list">
                ${guide.modules.map((module, idx) => `
                    <button class="module-card" data-module-idx="${idx}">
                        <div class="module-icon">
                            <span>${idx + 1}</span>
                        </div>
                        <div class="module-info">
                            <div class="module-title">${escapeHtml(module.title)}</div>
                            <div class="module-subtitle">${escapeHtml(module.title_en)}</div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style="color: var(--text-muted);">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    // Scam alerts
    if (guide.active_alerts) {
        content = `
            <div class="warning-box danger" style="margin-bottom: 1.5rem;">
                <div class="warning-title">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    सक्रिय चेतावनियाँ
                </div>
                <div class="warning-text">हाल ही में रिपोर्ट किए गए घोटाले</div>
            </div>
            <div class="alerts-list">
                ${guide.active_alerts.map(alert => `
                    <div class="alert-card ${alert.alert_type || 'warning'}">
                        <div class="alert-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                ${alert.alert_type === 'danger' 
                                    ? '<path d="M12 2L1 21h22L12 2zm0 3.5L19.5 19h-15L12 5.5zm-1 4v5h2v-5h-2zm0 7v2h2v-2h-2z"/>'
                                    : '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>'}
                            </svg>
                        </div>
                        <div class="alert-content">
                            <div class="alert-title">${escapeHtml(alert.title)}</div>
                            <div class="alert-desc">${escapeHtml(alert.description)}</div>
                            <div class="alert-date">📅 ${escapeHtml(alert.created_at || 'Recent')}${alert.verified ? ' ✓ सत्यापित' : ''}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-danger" style="width: 100%; margin-top: 1.5rem;" onclick="openScamReportModal()">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="margin-right: 0.5rem; vertical-align: middle;">
                    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/>
                </svg>
                घोटाला रिपोर्ट करें
            </button>
        `;
    }
    
    // Help types
    if (guide.help_types) {
        content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 64px; height: 64px; background: #f3e8ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <svg viewBox="0 0 24 24" fill="#8b5cf6" width="32" height="32">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                    </svg>
                </div>
                <p style="color: var(--text-secondary);">आपको किस चीज़ में मदद चाहिए?</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                ${guide.help_types.map(type => `
                    <button class="help-type-btn" data-type="${type.id}" style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1.5rem; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${getHelpTypeColor(type.id)};">
                            ${getHelpTypeIcon(type.id)}
                        </div>
                        <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(type.title)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(type.title_en)}</div>
                    </button>
                `).join('')}
            </div>
            <div style="margin-top: 2rem;">
                <h4 style="margin-bottom: 1rem;">हेल्पलाइन नंबर</h4>
                <div class="emergency-contacts-grid">
                    ${(guide.emergency_contacts || []).map(contact => `
                        <a href="tel:${contact.phone}" class="emergency-contact-btn" style="display: flex; flex-direction: column; align-items: center; padding: 1rem; background: #f8fafc; border-radius: 12px; text-decoration: none;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">${escapeHtml(contact.phone)}</div>
                            <div style="font-size: 0.875rem; color: var(--text-primary);">${escapeHtml(contact.name)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(contact.name_hi || '')}</div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    openModal(guide.title, content, false);
    bindModalEvents();
}

function getHelpTypeColor(type) {
    const colors = {
        'technical': '#dbeafe',
        'payment': '#d1fae5',
        'guidance': '#f3e8ff',
        'report': '#fee2e2'
    };
    return colors[type] || '#dbeafe';
}

function getHelpTypeIcon(type) {
    const icons = {
        'technical': '<svg viewBox="0 0 24 24" fill="#3b82f6" width="24" height="24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
        'payment': '<svg viewBox="0 0 24 24" fill="#10b981" width="24" height="24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
        'guidance': '<svg viewBox="0 0 24 24" fill="#8b5cf6" width="24" height="24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z"/></svg>',
        'report': '<svg viewBox="0 0 24 24" fill="#ef4444" width="24" height="24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>'
    };
    return icons[type] || icons['technical'];
}

function showModule(module) {
    state.currentModule = module;
    state.currentStep = 0;
    
    const isWarningModule = module.id.includes('safety') || module.id.includes('emergency');
    
    const content = `
        ${isWarningModule ? `
            <div class="warning-box danger" style="margin-bottom: 1.5rem;">
                <div class="warning-title">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    ध्यान से पढ़ें
                </div>
            </div>
        ` : ''}
        <div class="step-progress" id="stepProgress">
            ${module.steps.map((step, index) => `
                <div class="step-dot ${index === 0 ? 'active' : ''}" data-step="${index}"></div>
            `).join('')}
        </div>
        <div class="step-content" id="stepContent">
            ${renderStep(module.steps[0])}
        </div>
        <div class="step-navigation">
            <button class="step-nav-btn prev" id="prevStepBtn" disabled>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
                पीछे
            </button>
            <button class="step-nav-btn next" id="nextStepBtn">
                आगे
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </button>
        </div>
    `;
    
    openModal(module.title, content, true);
    bindStepNavigation(module);
}

function renderStep(step) {
    return `
        <div class="step-item ${step.warning ? 'danger' : ''}">
            <div class="step-number ${step.warning ? 'warning' : ''}">${step.step}</div>
            <div class="step-content">
                <div class="step-hindi">${escapeHtml(step.hindi)}</div>
                <div class="step-english">${escapeHtml(step.english)}</div>
                ${step.hint ? `<div class="step-hint">💡 ${escapeHtml(step.hint)}</div>` : ''}
            </div>
        </div>
        ${step.warning ? `
            <div class="warning-box danger" style="margin-top: 1rem;">
                <div class="warning-title">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    चेतावनी!
                </div>
                <div class="warning-text">यह जानकारी महत्वपूर्ण है</div>
            </div>
        ` : ''}
    `;
}

function bindStepNavigation(module) {
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const stepContent = document.getElementById('stepContent');
    const stepProgress = document.getElementById('stepProgress');
    const totalSteps = module.steps.length;
    
    prevBtn.addEventListener('click', () => {
        if (state.currentStep > 0) {
            state.currentStep--;
            stepContent.innerHTML = renderStep(module.steps[state.currentStep]);
            updateStepProgress();
            updateNavButtons();
            vibrate([20]);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (state.currentStep < totalSteps - 1) {
            state.currentStep++;
            stepContent.innerHTML = renderStep(module.steps[state.currentStep]);
            updateStepProgress();
            updateNavButtons();
            vibrate([20]);
        } else {
            completeModule(module);
        }
    });
    
    function updateStepProgress() {
        const dots = stepProgress.querySelectorAll('.step-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index < state.currentStep) {
                dot.classList.add('completed');
            } else if (index === state.currentStep) {
                dot.classList.add('active');
            }
        });
    }
    
    function updateNavButtons() {
        prevBtn.disabled = state.currentStep === 0;
        if (state.currentStep === totalSteps - 1) {
            nextBtn.innerHTML = `
                पूर्ण करें
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;
        }
    }
}

function completeModule(module) {
    showToast('success', 'बधाई! 🎉', 'आपने यह मॉड्यूल पूरा कर लिया है');
    vibrate([50, 50, 50]);
    
    if (state.currentGuide) {
        logActivity('learning', `${state.currentGuide.title} - ${module.title}`);
    }
    
    setTimeout(() => {
        showGuideHome(state.currentGuide);
    }, 1500);
}

function showHelpSubOptions(helpType) {
    const content = `
        <div style="margin-bottom: 1rem;">
            <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(helpType.title)}</h4>
            <span style="font-size: 0.875rem; color: var(--text-secondary);">${escapeHtml(helpType.description)}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${helpType.sub_options.map((option, index) => `
                <button class="sub-option-btn" data-option="${index}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 12px; width: 100%; text-align: left; border: 2px solid transparent; transition: all 0.2s;">
                    <div class="sub-option-radio" style="width: 20px; height: 20px; border: 2px solid #e2e8f0; border-radius: 50%; flex-shrink: 0;"></div>
                    <span style="font-size: 1rem; color: var(--text-primary);">${escapeHtml(option)}</span>
                </button>
            `).join('')}
        </div>
        <div style="margin-top: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">
                अतिरिक्त जानकारी (वैकल्पिक):
            </label>
            <textarea id="additionalInfo" placeholder="यहाँ विवरण लिखें..." style="width: 100%; min-height: 80px; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 12px; font-family: inherit; font-size: 1rem; resize: vertical;"></textarea>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;" id="submitHelpBtn" disabled>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="margin-right: 0.5rem; vertical-align: middle;">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            मदद भेजें
        </button>
    `;
    
    openModal(helpType.title_en, content, true);
    
    let selectedOption = null;
    
    document.querySelectorAll('.sub-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sub-option-btn').forEach(b => {
                b.style.borderColor = 'transparent';
                b.style.background = '#f8fafc';
                b.querySelector('.sub-option-radio').style.borderColor = '#e2e8f0';
                b.querySelector('.sub-option-radio').style.background = 'transparent';
            });
            btn.style.borderColor = '#3b82f6';
            btn.style.background = '#eff6ff';
            btn.querySelector('.sub-option-radio').style.borderColor = '#3b82f6';
            btn.querySelector('.sub-option-radio').style.background = '#3b82f6';
            selectedOption = btn.dataset.option;
            document.getElementById('submitHelpBtn').disabled = false;
            vibrate([30]);
        });
    });
    
    document.getElementById('submitHelpBtn').addEventListener('click', () => {
        if (selectedOption !== null) {
            const optionText = helpType.sub_options[parseInt(selectedOption)];
            const additionalInfo = document.getElementById('additionalInfo').value;
            const message = additionalInfo ? `${optionText}: ${additionalInfo}` : optionText;
            submitHelpRequest(helpType.id, optionText, message);
        }
    });
}

function openScamReportModal() {
    const content = `
        <div class="warning-box warning" style="margin-bottom: 1.5rem;">
            <div class="warning-title">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                घोटाला रिपोर्ट करें
            </div>
            <div class="warning-text">आपकी रिपोर्ट हमारी टीम को मिलेगी</div>
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">घोटाले का प्रकार:</label>
            <select id="scamType" style="width: 100%; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; background: white;">
                <option value="">-- चुनें --</option>
                <option value="phone_call">फोन कॉल घोटाला</option>
                <option value="sms">SMS घोटाला</option>
                <option value="whatsapp">व्हाट्सएप घोटाला</option>
                <option value="online">ऑनलाइन घोटाला</option>
                <option value="bank_fraud">बैंक धोखाधड़ी</option>
                <option value="other">अन्य</option>
            </select>
        </div>
        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">फोन नंबर (अगर था):</label>
            <input type="tel" id="scamPhone" placeholder="जैसे: +91-9876543210" style="width: 100%; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem;">
        </div>
        <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-primary);">विवरण:</label>
            <textarea id="scamDescription" placeholder="घोटाले का विवरण यहाँ लिखें..." style="width: 100%; min-height: 100px; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 12px; font-family: inherit; font-size: 1rem; resize: vertical;"></textarea>
        </div>
        <button class="btn btn-danger" style="width: 100%;" onclick="submitScamReportForm()">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="margin-right: 0.5rem; vertical-align: middle;">
                <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/>
            </svg>
            रिपोर्ट भेजें
        </button>
    `;
    
    openModal('घोटाला रिपोर्ट', content, true);
}

function submitScamReportForm() {
    const type = document.getElementById('scamType').value;
    const phone = document.getElementById('scamPhone').value;
    const description = document.getElementById('scamDescription').value;
    
    if (!type) {
        showToast('error', 'त्रुटि', 'कृपया घोटाले का प्रकार चुनें');
        return;
    }
    
    if (!description) {
        showToast('error', 'त्रुटि', 'कृपया विवरण लिखें');
        return;
    }
    
    submitScamReport({
        type: type,
        phone: phone,
        description: description
    });
}

function openCallFamilyModal() {
    const contacts = state.currentUser?.emergency_contacts || [
        { name: 'राहुल शर्मा (बेटा)', phone: '+91-9876543211', relation: 'son' },
        { name: 'प्रिया शर्मा (बेटी)', phone: '+91-9876543212', relation: 'daughter' }
    ];
    
    const content = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                <svg viewBox="0 0 24 24" fill="#10b981" width="32" height="32">
                    <path d="M6.62 10.79c1.44 2.83 3.87 5.14 6.69 6.69l2.23-2.23c.3-.3.73-.39 1.11-.23 1.23.49 2.56.76 3.93.76.55 0 1 .45 1 1v3.72c0 .55-.45 1-1 1C9.06 21 3 14.94 3 7.5c0-.55.45-1 1-1H7.8c.55 0 1 .45 1 1 0 1.37.27 2.7.76 3.93.15.38.06.81-.23 1.11l-2.23 2.23z"/>
                </svg>
            </div>
            <p style="color: var(--text-secondary);">किसे कॉल करना चाहते हैं?</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${contacts.map(contact => {
                const initials = contact.name.split(' ').map(n => n[0]).join('').substring(0, 2);
                return `
                    <a href="tel:${contact.phone}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 12px; text-decoration: none; color: inherit; border: 2px solid transparent; transition: all 0.2s;" onmouseover="this.style.borderColor='#10b981'; this.style.background='#f0fdf4';" onmouseout="this.style.borderColor='transparent'; this.style.background='#f8fafc';">
                        <div style="width: 48px; height: 48px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1rem;">${initials}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(contact.name)}</div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">${escapeHtml(contact.relation || '')}</div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="#10b981" width="24" height="24">
                            <path d="M6.62 10.79c1.44 2.83 3.87 5.14 6.69 6.69l2.23-2.23c.3-.3.73-.39 1.11-.23 1.23.49 2.56.76 3.93.76.55 0 1 .45 1 1v3.72c0 .55-.45 1-1 1C9.06 21 3 14.94 3 7.5c0-.55.45-1 1-1H7.8c.55 0 1 .45 1 1 0 1.37.27 2.7.76 3.93.15.38.06.81-.23 1.11l-2.23 2.23z"/>
                        </svg>
                    </a>
                `;
            }).join('')}
        </div>
    `;
    
    openModal('परिवार को कॉल करें', content, false);
}

// ========================================
// EVENT BINDING
// ========================================

function bindModalEvents() {
    // Module cards
    document.querySelectorAll('.module-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.moduleIdx);
            if (state.currentGuide && state.currentGuide.modules && state.currentGuide.modules[idx]) {
                showModule(state.currentGuide.modules[idx]);
            }
        });
    });
    
    // Help type buttons
    document.querySelectorAll('.help-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const typeId = btn.dataset.type;
            if (state.currentGuide && state.currentGuide.help_types) {
                const helpType = state.currentGuide.help_types.find(t => t.id === typeId);
                if (helpType) {
                    showHelpSubOptions(helpType);
                }
            }
        });
    });
}

function initEventListeners() {
    // Menu cards
    elements.menuCards.forEach(card => {
        card.addEventListener('click', () => {
            const guideType = card.dataset.guide;
            vibrate([30]);
            
            switch (guideType) {
                case 'whatsapp':
                case 'upi':
                case 'scam':
                case 'ask-help':
                    fetchGuide(guideType);
                    break;
            }
        });
    });
    
    // Quick action buttons
    if (elements.quickActionBtns) {
        elements.quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                vibrate([30]);
                
                switch (action) {
                    case 'call-family':
                        openCallFamilyModal();
                        break;
                    case 'balance':
                        showToast('info', 'बैलेंस चेक', 'अपना UPI ऐप खोलें → Check Balance');
                        break;
                    case 'report-scam':
                        openScamReportModal();
                        break;
                    case 'history':
                        showToast('info', 'इतिहास', 'UPI ऐप में "History" देखें');
                        break;
                }
            });
        });
    }
    
    // SOS Button
    if (elements.sosButton) {
        elements.sosButton.addEventListener('click', openSOSModal);
    }
    
    // SOS Modal buttons
    if (elements.sosCancelBtn) {
        elements.sosCancelBtn.addEventListener('click', closeSOSModal);
    }
    if (elements.sosConfirmBtn) {
        elements.sosConfirmBtn.addEventListener('click', submitEmergency);
    }
    
    // Quick Call Button
    if (elements.quickCallBtn) {
        elements.quickCallBtn.addEventListener('click', () => {
            vibrate([30]);
            openCallFamilyModal();
        });
    }
    
    // Modal close
    if (elements.modalCloseBtn) {
        elements.modalCloseBtn.addEventListener('click', closeModal);
    }
    
    if (elements.modalBackBtn) {
        elements.modalBackBtn.addEventListener('click', goBack);
    }
    
    // Close modal on overlay click
    if (elements.modalOverlay) {
        elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.modalOverlay) {
                closeModal();
            }
        });
    }
    
    // Close SOS modal on overlay click
    if (elements.sosModalOverlay) {
        elements.sosModalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.sosModalOverlay) {
                closeSOSModal();
            }
        });
    }
    
    // Navigation items
    if (elements.navItems) {
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => {
                elements.navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                vibrate([30]);
                
                const tab = item.dataset.tab;
                if (tab !== 'home') {
                    showToast('info', 'जल्द आ रहा है', `${tab} सुविधा जल्द उपलब्ध होगी`);
                    setTimeout(() => {
                        elements.navItems.forEach(i => i.classList.remove('active'));
                        document.querySelector('.nav-item[data-tab="home"]').classList.add('active');
                    }, 1500);
                }
            });
        });
    }
    
    // Update time every minute
    setInterval(updateTime, 60000);
    
    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.modalOverlay && elements.modalOverlay.classList.contains('active')) {
                closeModal();
            }
            if (elements.sosModalOverlay && elements.sosModalOverlay.classList.contains('active')) {
                closeSOSModal();
            }
        }
    });
    
    // Online/offline detection
    window.addEventListener('online', () => {
        state.isOnline = true;
        showToast('success', 'ऑनलाइन', 'इंटरनेट कनेक्शन बहाल हो गया');
    });
    
    window.addEventListener('offline', () => {
        state.isOnline = false;
        showToast('warning', 'ऑफ़लाइन', 'इंटरनेट कनेक्शन नहीं है');
    });
    
    // Touch feedback
    document.querySelectorAll('button, .menu-card, .quick-action-btn').forEach(el => {
        el.addEventListener('touchstart', () => {
            el.style.transform = 'scale(0.97)';
        });
        el.addEventListener('touchend', () => {
            el.style.transform = '';
        });
    });
}

// ========================================
// GLOBAL FUNCTIONS
// ========================================

window.closeModal = closeModal;
window.goBack = goBack;
window.openScamReportModal = openScamReportModal;
window.submitScamReportForm = submitScamReportForm;
window.openCallFamilyModal = openCallFamilyModal;

// ========================================
// INITIALIZE APP
// ========================================

function init() {
    console.log('Digital Saathi App Initializing...');
    
    initElements();
    updateTime();
    
    const greeting = getGreeting();
    if (elements.greetingTime) {
        elements.greetingTime.textContent = `${greeting.hindi}! ${greeting.english}`;
    }
    
    initEventListeners();
    fetchUser();
    
    document.body.classList.add('app-loaded');
    console.log('Digital Saathi App Initialized');
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('ServiceWorker registration skipped');
        });
    });
}
