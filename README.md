Digital Saathi (डिजिटल साथी)
Digital Saathi is a bilingual (Hindi–English), senior‑friendly smartphone assistance web app that helps senior citizens use WhatsApp, UPI, and other digital services safely, while providing scam alerts and SOS emergency support.


Table of Contents
Features
Tech Stack

Getting Started

Configuration

API

Database

Design & Accessibility

Testing

Deployment

Security

Roadmap

Contributing

License

Support

Features
Core
WhatsApp Guide – Step‑by‑step tutorials (getting started, send messages, voice messages, etc.).

UPI Safety – Clear, simple digital payment safety guidelines.

Scam Alerts – Real‑time fraud warnings and protection tips.

Help Request – Multiple help categories and sub‑options to ask for support.

SOS Emergency – One‑tap emergency contact notification.

Additional
Quick Call Family – Direct call to emergency contacts.

Scam Reporting – Report fraud incidents with a simple form.

Real‑time Alerts – View active scam alerts.

Offline Support – Works without internet for basic guides and flows.

Accessibility First – Large fonts, high contrast, big touch targets, Hindi‑first content.

Tech Stack
Backend

Python 3.8+

Flask

Flask‑CORS

Frontend

HTML5, CSS3, Vanilla JavaScript

Custom CSS with CSS Variables

Fonts: Noto Sans Devanagari, Inter

Database

SQLite (embedded digital_saathi.db)

Getting Started
Prerequisites
Python 3.8 or higher

Modern browser (Chrome, Firefox, Safari, Edge, Samsung Internet)

~50 MB free disk space

Internet connection for first run (optional later)

Installation
bash
# Clone or create project directory
mkdir digital-saathi
cd digital-saathi

# (If repo exists)
# git clone https://github.com/yourusername/digital-saathi.git
# cd digital-saathi
Create structure if starting from scratch:

bash
mkdir -p templates
mkdir -p static/css
mkdir -p static/js

touch app.py
touch requirements.txt
touch templates/index.html
touch static/css/style.css
touch static/js/app.js
Install dependencies:

bash
pip install flask flask-cors
# or
pip install -r requirements.txt
Run Locally
bash
python app.py
Visit:

text
http://localhost:5000
Configuration
Optional .env in project root:

text
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///digital_saathi.db
Demo User
Default sample user for testing:

User ID: user_001

Name: श्रीमती शर्मा (Mrs. Sharma)

Phone: +91‑9876543210

Emergency contacts:

राहुल शर्मा (बेटा) – +91‑9876543211

प्रिया शर्मा (बेटी) – +91‑9876543212

डॉ. वर्मा – +91‑9876543213

API
User
GET /api/user/<user_id> – Get user profile.

POST /api/user/create – Create new user.

Guides
GET /api/guide/<guide_type> – Get guide content (e.g. WhatsApp, UPI).

POST /api/progress – Update learning/guide progress.

Help & Emergency
POST /api/help – Submit help request.

POST /api/emergency – Trigger SOS emergency.

GET /api/contacts/emergency – Get emergency contacts.

Scam & Security
POST /api/scam/report – Report a scam.

GET /api/scam/alerts – Get active scam alerts.

Activity
POST /api/activity/log – Log user activity.

Database
SQLite database: digital_saathi.db.

Tables
users

sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    phone TEXT,
    language TEXT DEFAULT 'hindi',
    created_at TIMESTAMP,
    last_active TIMESTAMP
);
emergency_contacts

sql
CREATE TABLE emergency_contacts (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relation TEXT,
    priority INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
help_requests

sql
CREATE TABLE help_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    request_type TEXT,
    sub_type TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
scam_reports

sql
CREATE TABLE scam_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    scam_type TEXT,
    description TEXT,
    phone_number TEXT,
    status TEXT DEFAULT 'under_review',
    created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
Design & Accessibility
UI
Primary Blue #3b82f6 – main actions & headers.

Success Green #10b981 – success states.

Warning Orange #f59e0b – warnings and alerts.

Danger Red #ef4444 – errors and emergency.

Help Purple #8b5cf6 – help section.

Background #f8fafc, text colors #1e3a5f and #64748b.

Fonts:

css
font-family: 'Noto Sans Devanagari', 'Inter', system-ui, sans-serif;
Font sizes via CSS vars:

css
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;
--font-size-2xl: 1.5rem;
Accessibility
WCAG 2.1 AA‑oriented design.

Minimum 48px touch targets.

Text contrast ≥ 4.5:1.

Visible focus states.

Screen‑reader friendly labels.

Keyboard navigable where applicable.

Testing
Manual Checklist (high level)
Home: greeting, user name, menu cards, quick actions, SOS modal.

WhatsApp Guide: modules list, step navigation, progress dots, readability.

UPI Safety: warning messages, step accessibility, completion message.

Scam Alerts: alerts load, form validation, submission.

Help Request: types and sub‑options, form submission, emergency contacts.

SOS Emergency: modal open/close, contacts display, confirm sends alert.

Automated
bash
pip install pytest pytest-cov

# Run tests
pytest tests/

# With coverage
pytest --cov=app tests/
Deployment
Production (local / server)
bash
pip install gunicorn

gunicorn -w 4 -b 0.0.0.0:5000 app:app
Heroku
bash
heroku login
heroku create digital-saathi
git push heroku main
Docker
Dockerfile:

text
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
Build & run:

bash
docker build -t digital-saathi .
docker run -p 5000:5000 digital-saathi
Security
Implemented:

Input validation on all forms.

Parameterized queries (SQL injection protection).

XSS protection (HTML escaping).

CSRF protection (Flask‑WTF).

Secure session management.

No sensitive data in URLs.

Recommended for production:

python
from flask_talisman import Talisman
from flask_limiter import Limiter

Talisman(app)  # Force HTTPS

limiter = Limiter(app, default_limits=["200 per day", "50 per hour"])
Roadmap
v2.0 (Upcoming)

Voice‑based interface.

Multi‑language support (Tamil, Telugu, Bengali).

Video tutorials.

Family member dashboard.

Government services integration.

v3.0 (Future)

AI‑powered assistance.

Health monitoring integration.

Smart home device control.

Medication reminders.

Contributing
bash
# Fork & clone
git clone https://github.com/Apkbor/digital-saathi.git
cd digital-saathi

# Setup venv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Create feature branch
git checkout -b feature/your-feature

# Run app
python app.py
Follow PEP 8 for Python.

Use ESLint‑style guidelines for JS.

Prefer BEM for CSS naming.

Open a Pull Request with a clear description.

License
Distributed under the MIT License. See LICENSE for details.

Support
Email: arpityadav0076@gmail.com

Phone: +91-9540261625

Made with ❤️ for Senior Citizens
Digital Saathi – आपके डिजिटल जीवन में सहायक
