
const $ = id => document.getElementById(id);

const FLAGS = [
  "🏳️","🇸🇬","🇮🇳","🇺🇸","🇬🇧","🇨🇦","🇦🇺","🇯🇵","🇰🇷","🇨🇳",
  "🇲🇾","🇮🇩","🇵🇭","🇹🇭","🇫🇷","🇩🇪","🇧🇷","🇳🇿","🇵🇰","🇱🇰",
  "🇳🇵","🇧🇩","🇿🇦","🇦🇪","🇳🇬","🇺🇦","🇹🇷","🇮🇹","🇪🇸","🇲🇽","🇪🇬"
];

let chats = [];
let activeChat = null;
let lastId = 0;
let users = [];
let myFlag = "🏳️";
let pollBusy = false;
let typingLast = 0;
let profilePic = null;

let pc = null;
let localStream = null;
let callPeer = null;
let callCid = null;
let signalCursor = 0;
let callMode = "video";
let pendingOffer = null;
let iceQueue = [];
let callPollTimer = null;

async function api(path, opts = {}) {
  const headers = {
    ...(opts.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(opts.headers || {})
  };

  const response = await fetch(path, {
    ...opts,
    headers,
    credentials: "same-origin"
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {}

  if (response.status === 401) {
    location.href = "/login";
    throw Error("Please log in again.");
  }

  if (!response.ok) {
    throw Error(data.error || "Request failed.");
  }

  return data;
}

function toast(message) {
  const el = $("toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => el.classList.remove("show"), 2600);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function displayAvatar(value, fallbackEl) {
  if (!value) {
    fallbackEl.textContent = "?";
    return;
  }

  const isUrl = /^https?:\/\//i.test(value) || value.startsWith("/");
  if (isUrl) {
    fallbackEl.innerHTML = `<img src="${esc(value)}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
  } else {
    fallbackEl.textContent = value;
  }
}

function time(value) {
  const date = new Date(value);
  return isNaN(date)
    ? ""
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
}

async function refreshChats() {
  if (pollBusy) return;

  pollBusy = true;

  try {
    chats = await api("/api/conversations");
    renderChats();

    if (activeChat) {
      const updated = chats.find(c => c.id === activeChat.id);
      if (updated) {
        activeChat = updated;
        $("chatTitle").textContent = updated.title;
        $("chatSubtitle").textContent = updated.subtitle;
      }
    }
  } catch (_) {
    // A later refresh can recover from a temporary network failure.
  } finally {
    pollBusy = false;
  }
}

function renderChats() {
  const filter = $("searchChats").value.toLowerCase();
  const filtered = chats.filter(chat => `${chat.title} ${chat.last_message}`.toLowerCase().includes(filter));

  $("chatList").innerHTML = filtered.length
    ? filtered.map(chat => `
        <button class="chat-item ${activeChat?.id === chat.id ? "selected" : ""}" data-id="${chat.id}">
          <span class="avatar ${chat.is_group ? "group-avatar" : ""}">${esc(chat.title.slice(0, 1).toUpperCase())}</span>
          <span class="chat-item-copy">
            <strong>${esc(chat.title)}</strong>
            <span class="chat-preview">${esc(chat.last_sender ? chat.last_sender + ": " : "")}${esc(chat.last_message)}</span>
          </span>
        </button>
      `).join("")
    : `<div class="empty-list">${filter ? "No matching chats." : "No chats yet. Start a new chat."}</div>`;

  $("chatList").querySelectorAll("[data-id]").forEach(button => {
    button.onclick = () => openChat(Number(button.dataset.id));
  });
}

function msgHtml(message) {
  const attachment = message.attachment
    ? message.attachment_type === "image"
      ? `<a href="${esc(message.attachment)}" target="_blank" rel="noopener"><img class="attachment-image" src="${esc(message.attachment)}" loading="lazy" alt="Shared image"></a>`
      : `<audio controls preload="none" src="${esc(message.attachment)}"></audio>`
    : "";

  const body = message.deleted
    ? "<i>This message was deleted</i>"
    : `${esc(message.body).replace(/\n/g, "<br>")}${attachment}`;

  return `
    <div class="message-row ${message.own ? "own" : ""}" data-mid="${message.id}">
      ${!message.own ? `<span class="message-sender">${esc(message.sender)}</span>` : ""}
      <div class="bubble">
        ${body}
        <span class="message-time">
          ${message.edited ? "edited · " : ""}
          ${time(message.created_at)}
          ${message.own ? (message.read ? "✓✓" : "✓") : ""}
        </span>
      </div>
      ${message.own && !message.deleted
        ? `<div class="message-tools">
             <button data-edit="${message.id}" data-body="${esc(message.body)}">Edit</button>
             <button data-delete="${message.id}">Delete</button>
           </div>`
        : ""}
    </div>
  `;
}

async function loadMessages(initial = false) {
  if (!activeChat) return;

  const conversationId = activeChat.id;

  try {
    const messages = await api(`/api/conversations/${conversationId}/messages?after=${initial ? 0 : lastId}`);

    if (!activeChat || activeChat.id !== conversationId) return;

    if (initial) {
      $("messages").innerHTML = "";
      lastId = 0;
    }

    if (messages.length) {
      $("messages").insertAdjacentHTML("beforeend", messages.map(msgHtml).join(""));
      lastId = Math.max(lastId, ...messages.map(message => message.id));
      $("messages").scrollTop = $("messages").scrollHeight;
      wireMessageTools();
    } else if (initial) {
      $("messages").innerHTML = `
        <div class="empty-messages">
          ✦
          <strong>Start the conversation</strong>
          <p>Say hello to get things going.</p>
        </div>
      `;
    }

    refreshChats();
  } catch (_) {
    // Preserve the existing conversation if a refresh fails.
  }
}

function wireMessageTools() {
  $("messages").querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = async () => {
      const body = prompt("Edit your message:", button.dataset.body);
      if (body === null) return;

      try {
        await api(`/api/messages/${button.dataset.edit}`, {
          method: "PATCH",
          body: JSON.stringify({ body })
        });
        await reloadCurrent();
      } catch (error) {
        toast(error.message);
      }
    };
  });

  $("messages").querySelectorAll("[data-delete]").forEach(button => {
    button.onclick = async () => {
      if (!confirm("Delete this message for everyone in this chat?")) return;

      try {
        await api(`/api/messages/${button.dataset.delete}`, {
          method: "DELETE"
        });
        await reloadCurrent();
      } catch (error) {
        toast(error.message);
      }
    };
  });
}

async function reloadCurrent() {
  if (!activeChat) return;
  lastId = 0;
  $("messages").innerHTML = "";
  await loadMessages(true);
}

async function openChat(id) {
  activeChat = chats.find(chat => chat.id === id);
  if (!activeChat) return;

  lastId = 0;
  $("welcome").classList.add("hidden");
  $("chatView").classList.remove("hidden");
  $("chatTitle").textContent = activeChat.title;
  $("chatSubtitle").textContent = activeChat.subtitle;
  $("chatAvatar").textContent = activeChat.title.slice(0, 1).toUpperCase();

  await loadMessages(true);
  $("messageInput").focus();
}

async function loadUsers() {
  users = await api("/api/users");

  const userRow = user => `
    <button class="user-option" data-user="${user.id}">
      <span class="avatar">${user.profile_pic ? `<img src="${esc(user.profile_pic)}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">` : esc(user.flag)}</span>
      <span>
        <strong>${esc(user.username)}</strong>
        <small>${user.online ? "● Online" : "Last seen recently"}</small>
      </span>
      <span class="option-arrow">›</span>
    </button>
  `;

  $("userList").innerHTML = users.length
    ? users.map(userRow).join("")
    : '<div class="empty-list">Ask a friend to register first.</div>';

  $("groupUsers").innerHTML = users.map(user => `
    <label class="user-option">
      <span class="avatar">${user.profile_pic ? `<img src="${esc(user.profile_pic)}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">` : esc(user.flag)}</span>
      <span>
        <strong>${esc(user.username)}</strong>
        <small>${user.online ? "Online" : "Offline"}</small>
      </span>
      <input type="checkbox" value="${user.id}">
    </label>
  `).join("");

  $("userList").querySelectorAll("[data-user]").forEach(button => {
    button.onclick = async () => {
      try {
        const result = await api("/api/direct", {
          method: "POST",
          body: JSON.stringify({ user_id: Number(button.dataset.user) })
        });
        $("newChatDialog").close();
        await refreshChats();
        await openChat(result.conversation.id);
      } catch (error) {
        toast(error.message);
      }
    };
  });
}

$("searchChats").oninput = renderChats;

$("newChatBtn").onclick = async () => {
  try {
    await loadUsers();
    $("newChatDialog").showModal();
  } catch (error) {
    toast(error.message);
  }
};

$("newGroupBtn").onclick = async () => {
  try {
    await loadUsers();
    $("groupDialog").showModal();
  } catch (error) {
    toast(error.message);
  }
};

$("closeGroup").onclick = () => $("groupDialog").close();

document.querySelectorAll(".close-dialog").forEach(button => {
  button.onclick = () => button.closest("dialog").close();
});

$("groupForm").onsubmit = async event => {
  event.preventDefault();

  try {
    const result = await api("/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: $("groupName").value,
        user_ids: [...$("groupUsers").querySelectorAll("input:checked")].map(input => Number(input.value))
      })
    });

    $("groupDialog").close();
    await refreshChats();
    await openChat(result.conversation.id);
    toast("Group created");
  } catch (error) {
    toast(error.message);
  }
};

$("messageForm").onsubmit = async event => {
  event.preventDefault();

  if (!activeChat) return;

  const body = $("messageInput").value.trim();
  const file = $("fileInput").files[0];

  if (!body && !file) return;

  const form = new FormData();
  form.append("body", body);
  if (file) form.append("file", file);

  try {
    await api(`/api/conversations/${activeChat.id}/messages`, {
      method: "POST",
      body: form
    });
    $("messageInput").value = "";
    $("fileInput").value = "";
    await loadMessages(false);
  } catch (error) {
    toast(error.message);
  }
};

$("messageInput").onkeydown = event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("messageForm").requestSubmit();
  }
};

$("messageInput").oninput = () => {
  typingLast = Date.now();
  $("typingStatus").textContent = "Typing…";

  setTimeout(() => {
    if (Date.now() - typingLast > 1600) {
      $("typingStatus").textContent = "";
    }
  }, 1700);
};

$("emojiBtn").onclick = () => {
  const emojis = ["😀","😂","🥹","😍","😎","😭","👍","👎","❤️","🔥","🎉","🙏","🤔","💀","✨","😴","🙌","🤝","💚","😡"];
  const answer = prompt("Choose an emoji by number:\n" + emojis.map((emoji, index) => `${index + 1}. ${emoji}`).join("  "));
  const number = Number(answer);

  if (number >= 1 && number <= emojis.length) {
    $("messageInput").value += emojis[number - 1];
    $("messageInput").focus();
  }
};

async function profile() {
  const me = await api("/api/me");

  myFlag = me.flag || "🏳️";
  profilePic = me.profile_pic || null;
  $("myFlag").textContent = myFlag;
  displayAvatar(profilePic, $("myAvatar"));

  $("profilePreview").textContent = "";
  displayAvatar(profilePic, $("profilePreview"));

  $("flagGrid").innerHTML = FLAGS.map(flag => `
    <button class="flag-choice ${flag === myFlag ? "active" : ""}" data-flag="${flag}">${flag}</button>
  `).join("");

  $("flagGrid").querySelectorAll("[data-flag]").forEach(button => {
    button.onclick = async () => {
      try {
        const result = await api("/api/flag", {
          method: "POST",
          body: JSON.stringify({ flag: button.dataset.flag })
        });

        myFlag = result.flag;
        $("myFlag").textContent = myFlag;
        displayAvatar(profilePic, $("myAvatar"));
        $("settingsDialog").close();
        toast("Flag updated!");
        await refreshChats();
      } catch (error) {
        toast(error.message);
      }
    };
  });
}

$("settingsBtn").onclick = async () => {
  try {
    await profile();
    $("settingsDialog").showModal();
  } catch (error) {
    toast(error.message);
  }
};

$("uploadProfileBtn").onclick = async () => {
  const file = $("profilePictureInput").files[0];
  if (!file) {
    toast("Choose a profile picture first.");
    return;
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const result = await api("/api/profile/picture", {
      method: "POST",
      body: form
    });
    profilePic = result.profile_pic;
    displayAvatar(profilePic, $("myAvatar"));
    displayAvatar(profilePic, $("profilePreview"));
    $("profilePictureInput").value = "";
    toast("Profile picture updated!");
  } catch (error) {
    toast(error.message);
  }
};

$("passwordForm").onsubmit = async event => {
  event.preventDefault();
  const oldPassword = $("oldPassword").value;
  const newPassword = $("newPassword").value;

  try {
    await api("/api/change-password", {
      method: "POST",
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    });
    $("oldPassword").value = "";
    $("newPassword").value = "";
    toast("Password updated.");
  } catch (error) {
    toast(error.message);
  }
};

$("tradeBtn").onclick = async () => {
  try {
    await loadUsers();
    await loadTrades();
    $("tradeDialog").showModal();
  } catch (error) {
    toast(error.message);
  }
};

async function loadTrades() {
  const trades = await api("/api/trades");

  $("tradeCreate").innerHTML = users.map(user => `
    <div class="trade-user">
      <span>${esc(user.flag)} ${esc(user.username)}</span>
      <button class="secondary" data-trade="${user.id}">Offer swap</button>
    </div>
  `).join("") || '<p class="tiny">No friends to trade with yet.</p>';

  $("tradeCreate").querySelectorAll("[data-trade]").forEach(button => {
    button.onclick = async () => {
      try {
        await api("/api/trades", {
          method: "POST",
          body: JSON.stringify({ to_user_id: Number(button.dataset.trade) })
        });
        toast("Trade offer sent");
        await loadTrades();
      } catch (error) {
        toast(error.message);
      }
    };
  });

  $("tradeList").innerHTML = trades.length
    ? trades.map(trade => `
        <div class="trade-card">
          <div>
            <strong>${trade.incoming ? "From " + esc(trade.from) : "To " + esc(trade.to)}</strong>
            <p>${esc(trade.offered_flag)} ⇄ ${esc(trade.requested_flag)} · ${esc(trade.status)}</p>
          </div>
          ${trade.incoming && trade.status === "pending"
            ? `<button class="primary" data-accept="${trade.id}">Accept</button>
               <button class="secondary" data-decline="${trade.id}">Decline</button>`
            : ""}
        </div>
      `).join("")
    : '<div class="empty-list">No trade requests yet.</div>';

  $("tradeList").querySelectorAll("[data-accept],[data-decline]").forEach(button => {
    button.onclick = async () => {
      const id = button.dataset.accept || button.dataset.decline;
      const action = button.dataset.accept ? "accept" : "decline";

      try {
        await api(`/api/trades/${id}`, {
          method: "POST",
          body: JSON.stringify({ action })
        });

        toast(action === "accept" ? "Flags swapped!" : "Trade declined");
        await profile();
        await loadTrades();
      } catch (error) {
        toast(error.message);
        await loadTrades();
      }
    };
  });
}

if (window.IS_ADMIN) {
  $("adminBtn").onclick = async () => {
    try {
      const admins = await api("/api/admin/users");

      $("adminList").innerHTML = admins.map(user => `
        <div class="trade-user">
          <span>${user.profile_pic ? `<img src="${esc(user.profile_pic)}" alt="avatar" style="width:28px;height:28px;object-fit:cover;border-radius:50%;">` : esc(user.flag)} ${esc(user.username)}</span>
          ${!user.is_admin && user.username !== window.CURRENT_USERNAME
            ? `<button class="secondary" data-promote="${user.id}">Promote</button>`
            : user.is_admin && user.username !== window.CURRENT_USERNAME
              ? `<button class="secondary" data-demote="${user.id}">Demote</button>`
              : "<small>You</small>"}
          ${user.username !== window.CURRENT_USERNAME
            ? `<button class="secondary" data-impersonate="${user.id}">Impersonate</button>`
            : ""}
        </div>
      `).join("");

      $("adminList").querySelectorAll("[data-promote]").forEach(button => {
        button.onclick = async () => {
          try {
            await api(`/api/admin/users/${button.dataset.promote}/promote`, { method: "POST", body: JSON.stringify({}) });
            toast("User promoted");
            $("adminBtn").click();
          } catch (error) {
            toast(error.message);
          }
        };
      });

      $("adminList").querySelectorAll("[data-demote]").forEach(button => {
        button.onclick = async () => {
          try {
            await api(`/api/admin/users/${button.dataset.demote}/demote`, { method: "POST", body: JSON.stringify({}) });
            toast("User demoted");
            $("adminBtn").click();
          } catch (error) {
            toast(error.message);
          }
        };
      });

      $("adminList").querySelectorAll("[data-impersonate]").forEach(button => {
        button.onclick = async () => {
          try {
            await api("/api/admin/impersonate/start", {
              method: "POST",
              body: JSON.stringify({ target_id: Number(button.dataset.impersonate) })
            });
            toast("Impersonation started");
            location.reload();
          } catch (error) {
            toast(error.message);
          }
        };
      });

      $("adminDialog").showModal();
    } catch (error) {
      toast(error.message);
    }
  };
}

async function presence() {
  try {
    await api("/api/heartbeat", { method: "POST", body: "{}" });
  } catch (_) {}
}

// SSE notifications for active sessions
function connectNotifications() {
  const es = new EventSource("/stream");
  es.addEventListener("message", event => {
    try {
      const data = JSON.parse(event.data);
      toast(data.from ? `${data.from}: ${data.body}` : "New notification");
    } catch (_) {
      toast("New notification");
    }
  });
  es.onerror = () => {
    setTimeout(connectNotifications, 1500);
  };
}

// Handle impersonation banner + stop button
async function setupImpersonation() {
  const me = await api("/api/me");
  if (me.impersonated_by) {
    const banner = document.createElement("div");
    banner.className = "toast impersonation-banner";
    banner.innerHTML = `Impersonating ${esc(me.username)} · <button id="stopImpersonationBtn" type="button">Stop</button>`;
    banner.style.display = "block";
    document.body.appendChild(banner);

    $("stopImpersonationBtn").onclick = async () => {
      try {
        await api("/api/admin/impersonate/stop", { method: "POST", body: JSON.stringify({}) });
        location.reload();
      } catch (error) {
        toast(error.message);
      }
    };
  }
}

/* VOICE AND VIDEO CALLS */

async function setupCall(peer, mode, incoming = false, conversationId = null) {
  if (pc) {
    throw Error("A call is already active.");
  }

  const selectedConversationId = conversationId ?? activeChat?.id;

  if (!selectedConversationId) {
    throw Error("Open a direct chat first.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw Error("Microphone and camera require a secure HTTPS connection.");
  }

  callPeer = peer;
  callMode = mode;
  callCid = selectedConversationId;

  if (!incoming) {
    iceQueue = [];
  }

  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.ontrack = event => {
      if (event.streams[0]) {
        $("remoteVideo").srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = event => {
      if (event.candidate) {
        sendSignal("ice", event.candidate.toJSON()).catch(error => {
          console.warn("ICE signalling failed:", error);
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc) {
        $("callStatus").textContent = pc.connectionState;
      }
    };

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video"
    });

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    $("localVideo").srcObject = localStream;
    $("localVideo").style.display = mode === "video" ? "block" : "none";
    $("remoteVideo").style.display = mode === "video" ? "block" : "none";

    $("callTitle").textContent = `${mode === "video" ? "Video" : "Voice"} call · ${peer.username}`;
    $("callStatus").textContent = incoming ? "Connecting…" : "Calling…";

    if (!$("callDialog").open) {
      $("callDialog").showModal();
    }

    if (!incoming) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", { mode, description: pc.localDescription });
    }
  } catch (error) {
    await stopCall(false);
    throw error;
  }
}

async function sendSignal(kind, payload) {
  if (!callPeer || !callCid) return;
  await api("/api/call-signal", {
    method: "POST",
    body: JSON.stringify({ conversation_id: callCid, to_user_id: callPeer.id, kind, payload })
  });
}

async function stopCall(sendHangup = true) {
  if (sendHangup && callPeer && callCid) {
    try {
      await sendSignal("hangup", {});
    } catch (_) {}
  }

  if (pc) {
    pc.onicecandidate = null;
    pc.close();
    pc = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  callPeer = null;
  callCid = null;
  pendingOffer = null;
  iceQueue = [];

  $("callDialog").close();
  $("remoteVideo").srcObject = null;
  $("localVideo").srcObject = null;
  $("acceptCallBtn").hidden = true;
  $("rejectCallBtn").hidden = true;
}

async function startOutgoingCall(mode) {
  if (!activeChat || activeChat.is_group) {
    toast("Calls currently work in direct chats only.");
    return;
  }

  let peer = users.find(user => user.username === activeChat.title);
  if (!peer) {
    await loadUsers();
    peer = users.find(user => user.username === activeChat?.title);
  }

  if (!peer) {
    throw Error("Friend not found. Refresh your chat list and try again.");
  }

  await setupCall(peer, mode);
}

$("callBtn").onclick = async () => {
  try {
    await startOutgoingCall("video");
  } catch (error) {
    toast("Call unavailable: " + error.message);
  }
};

$("voiceOnlyBtn").onclick = async () => {
  try {
    if (pendingOffer) {
      toast("Accept or decline the incoming call first.");
      return;
    }
    if (pc) {
      await stopCall(false);
    }
    await startOutgoingCall("voice");
  } catch (error) {
    toast("Voice call unavailable: " + error.message);
  }
};

$("hangupBtn").onclick = () => stopCall(true);

$("acceptCallBtn").onclick = async () => {
  const incoming = pendingOffer;
  if (!incoming) return;

  try {
    await setupCall(incoming.peer, incoming.mode, true, incoming.cid);
    await pc.setRemoteDescription(incoming.offer);
    for (const candidate of iceQueue) {
      await pc.addIceCandidate(candidate);
    }
    iceQueue = [];
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sendSignal("answer", pc.localDescription);
    $("acceptCallBtn").hidden = true;
    $("rejectCallBtn").hidden = true;
  } catch (error) {
    toast("Could not accept call: " + error.message);
    await stopCall(false);
  }
};

$("rejectCallBtn").onclick = async () => {
  const incoming = pendingOffer;
  if (incoming) {
    try {
      await api("/api/call-signal", {
        method: "POST",
        body: JSON.stringify({
          conversation_id: incoming.cid,
          to_user_id: incoming.peer.id,
          kind: "reject",
          payload: {}
        })
      });
    } catch (_) {}
  }

  await stopCall(false);
};

async function pollSignals() {
  try {
    const signals = await api(`/api/call-signal?after=${signalCursor}`);

    for (const signal of signals) {
      signalCursor = Math.max(signalCursor, signal.id);

      if (signal.kind === "offer") {
        if (pc || pendingOffer) continue;
        const conversation = chats.find(chat => chat.id === signal.conversation_id);
        if (!conversation) continue;

        let peer = users.find(user => user.id === signal.from_user_id);
        if (!peer) {
          await loadUsers();
          peer = users.find(user => user.id === signal.from_user_id);
        }
        if (!peer) continue;

        const payload = signal.payload || {};
        pendingOffer = {
          peer,
          cid: signal.conversation_id,
          mode: payload.mode === "voice" ? "voice" : "video",
          offer: payload.description || payload
        };

        $("callTitle").textContent = `Incoming call · ${peer.username}`;
        $("callStatus").textContent = "Accept to connect. Allow microphone/camera access.";
        $("acceptCallBtn").hidden = false;
        $("rejectCallBtn").hidden = false;

        if (!$("callDialog").open) {
          $("callDialog").showModal();
        }
      } else if (signal.kind === "answer" && pc) {
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(signal.payload);

          for (const candidate of iceQueue) {
            await pc.addIceCandidate(candidate);
          }

          iceQueue = [];
        }
      } else if (signal.kind === "ice") {
        if (!signal.payload) continue;

        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(signal.payload);
          } catch (error) {
            console.warn("Could not add ICE candidate:", error);
          }
        } else {
          iceQueue.push(signal.payload);
        }
      } else if (["hangup", "reject"].includes(signal.kind)) {
        toast(signal.kind === "reject" ? "Call declined" : "Call ended");
        await stopCall(false);
      }
    }
  } catch (_) {
    // Poll again on the next interval.
  }
}

async function start() {
  try {
    await profile();
    await refreshChats();
    await loadUsers();
    await setupImpersonation();
    connectNotifications();
  } catch (error) {
    console.warn("Initial loading failed:", error);
  }

  setInterval(refreshChats, 3500);
  setInterval(() => {
    if (activeChat) loadMessages(false);
  }, 3000);
  setInterval(presence, 15000);
  callPollTimer = setInterval(pollSignals, 1500);
}

start();
