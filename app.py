import os, time, secrets
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_, and_
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "replace-this-secret-before-deploy")
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024
dburl = os.environ.get("DATABASE_URL", "sqlite:///6wforever.db")
if dburl.startswith("postgres://"): dburl = dburl.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = dburl
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
UPLOAD_DIR = os.path.join(app.root_path, "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED = {"png","jpg","jpeg","gif","webp","mp3","wav","ogg","m4a","webm"}
db = SQLAlchemy(app)

conversation_members = db.Table("conversation_members",
    db.Column("conversation_id", db.Integer, db.ForeignKey("conversation.id"), primary_key=True),
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True))
trade_participants = db.Table("trade_participants",
    db.Column("trade_id", db.Integer, db.ForeignKey("trade.id"), primary_key=True),
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True))

class User(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    username=db.Column(db.String(24),unique=True,nullable=False,index=True)
    password_hash=db.Column(db.String(255),nullable=False)
    flag=db.Column(db.String(8),nullable=False,default="🏳️")
    last_seen=db.Column(db.Float,default=0,nullable=False)
    is_admin=db.Column(db.Boolean,default=False,nullable=False)
    created_at=db.Column(db.DateTime,default=lambda:datetime.now(timezone.utc),nullable=False)

class Conversation(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    name=db.Column(db.String(80))
    is_group=db.Column(db.Boolean,default=False,nullable=False)
    created_at=db.Column(db.DateTime,default=lambda:datetime.now(timezone.utc),nullable=False)
    members=db.relationship("User",secondary=conversation_members,backref="conversations",lazy="select")
    messages=db.relationship("Message",backref="conversation",lazy="dynamic",cascade="all, delete-orphan")

class Message(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    conversation_id=db.Column(db.Integer,db.ForeignKey("conversation.id"),nullable=False,index=True)
    sender_id=db.Column(db.Integer,db.ForeignKey("user.id"),nullable=False)
    body=db.Column(db.String(2000),nullable=False,default="")
    attachment=db.Column(db.String(500))
    attachment_type=db.Column(db.String(20))
    created_at=db.Column(db.DateTime,default=lambda:datetime.now(timezone.utc),nullable=False)
    edited_at=db.Column(db.DateTime)
    deleted=db.Column(db.Boolean,default=False,nullable=False)
    read_by=db.Column(db.String(2000),default="",nullable=False)
    sender=db.relationship("User")

class Trade(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    from_user_id=db.Column(db.Integer,db.ForeignKey("user.id"),nullable=False)
    to_user_id=db.Column(db.Integer,db.ForeignKey("user.id"),nullable=False)
    offered_flag=db.Column(db.String(8),nullable=False)
    requested_flag=db.Column(db.String(8),nullable=False)
    status=db.Column(db.String(20),default="pending",nullable=False)
    created_at=db.Column(db.DateTime,default=lambda:datetime.now(timezone.utc),nullable=False)
    from_user=db.relationship("User",foreign_keys=[from_user_id])
    to_user=db.relationship("User",foreign_keys=[to_user_id])

class CallSignal(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    conversation_id=db.Column(db.Integer,nullable=False,index=True)
    from_user_id=db.Column(db.Integer,nullable=False)
    to_user_id=db.Column(db.Integer,nullable=False)
    kind=db.Column(db.String(20),nullable=False)
    payload=db.Column(db.Text,nullable=False,default="{}")
    created_at=db.Column(db.Float,default=time.time,nullable=False)

def me():
    uid=session.get("user_id")
    return db.session.get(User,uid) if uid else None

def login_required(fn):
    @wraps(fn)
    def inner(*args,**kwargs):
        if not me():
            if request.path.startswith("/api/"): return jsonify(error="Please log in again."),401
            return redirect(url_for("login"))
        return fn(*args,**kwargs)
    return inner

def member(convo,user): return bool(convo and user and any(x.id==user.id for x in convo.members))
def convo_info(c,u):
    last=c.messages.order_by(Message.id.desc()).first()
    if c.is_group: title=c.name or "Group"; subtitle=", ".join(x.username for x in c.members if x.id!=u.id)
    else:
        other=next((x for x in c.members if x.id!=u.id),None)
        title=other.username if other else "Saved chat"; subtitle=f"{other.flag} · Direct message" if other else "Your chat"
    return {"id":c.id,"title":title,"subtitle":subtitle,"is_group":c.is_group,
            "last_message":("📎 Attachment" if last and last.attachment else last.body) if last else "Start a conversation",
            "last_sender":last.sender.username if last else "", "last_id":last.id if last else 0}
def msg_info(m,u):
    readers=[]
    try: readers=[int(x) for x in m.read_by.split(",") if x]
    except ValueError: pass
    return {"id":m.id,"sender":m.sender.username,"sender_id":m.sender_id,
        "body":"This message was deleted" if m.deleted else m.body,"attachment":m.attachment if not m.deleted else None,
        "attachment_type":m.attachment_type,"created_at":m.created_at.isoformat(),
        "edited":bool(m.edited_at),"deleted":m.deleted,"read":u.id in readers or m.sender_id==u.id,
        "own":m.sender_id==u.id}

@app.route("/")
def home():
    if not me(): return redirect(url_for("login"))
    return render_template("index.html",username=me().username,admin=me().is_admin)

@app.route("/login",methods=["GET","POST"])
def login():
    if me(): return redirect(url_for("home"))
    error=""
    if request.method=="POST":
        username=request.form.get("username","").strip().lower()
        user=User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash,request.form.get("password","")):
            session.clear(); session["user_id"]=user.id
            user.last_seen=time.time(); db.session.commit()
            return redirect(url_for("home"))
        error="Username or password is incorrect."
    return render_template("auth.html",mode="login",error=error)

@app.route("/register",methods=["GET","POST"])
def register():
    if me(): return redirect(url_for("home"))
    error=""
    if request.method=="POST":
        username=request.form.get("username","").strip().lower()
        password=request.form.get("password","")
        if not 3<=len(username)<=24 or not username.replace("_","").isalnum(): error="Username: 3–24 letters, numbers or underscores."
        elif len(password)<8: error="Password must be at least 8 characters."
        elif User.query.filter_by(username=username).first(): error="That username is already taken."
        else:
            admin_name=os.environ.get("ADMIN_USERNAME","").strip().lower()
            u=User(username=username,password_hash=generate_password_hash(password),is_admin=(username==admin_name))
            db.session.add(u); db.session.commit(); session.clear(); session["user_id"]=u.id
            return redirect(url_for("home"))
    return render_template("auth.html",mode="register",error=error)

@app.post("/logout")
@login_required
def logout(): session.clear(); return redirect(url_for("login"))

@app.get("/health")
def health(): return jsonify(status="ok",app="6wforever")

@app.before_request
def touch_user():
    u=me()
    if u and request.path.startswith("/api/") and request.path not in ("/api/heartbeat",):
        u.last_seen=time.time()
        db.session.commit()

@app.post("/api/heartbeat")
@login_required
def heartbeat():
    u=me(); u.last_seen=time.time(); db.session.commit()
    return jsonify(ok=True)

@app.get("/api/me")
@login_required
def api_me():
    u=me()
    return jsonify(username=u.username,flag=u.flag,is_admin=u.is_admin)

@app.post("/api/flag")
@login_required
def set_flag():
    u=me(); data=request.get_json(silent=True) or {}; flag=data.get("flag","")
    allowed={"🇸🇬","🇮🇳","🇺🇸","🇬🇧","🇨🇦","🇦🇺","🇯🇵","🇰🇷","🇨🇳","🇲🇾","🇮🇩","🇵🇭","🇹🇭","🇫🇷","🇩🇪","🇧🇷","🇳🇿","🇵🇰","🇱🇰","🇳🇵","🇧🇩","🇿🇦","🇦🇪","🇳🇬","🇺🇦","🇹🇷","🇮🇹","🇪🇸","🇲🇽","🇪🇬","🏳️"}
    if flag not in allowed: return jsonify(error="Choose a flag from the list."),400
    u.flag=flag; db.session.commit(); return jsonify(flag=u.flag)

@app.get("/api/users")
@login_required
def users():
    u=me()
    return jsonify([{"id":x.id,"username":x.username,"flag":x.flag,"online":time.time()-x.last_seen<45}
                    for x in User.query.filter(User.id!=u.id).order_by(User.username).all()])

@app.get("/api/conversations")
@login_required
def conversations():
    u=me()
    items=[]
    for c in u.conversations:
        items.append(convo_info(c,u))
    items.sort(key=lambda c:c["last_id"],reverse=True)
    return jsonify(items)

@app.post("/api/direct")
@login_required
def direct():
    u=me(); data=request.get_json(silent=True) or {}
    try: oid=int(data.get("user_id"))
    except (TypeError,ValueError): return jsonify(error="Choose a valid user."),400
    other=db.session.get(User,oid)
    if not other or other.id==u.id: return jsonify(error="Choose another user."),400
    for c in u.conversations:
        if not c.is_group and len(c.members)==2 and any(x.id==other.id for x in c.members): return jsonify(conversation=convo_info(c,u))
    c=Conversation(members=[u,other]); db.session.add(c); db.session.commit()
    return jsonify(conversation=convo_info(c,u))

@app.post("/api/groups")
@login_required
def groups():
    u=me(); data=request.get_json(silent=True) or {}; name=(data.get("name") or "").strip()
    if not 2<=len(name)<=80: return jsonify(error="Group name must be 2–80 characters."),400
    selected=[u]
    for raw in data.get("user_ids",[]):
        try: x=db.session.get(User,int(raw))
        except (ValueError,TypeError): x=None
        if x and x not in selected: selected.append(x)
    if len(selected)<2: return jsonify(error="Choose at least one other member."),400
    c=Conversation(name=name,is_group=True,members=selected); db.session.add(c); db.session.commit()
    return jsonify(conversation=convo_info(c,u))

@app.get("/api/conversations/<int:cid>/messages")
@login_required
def messages(cid):
    u=me(); c=db.session.get(Conversation,cid)
    if not member(c,u): return jsonify(error="Chat not found."),404
    try: after=max(0,int(request.args.get("after",0)))
    except ValueError: after=0
    rows=c.messages.filter(Message.id>after).order_by(Message.id.asc()).limit(100).all()
    for m in rows:
        if m.sender_id!=u.id:
            ids=[x for x in m.read_by.split(",") if x]
            if str(u.id) not in ids: ids.append(str(u.id)); m.read_by=",".join(ids)
    db.session.commit()
    return jsonify([msg_info(m,u) for m in rows])

def save_upload(file):
    if not file or not file.filename: return None,None
    ext=file.filename.rsplit(".",1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED: raise ValueError("Allowed: images (PNG/JPG/GIF/WebP) and audio (MP3/WAV/OGG/M4A/WebM).")
    name=secrets.token_hex(16)+"."+ext
    file.save(os.path.join(UPLOAD_DIR,secure_filename(name)))
    kind="image" if ext in {"png","jpg","jpeg","gif","webp"} else "audio"
    return "/static/uploads/"+name,kind

@app.post("/api/conversations/<int:cid>/messages")
@login_required
def send_message(cid):
    u=me(); c=db.session.get(Conversation,cid)
    if not member(c,u): return jsonify(error="Chat not found."),404
    body=(request.form.get("body") or "").strip()
    file=request.files.get("file")
    if not body and not (file and file.filename): return jsonify(error="Write a message or attach a file."),400
    if len(body)>2000: return jsonify(error="Messages must be 2,000 characters or fewer."),400
    try: attachment,kind=save_upload(file)
    except ValueError as e: return jsonify(error=str(e)),400
    m=Message(conversation_id=cid,sender_id=u.id,body=body,attachment=attachment,attachment_type=kind)
    db.session.add(m); db.session.commit()
    return jsonify(id=m.id),201

@app.patch("/api/messages/<int:mid>")
@login_required
def edit_message(mid):
    u=me(); m=db.session.get(Message,mid)
    if not m or m.sender_id!=u.id or m.deleted: return jsonify(error="You cannot edit this message."),403
    body=((request.get_json(silent=True) or {}).get("body") or "").strip()
    if not body or len(body)>2000: return jsonify(error="Message must be 1–2,000 characters."),400
    m.body=body; m.edited_at=datetime.now(timezone.utc); db.session.commit()
    return jsonify(ok=True)

@app.delete("/api/messages/<int:mid>")
@login_required
def delete_message(mid):
    u=me(); m=db.session.get(Message,mid)
    if not m or m.sender_id!=u.id: return jsonify(error="You can only delete your own messages."),403
    m.body=""; m.attachment=None; m.deleted=True; db.session.commit()
    return jsonify(ok=True)

@app.get("/api/trades")
@login_required
def trades():
    u=me()
    rows=Trade.query.filter(or_(Trade.from_user_id==u.id,Trade.to_user_id==u.id)).order_by(Trade.id.desc()).limit(50).all()
    return jsonify([{"id":t.id,"from":t.from_user.username,"to":t.to_user.username,"offered_flag":t.offered_flag,
      "requested_flag":t.requested_flag,"status":t.status,"incoming":t.to_user_id==u.id} for t in rows])

@app.post("/api/trades")
@login_required
def create_trade():
    u=me(); data=request.get_json(silent=True) or {}
    try: other=db.session.get(User,int(data.get("to_user_id")))
    except (ValueError,TypeError): other=None
    if not other or other.id==u.id: return jsonify(error="Choose a friend to trade with."),400
    if u.flag=="🏳️": return jsonify(error="Choose your flag before offering a trade."),400
    if other.flag=="🏳️": return jsonify(error="That friend needs to choose a flag first."),400
    if Trade.query.filter(Trade.status=="pending",or_(and_(Trade.from_user_id==u.id,Trade.to_user_id==other.id),and_(Trade.from_user_id==other.id,Trade.to_user_id==u.id))).first():
        return jsonify(error="There is already a pending trade between you two."),400
    t=Trade(from_user_id=u.id,to_user_id=other.id,offered_flag=u.flag,requested_flag=other.flag)
    db.session.add(t); db.session.commit()
    return jsonify(ok=True)

@app.post("/api/trades/<int:tid>")
@login_required
def respond_trade(tid):
    u=me(); t=db.session.get(Trade,tid); data=request.get_json(silent=True) or {}; action=data.get("action")
    if not t or t.to_user_id!=u.id or t.status!="pending": return jsonify(error="This trade is no longer available."),400
    if action=="decline": t.status="declined"
    elif action=="accept":
        sender=db.session.get(User,t.from_user_id)
        # Only exchange if both still hold the flags offered in this trade.
        if sender.flag!=t.offered_flag or u.flag!=t.requested_flag:
            t.status="declined"; db.session.commit()
            return jsonify(error="A flag changed before the trade. The trade was cancelled."),400
        sender.flag,u.flag=u.flag,sender.flag; t.status="accepted"
    else: return jsonify(error="Choose accept or decline."),400
    db.session.commit(); return jsonify(ok=True,status=t.status)

@app.get("/api/admin/users")
@login_required
def admin_users():
    u=me()
    if not u.is_admin: return jsonify(error="Admin only."),403
    return jsonify([{"id":x.id,"username":x.username,"flag":x.flag,"created_at":x.created_at.isoformat()} for x in User.query.order_by(User.id).all()])

@app.delete("/api/admin/users/<int:uid>")
@login_required
def admin_delete_user(uid):
    u=me()
    if not u.is_admin: return jsonify(error="Admin only."),403
    target=db.session.get(User,uid)
    if not target or target.id==u.id: return jsonify(error="Cannot delete this account."),400
    for c in list(target.conversations):
        # Keep group chat membership intact for others; remove only this member.
        c.members=[x for x in c.members if x.id!=target.id]
    Message.query.filter_by(sender_id=target.id).delete()
    Trade.query.filter(or_(Trade.from_user_id==target.id,Trade.to_user_id==target.id)).delete()
    db.session.delete(target); db.session.commit(); return jsonify(ok=True)

@app.post("/api/call-signal")
@login_required
def post_signal():
    u=me(); data=request.get_json(silent=True) or {}
    try: cid=int(data.get("conversation_id")); toid=int(data.get("to_user_id"))
    except (TypeError,ValueError): return jsonify(error="Invalid call."),400
    c=db.session.get(Conversation,cid)
    if not member(c,u) or not any(x.id==toid for x in c.members): return jsonify(error="Call member not found."),403
    kind=data.get("kind","")
    if kind not in {"offer","answer","ice","hangup","reject"}: return jsonify(error="Invalid signal."),400
    import json
    payload=json.dumps(data.get("payload",{}))
    db.session.add(CallSignal(conversation_id=cid,from_user_id=u.id,to_user_id=toid,kind=kind,payload=payload))
    db.session.commit()
    return jsonify(ok=True)

@app.get("/api/call-signal")
@login_required
def get_signals():
    u=me()
    try: after=max(0,int(request.args.get("after",0)))
    except ValueError: after=0
    rows=CallSignal.query.filter_by(to_user_id=u.id).filter(CallSignal.id>after).order_by(CallSignal.id.asc()).limit(50).all()
    import json
    result=[{"id":s.id,"conversation_id":s.conversation_id,"from_user_id":s.from_user_id,"kind":s.kind,"payload":json.loads(s.payload)} for s in rows]
    if rows: CallSignal.query.filter(CallSignal.id<=rows[-1].id,CallSignal.to_user_id==u.id).delete()
    db.session.commit()
    return jsonify(result)

with app.app_context():
    db.create_all()

if __name__=="__main__":
    app.run(debug=False,port=int(os.environ.get("PORT",5000)))
