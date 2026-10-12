# 6wforever Plus

WhatsApp-inspired small-community chat app using Flask, SQLAlchemy, PostgreSQL and browser WebRTC.

## Features
- Accounts with password hashing
- Direct chats and group chats
- Message history, edit/delete own messages, read indicators
- Photo/audio file attachments (8 MB limit)
- Emoji quick picker
- Online status and typing indicators (lightweight polling)
- Voice/video calls via WebRTC; browser camera/microphone permission required
- Profile flag selection and flag trade offers; accepted offers swap flags
- Optional admin user list and account removal

## Local run
Python 3.11/3.12:
```bat
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set SECRET_KEY=use-a-long-random-secret
set ADMIN_USERNAME=yourusername
py app.py
```
Open http://127.0.0.1:5000. Register using the exact `ADMIN_USERNAME` to get admin rights. Local default database is SQLite.

## GitHub + Render
Upload the *contents* of this folder to a private GitHub repository. In Render, connect the repo as a Python Web Service:
- Build: `pip install -r requirements.txt`
- Start: `gunicorn --workers 1 --threads 8 --timeout 120 app:app`
- Environment: `SECRET_KEY` (random private value), `ADMIN_USERNAME` (your account username), `DATABASE_URL` (PostgreSQL Internal Database URL)
Use PostgreSQL for durable accounts/messages. Create the admin account after setting `ADMIN_USERNAME`. If the account already exists before setting it, this starter does not automatically promote it; use a fresh admin username or add a controlled migration.

To keep `https://6wforever.onrender.com`, the existing Render service that owns that hostname must be updated. If a friend owns it, they must grant access or connect/deploy this repository. Creating another service will usually create another hostname.

## Performance and production cautions
- The frontend uses lightweight polling (messages every 3 seconds; presence/typing every few seconds), not a continuously open Socket.IO connection. This is a tradeoff for simplicity; very large communities should use event-based infrastructure.
- WebRTC calls need camera/microphone permission and may need a TURN server on restrictive networks. Calls may fail across some NAT/firewall combinations without TURN.
- Uploaded files are stored on the web service's local filesystem. Render's filesystem can be ephemeral, so files may disappear after redeploy/restart. Use object storage for durable uploads.
- Read receipts are simplified for small group chats.
- This is a feature-rich starter, not a hardened WhatsApp replacement. Before public launch add CSRF protection, rate limits, moderation/reporting, account recovery, private object storage, call abuse controls, and review security. No end-to-end encryption is provided.
