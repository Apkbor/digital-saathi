"""
Digital Saathi - Senior-Friendly Smartphone Assistance App
Complete Flask Backend with SQLite Database
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import sqlite3
import json
import logging
import uuid

# Initialize Flask App
app = Flask(__name__)
app.secret_key = 'digital-saathi-2024-secret-key'
CORS(app)

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database Configuration
DATABASE = 'digital_saathi.db'

# ========================================
# DATABASE SETUP
# ========================================

def get_db():
    """Get database connection"""
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    """Initialize all database tables"""
    db = get_db()
    cursor = db.cursor()
    
    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_en TEXT,
            phone TEXT,
            language TEXT DEFAULT 'hindi',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Emergency Contacts Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            relation TEXT,
            priority INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Learning Progress Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS learning_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guide_type TEXT NOT NULL,
            module_id TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Help Requests Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS help_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            request_type TEXT NOT NULL,
            sub_type TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            resolution_notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Emergency SOS Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emergency_sos (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            location TEXT,
            contacts_notified TEXT,
            status TEXT DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Scam Reports Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scam_reports (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            scam_type TEXT NOT NULL,
            description TEXT,
            phone_number TEXT,
            status TEXT DEFAULT 'under_review',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Activity Log Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            activity_type TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Scam Alerts Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scam_alerts (
            id TEXT PRIMARY KEY,
            alert_type TEXT NOT NULL,
            title TEXT NOT NULL,
            title_en TEXT,
            description TEXT NOT NULL,
            description_en TEXT,
            verified INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    ''')
    
    db.commit()
    db.close()

# Initialize Database on Startup
init_db()

# ========================================
# SEED DATA
# ========================================

def seed_data():
    """Seed initial default data"""
    db = get_db()
    cursor = db.cursor()
    
    # Check if default user exists
    cursor.execute("SELECT id FROM users WHERE id = ?", ('user_001',))
    if not cursor.fetchone():
        # Create Default User
        cursor.execute('''
            INSERT INTO users (id, name, name_en, phone, language)
            VALUES (?, ?, ?, ?, ?)
        ''', ('user_001', 'श्रीमती शर्मा', 'Mrs. Sharma', '+91-9876543210', 'hindi'))
        
        # Create Emergency Contacts
        emergency_contacts = [
            ('user_001', 'राहुल शर्मा (बेटा)', '+91-9876543211', 'son', 1),
            ('user_001', 'प्रिया शर्मा (बेटी)', '+91-9876543212', 'daughter', 2),
            ('user_001', 'डॉ. वर्मा', '+91-9876543213', 'doctor', 3)
        ]
        cursor.executemany('''
            INSERT INTO emergency_contacts (user_id, name, phone, relation, priority)
            VALUES (?, ?, ?, ?, ?)
        ''', emergency_contacts)
        
        # Create Scam Alerts
        scam_alerts = [
            ('alert_001', 'danger', 'फर्जी बैंक कॉल सावधान!', 'Fake Bank Call Warning!',
             'लोग बैंक के नाम पर फोन कर आपका OTP माँग रहे हैं। बैंक कभी OTP नहीं माँगता!',
             'People are calling as bank officials asking for OTP. Bank never asks for OTP!',
             1, datetime.now(), datetime.now() + timedelta(days=30)),
            ('alert_002', 'danger', 'लॉटरी जीतने का झूठ', 'Fake Lottery Winning',
             'SMS/WhatsApp पर लॉटरी जीतने का मैसेज आ रहा है। यह धोखा है!',
             'SMS/WhatsApp messages about winning lottery are scams!',
             1, datetime.now(), datetime.now() + timedelta(days=30)),
            ('alert_003', 'warning', 'फर्जी KYC अपडेट', 'Fake KYC Update',
             'अपना KYC अपडेट करने के लिए लिंक पर जाने को कहा जा रहा है। बैंक ऐसा नहीं करता!',
             'Being asked to click link for KYC update. Bank doesn\'t do this!',
             1, datetime.now(), datetime.now() + timedelta(days=30)),
            ('alert_004', 'warning', 'रिश्तेदार का नाम इस्तेमाल', 'Relative Impersonation',
             'लोग रिश्तेदार बनकर पैसे माँग रहे हैं। पहले वेरिफाई करें!',
             'Scammers pretend to be relatives asking for money. Always verify!',
             1, datetime.now(), datetime.now() + timedelta(days=30))
        ]
        cursor.executemany('''
            INSERT INTO scam_alerts (id, alert_type, title, title_en, description, description_en, verified, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', scam_alerts)
        
        db.commit()
        logger.info("Default data seeded successfully")
    
    db.close()

# Seed Data on Startup
seed_data()

# ========================================
# HELPER FUNCTIONS
# ========================================

def get_greeting():
    """Get time-based greeting in Hindi and English"""
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return {"hindi": "सुप्रभात", "english": "Good Morning"}
    elif 12 <= hour < 17:
        return {"hindi": "नमस्ते", "english": "Good Afternoon"}
    elif 17 <= hour < 21:
        return {"hindi": "शुभ संध्या", "english": "Good Evening"}
    else:
        return {"hindi": "शुभ रात्रि", "english": "Good Night"}

def generate_id(prefix=""):
    """Generate unique ID"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    unique = str(uuid.uuid4())[:8].upper()
    return f"{prefix}{timestamp}{unique}" if prefix else f"{timestamp}{unique}"

def row_to_dict(row):
    """Convert SQLite row to dictionary"""
    if row is None:
        return None
    return dict(row)

def rows_to_dict(rows):
    """Convert multiple SQLite rows to list of dictionaries"""
    return [dict(row) for row in rows] if rows else []

# ========================================
# GUIDE CONTENT (STATIC DATA)
# ========================================

GUIDES = {
    "whatsapp": {
        "title": "व्हाट्सएप गाइड",
        "title_en": "WhatsApp Guide",
        "icon": "whatsapp",
        "color": "#22c55e",
        "modules": [
            {
                "id": "basics",
                "title": "व्हाट्सएप की शुरुआत",
                "title_en": "Getting Started with WhatsApp",
                "steps": [
                    {"step": 1, "hindi": "व्हाट्सएप आइकन ढूंढें - यह हरे रंग का होता है", "english": "Find WhatsApp icon - it is green in color", "hint": "अपने फोन की होम स्क्रीन पर देखें"},
                    {"step": 2, "hindi": "व्हाट्सएप पर टैप करें", "english": "Tap on WhatsApp to open", "hint": "एक बार हल्के से टैप करें"},
                    {"step": 3, "hindi": "अपना फोन नंबर डालें", "english": "Enter your phone number", "hint": "देश कोड +91 के साथ डालें"},
                    {"step": 4, "hindi": "OTP वेरिफिकेशन करें", "english": "Verify with OTP code", "hint": "OTP स्वचालित रूप से आएगा"},
                    {"step": 5, "hindi": "अपना नाम और फोटो सेट करें", "english": "Set your name and profile photo", "hint": "यह आपकी प्रोफाइल होगी"}
                ]
            },
            {
                "id": "send_message",
                "title": "मैसेज भेजना सीखें",
                "title_en": "Learn to Send Messages",
                "steps": [
                    {"step": 1, "hindi": "नया मैसेज आइकन पर टैप करें", "english": "Tap the new message icon (blue round button)", "hint": "नीचे दाईं ओर नीला बटन"},
                    {"step": 2, "hindi": "संपर्क चुनें या नाम खोजें", "english": "Select contact or search by name", "hint": "खोज बॉक्स में नाम टाइप करें"},
                    {"step": 3, "hindi": "मैसेज बॉक्स में टैप करें", "english": "Tap on the message text box", "hint": "नीचे 'टाइप मैसेज' लिखा होगा"},
                    {"step": 4, "hindi": "अपना मैसेज लिखें", "english": "Type your message using keyboard", "hint": "कीबोर्ड से टाइप करें"},
                    {"step": 5, "hindi": "सेंड बटन पर टैप करें", "english": "Tap the send button (green arrow)", "hint": "दाईं ओर हरा तीर"}
                ]
            },
            {
                "id": "voice_message",
                "title": "वॉइस मैसेज भेजें",
                "title_en": "Send Voice Messages",
                "steps": [
                    {"step": 1, "hindi": "चैट खोलें जिसे मैसेज भेजना है", "english": "Open the chat where you want to send message", "hint": "संपर्क सूची से चुनें"},
                    {"step": 2, "hindi": "माइक्रोफोन आइकन दबाएं और पकड़े रखें", "english": "Press and hold the microphone icon", "hint": "दाईं ओर हरा माइक आइकन"},
                    {"step": 3, "hindi": "बोलना शुरू करें (बटन दबाए रखें)", "english": "Start speaking while holding button", "hint": "जब तक बोल रहे हों बटन न छोड़ें"},
                    {"step": 4, "hindi": "बटन छोड़ें - मैसेज भेज दिया जाएगा", "english": "Release button to send message", "hint": "स्वचालित रूप से भेज जाएगा"}
                ]
            },
            {
                "id": "video_call",
                "title": "वीडियो कॉल करें",
                "title_en": "Make Video Calls",
                "steps": [
                    {"step": 1, "hindi": "संपर्क की चैट खोलें", "english": "Open the contact's chat", "hint": "जिसे कॉल करना है"},
                    {"step": 2, "hindi": "वीडियो कॉल आइकन पर टैप करें", "english": "Tap the video call icon (camera symbol)", "hint": "ऊपर दाईं ओर कैमरा आइकन"},
                    {"step": 3, "hindi": "कॉल जुड़ने की प्रतीक्षा करें", "english": "Wait for the call to connect", "hint": "रिंगिंग सुनाई देगी"},
                    {"step": 4, "hindi": "कॉल खत्म करने के लिए लाल बटन दबाएं", "english": "Press red button to end call", "hint": "नीचे लाल फोन बटन"}
                ]
            },
            {
                "id": "send_photo",
                "title": "फोटो भेजें",
                "title_en": "Send Photos",
                "steps": [
                    {"step": 1, "hindi": "चैट में पेपरक्लिप/अटैच आइकन टैप करें", "english": "Tap the paperclip/attach icon in chat", "hint": "मैसेज बॉक्स के बगल में"},
                    {"step": 2, "hindi": "'गैलरी' या 'कैमरा' चुनें", "english": "Select 'Gallery' or 'Camera' option", "hint": "गैलरी से पुरानी फोटो, कैमरा से नई"},
                    {"step": 3, "hindi": "फोटो चुनें या नई फोटो लें", "english": "Select existing photo or take new photo", "hint": "फोटो पर टैप करके चुनें"},
                    {"step": 4, "hindi": "सेंड बटन पर टैप करें", "english": "Tap the send button", "hint": "हरे रंग का तीर आइकन"}
                ]
            }
        ]
    },
    "upi": {
        "title": "UPI सुरक्षा गाइड",
        "title_en": "UPI Safety Guide",
        "icon": "upi",
        "color": "#3b82f6",
        "modules": [
            {
                "id": "upi_basics",
                "title": "UPI क्या है?",
                "title_en": "What is UPI?",
                "steps": [
                    {"step": 1, "hindi": "UPI का मतलब Unified Payments Interface", "english": "UPI stands for Unified Payments Interface", "hint": "यह एक डिजिटल पेमेंट सिस्टम है"},
                    {"step": 2, "hindi": "24x7 पैसे भेज सकते हैं", "english": "Send money 24 hours, 7 days a week", "hint": "बैंक के समय की परवाह नहीं"},
                    {"step": 3, "hindi": "तुरंत पैसे ट्रांसफर होते हैं", "english": "Instant money transfer", "hint": "सेकंडों में पैसे पहुंच जाते हैं"}
                ]
            },
            {
                "id": "upi_safety_rules",
                "title": "UPI सुरक्षा नियम",
                "title_en": "UPI Safety Rules",
                "steps": [
                    {"step": 1, "hindi": "⚠️ कभी भी OTP किसी को न बताएं", "english": "⚠️ NEVER share OTP with anyone", "hint": "बैंक वाले भी OTP नहीं माँगते", "warning": True},
                    {"step": 2, "hindi": "⚠️ अजनबी से पैसे न भेजें", "english": "⚠️ Don't send money to strangers", "hint": "पहले पुष्टि करें कि व्यक्ति सही है", "warning": True},
                    {"step": 3, "hindi": "⚠️ लिंक पर क्लिक करने से पहले सोचें", "english": "⚠️ Think before clicking suspicious links", "hint": "संदिग्ध लिंक न खोलें", "warning": True},
                    {"step": 4, "hindi": "⚠️ फोन पर बैंक विवरण न दें", "english": "⚠️ Don't share bank details on phone", "hint": "बैंक कभी फोन पर विवरण नहीं माँगता", "warning": True},
                    {"step": 5, "hindi": "✓ UPI PIN हमेशा खुद डालें", "english": "✓ Always enter UPI PIN yourself", "hint": "किसी को अपना PIN न बताएं"},
                    {"step": 6, "hindi": "✓ ट्रांजैक्शन SMS जरूर देखें", "english": "✓ Always check transaction SMS", "hint": "पैसे गए या आए - SMS से पता चलेगा"}
                ]
            },
            {
                "id": "how_to_pay",
                "title": "पैसे कैसे भेजें",
                "title_en": "How to Send Money",
                "steps": [
                    {"step": 1, "hindi": "UPI ऐप खोलें (PhonePe, GPay, Paytm)", "english": "Open UPI app (PhonePe, GPay, Paytm)", "hint": "जो ऐप आप उपयोग करते हैं"},
                    {"step": 2, "hindi": "'Send Money' या 'पैसे भेजें' पर टैप करें", "english": "Tap 'Send Money' or similar option", "hint": "होम स्क्रीन पर मिलेगा"},
                    {"step": 3, "hindi": "फोन नंबर या UPI ID डालें", "english": "Enter phone number or UPI ID", "hint": "जिसे पैसे भेजना है"},
                    {"step": 4, "hindi": "रकम डालें", "english": "Enter amount in rupees", "hint": "कितने रुपये भेजने हैं"},
                    {"step": 5, "hindi": "UPI PIN डालें", "english": "Enter your UPI PIN", "hint": "आपका 4 या 6 अंकों का PIN"},
                    {"step": 6, "hindi": "पुष्टि SMS देखें", "english": "Check confirmation SMS from bank", "hint": "पैसे गए या नहीं"}
                ]
            },
            {
                "id": "emergency_check",
                "title": "संदिग्ध ट्रांजैक्शन?",
                "title_en": "Suspicious Transaction?",
                "steps": [
                    {"step": 1, "hindi": "तुरंत बैंक को कॉल करें", "english": "Call bank immediately", "hint": "बैंक हेल्पलाइन नंबर", "warning": True},
                    {"step": 2, "hindi": "UPI ऐप में 'Report Fraud' करें", "english": "Report fraud in UPI app", "hint": "ऐप में Help या Report मिलेगा", "warning": True},
                    {"step": 3, "hindi": "परिवार को सूचित करें", "english": "Inform family immediately", "hint": "तुरंत बेटे/बेटी को बताएं", "warning": True}
                ]
            }
        ]
    },
    "scam": {
        "title": "घोटाला अलर्ट",
        "title_en": "Scam Alert",
        "icon": "warning",
        "color": "#ef4444"
    },
    "ask_help": {
        "title": "मदद माँगें",
        "title_en": "Ask for Help",
        "icon": "help",
        "color": "#8b5cf6",
        "help_types": [
            {
                "id": "technical",
                "title": "तकनीकी समस्या",
                "title_en": "Technical Issue",
                "description": "फोन या ऐप में समस्या",
                "sub_options": ["फोन धीमा हो गया है", "ऐप नहीं खुल रहा", "इंटरनेट कनेक्शन", "अन्य तकनीकी समस्या"]
            },
            {
                "id": "payment",
                "title": "पेमेंट मदद",
                "title_en": "Payment Help",
                "description": "भुगतान संबंधी समस्या",
                "sub_options": ["गलत पैसे भेज गए", "रिफंड नहीं मिला", "UPI काम नहीं कर रहा", "अन्य पेमेंट समस्या"]
            },
            {
                "id": "guidance",
                "title": "मार्गदर्शन",
                "title_en": "Guidance",
                "description": "कुछ सीखना चाहते हैं",
                "sub_options": ["नई ऐप सीखनी है", "ऑनलाइन सेवाओं के बारे में", "सोशल मीडिया", "अन्य मार्गदर्शन"]
            },
            {
                "id": "report",
                "title": "धोखाधड़ी रिपोर्ट",
                "title_en": "Report Fraud",
                "description": "किसी घोटाले की रिपोर्ट",
                "sub_options": ["फोन कॉल घोटाला", "मैसेज/व्हाट्सएप घोटाला", "ऑनलाइन घोटाला", "अन्य रिपोर्ट"]
            }
        ],
        "emergency_contacts": [
            {"name": "Police", "name_hi": "पुलिस", "phone": "100", "icon": "police"},
            {"name": "Ambulance", "name_hi": "अम्बुलेंस", "phone": "102", "icon": "ambulance"},
            {"name": "Women Helpline", "name_hi": "महिला हेल्पलाइन", "phone": "1091", "icon": "women"},
            {"name": "Cyber Crime", "name_hi": "साइबर क्राइम", "phone": "1930", "icon": "cyber"}
        ]
    }
}

# ========================================
# API ROUTES
# ========================================

@app.route('/')
def index():
    """Render main application page"""
    return render_template('index.html')

@app.route('/api/user/<user_id>')
def get_user(user_id):
    """Get user profile with emergency contacts"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Get user
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        # Get emergency contacts
        cursor.execute(
            "SELECT name, phone, relation FROM emergency_contacts WHERE user_id = ? ORDER BY priority",
            (user_id,)
        )
        contacts = cursor.fetchall()
        
        # Get learning progress
        cursor.execute(
            "SELECT guide_type, module_id, completed FROM learning_progress WHERE user_id = ?",
            (user_id,)
        )
        progress_rows = cursor.fetchall()
        
        db.close()
        
        # Build progress dictionary
        progress_dict = {}
        for p in progress_rows:
            guide_type = p['guide_type']
            if guide_type not in progress_dict:
                progress_dict[guide_type] = {'modules': [], 'total_completed': 0}
            progress_dict[guide_type]['modules'].append({
                'module_id': p['module_id'],
                'completed': bool(p['completed'])
            })
            if p['completed']:
                progress_dict[guide_type]['total_completed'] += 1
        
        return jsonify({
            "success": True,
            "user": {
                "id": user['id'],
                "name": user['name'],
                "name_en": user['name_en'],
                "phone": user['phone'],
                "language": user['language'],
                "emergency_contacts": rows_to_dict(contacts),
                "learning_progress": progress_dict
            },
            "greeting": get_greeting()
        })
        
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/guide/<guide_type>')
def get_guide(guide_type):
    """Get guide content by type"""
    try:
        guide = GUIDES.get(guide_type)
        
        if not guide:
            return jsonify({"success": False, "error": "Guide not found"}), 404
        
        # If scam guide, fetch alerts from database
        if guide_type == 'scam':
            db = get_db()
            cursor = db.cursor()
            cursor.execute('''
                SELECT id, alert_type, title, title_en, description, description_en, verified, created_at
                FROM scam_alerts 
                WHERE expires_at > datetime('now') 
                ORDER BY created_at DESC
            ''')
            alerts = cursor.fetchall()
            db.close()
            
            guide = dict(guide)
            guide['active_alerts'] = rows_to_dict(alerts)
        
        return jsonify({"success": True, "guide": guide})
        
    except Exception as e:
        logger.error(f"Error fetching guide: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/progress', methods=['POST'])
def update_progress():
    """Update user learning progress"""
    try:
        data = request.json
        user_id = data.get('user_id', 'user_001')
        guide_type = data.get('guide_type')
        module_id = data.get('module_id')
        completed = data.get('completed', False)
        
        if not guide_type or not module_id:
            return jsonify({"success": False, "error": "Missing parameters"}), 400
        
        db = get_db()
        cursor = db.cursor()
        
        # Check if progress record exists
        cursor.execute('''
            SELECT id FROM learning_progress 
            WHERE user_id = ? AND guide_type = ? AND module_id = ?
        ''', (user_id, guide_type, module_id))
        
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE learning_progress 
                SET completed = ?, completed_at = datetime('now')
                WHERE user_id = ? AND guide_type = ? AND module_id = ?
            ''', (1 if completed else 0, user_id, guide_type, module_id))
        else:
            cursor.execute('''
                INSERT INTO learning_progress (user_id, guide_type, module_id, completed, completed_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            ''', (user_id, guide_type, module_id, 1 if completed else 0))
        
        db.commit()
        db.close()
        
        return jsonify({
            "success": True,
            "message": "Progress updated successfully"
        })
        
    except Exception as e:
        logger.error(f"Error updating progress: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/help', methods=['POST'])
def submit_help_request():
    """Submit help request"""
    try:
        data = request.json
        user_id = data.get('user_id', 'user_001')
        request_type = data.get('type', 'general')
        sub_type = data.get('sub_type', '')
        message = data.get('message', '')
        
        request_id = generate_id('HR-')
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            INSERT INTO help_requests (id, user_id, request_type, sub_type, message, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
        ''', (request_id, user_id, request_type, sub_type, message))
        
        # Log activity
        cursor.execute('''
            INSERT INTO activity_log (user_id, activity_type, details, created_at)
            VALUES (?, 'help_request', ?, datetime('now'))
        ''', (user_id, f"{request_type}: {sub_type}"))
        
        db.commit()
        db.close()
        
        logger.info(f"Help request created: {request_id}")
        
        return jsonify({
            "success": True,
            "message": "Help request submitted successfully",
            "request_id": request_id,
            "estimated_response": "15-30 minutes"
        })
        
    except Exception as e:
        logger.error(f"Error submitting help request: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/emergency', methods=['POST'])
def handle_emergency():
    """Handle emergency SOS"""
    try:
        data = request.json
        user_id = data.get('user_id', 'user_001')
        location = data.get('location', 'Unknown')
        
        sos_id = generate_id('SOS-')
        
        db = get_db()
        cursor = db.cursor()
        
        # Get user's emergency contacts
        cursor.execute('''
            SELECT name, phone, relation FROM emergency_contacts 
            WHERE user_id = ? ORDER BY priority
        ''', (user_id,))
        contacts = cursor.fetchall()
        
        contacts_json = json.dumps(rows_to_dict(contacts))
        
        # Create SOS record
        cursor.execute('''
            INSERT INTO emergency_sos (id, user_id, location, contacts_notified, status, created_at)
            VALUES (?, ?, ?, ?, 'sent', datetime('now'))
        ''', (sos_id, user_id, location, contacts_json))
        
        # Log activity
        cursor.execute('''
            INSERT INTO activity_log (user_id, activity_type, details, created_at)
            VALUES (?, 'emergency_sos', ?, datetime('now'))
        ''', (user_id, f"Location: {location}"))
        
        db.commit()
        db.close()
        
        logger.warning(f"EMERGENCY SOS: {sos_id} for user {user_id}")
        
        return jsonify({
            "success": True,
            "message": "Emergency contacts notified",
            "sos_id": sos_id,
            "contacts": rows_to_dict(contacts),
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error handling emergency: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/scam/report', methods=['POST'])
def report_scam():
    """Report a scam"""
    try:
        data = request.json
        user_id = data.get('user_id', 'user_001')
        scam_type = data.get('type', 'unknown')
        description = data.get('description', '')
        phone_number = data.get('phone', '')
        
        report_id = generate_id('SCAM-')
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            INSERT INTO scam_reports (id, user_id, scam_type, description, phone_number, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'under_review', datetime('now'))
        ''', (report_id, user_id, scam_type, description, phone_number))
        
        # Log activity
        cursor.execute('''
            INSERT INTO activity_log (user_id, activity_type, details, created_at)
            VALUES (?, 'scam_report', ?, datetime('now'))
        ''', (user_id, scam_type))
        
        db.commit()
        db.close()
        
        logger.info(f"Scam report created: {report_id}")
        
        return jsonify({
            "success": True,
            "message": "Scam reported successfully",
            "report_id": report_id,
            "warning": "Our team will review and take action"
        })
        
    except Exception as e:
        logger.error(f"Error reporting scam: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/scam/alerts')
def get_scam_alerts():
    """Get active scam alerts"""
    try:
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            SELECT id, alert_type, title, title_en, description, description_en, verified, created_at
            FROM scam_alerts 
            WHERE expires_at > datetime('now') 
            ORDER BY created_at DESC
        ''')
        alerts = cursor.fetchall()
        
        db.close()
        
        return jsonify({
            "success": True,
            "alerts": rows_to_dict(alerts)
        })
        
    except Exception as e:
        logger.error(f"Error fetching scam alerts: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/contacts/emergency')
def get_emergency_contacts():
    """Get emergency contacts"""
    try:
        user_id = request.args.get('user_id', 'user_001')
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            SELECT name, phone, relation FROM emergency_contacts 
            WHERE user_id = ? ORDER BY priority
        ''', (user_id,))
        contacts = cursor.fetchall()
        
        db.close()
        
        helplines = [
            {"name": "Police", "name_hi": "पुलिस", "phone": "100", "icon": "police"},
            {"name": "Ambulance", "name_hi": "अम्बुलेंस", "phone": "102", "icon": "ambulance"},
            {"name": "Women Helpline", "name_hi": "महिला हेल्पलाइन", "phone": "1091", "icon": "women"},
            {"name": "Cyber Crime", "name_hi": "साइबर क्राइम", "phone": "1930", "icon": "cyber"}
        ]
        
        return jsonify({
            "success": True,
            "personal_contacts": rows_to_dict(contacts),
            "helplines": helplines
        })
        
    except Exception as e:
        logger.error(f"Error fetching emergency contacts: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/activity/log', methods=['POST'])
def log_activity():
    """Log user activity"""
    try:
        data = request.json
        user_id = data.get('user_id', 'user_001')
        activity_type = data.get('type', 'general')
        details = data.get('details', '')
        
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            INSERT INTO activity_log (user_id, activity_type, details, created_at)
            VALUES (?, ?, ?, datetime('now'))
        ''', (user_id, activity_type, details))
        
        # Update last active
        cursor.execute('''
            UPDATE users SET last_active = datetime('now') WHERE id = ?
        ''', (user_id,))
        
        db.commit()
        db.close()
        
        return jsonify({"success": True})
        
    except Exception as e:
        logger.error(f"Error logging activity: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ========================================
# ERROR HANDLERS
# ========================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "Not found"}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({"success": False, "error": "Server error"}), 500

# ========================================
# RUN APPLICATION
# ========================================

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Digital Saathi Server Starting...")
    print("=" * 60)
    print("📱 Server running on: http://localhost:5000")
    print("👤 Default User ID: user_001")
    print("📊 Database: digital_saathi.db")
    print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
