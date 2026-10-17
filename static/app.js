const $ = id => document.getElementById(id);

const FLAG_CODES = ["ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "eh", "er", "es", "et", "eu", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mf", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sx", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tw", "tz", "ua", "ug", "um", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi", "vn", "vu", "wf", "ws", "xk", "ye", "yt", "za", "zm", "zw", "ac"];
function flagEmoji(code) {
  if (code === "white") return "🏳️";
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join("");
}
const FLAGS = ["ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "eh", "er", "es", "et", "eu", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mf", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sx", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tw", "tz", "ua", "ug", "um", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi", "vn", "vu", "wf", "ws", "xk", "ye", "yt", "za", "zm", "zw", "ac"].map(flagEmoji);
FLAGS.push("🏳️");

function flagCode(flag) {
  const points = [...String(flag)].map(ch => ch.codePointAt(0));
  const regional = points.filter(n => n >= 0x1F1E6 && n <= 0x1F1FF);
  if (regional.length === 2) {
    return regional.map(n => String.fromCharCode(n - 127397)).join("").toLowerCase();
  }
  return "";
}

function flagName(flag) {
  const code = flagCode(flag);
  if (!code) return "Other flag";
  try {
    return new Intl.DisplayNames(["en"], {type: "region"}).of(code.toUpperCase()) || code.toUpperCase();
  } catch (_) {
    return code.toUpperCase();
  }
}

function flagHtml(flag, size = 26) {
  const code = flagCode(flag);
  if (!code) return `<span class="flag-fallback" style="font-size:${size}px">${esc(flag)}</span>`;
  const name = flagName(flag);
  const emoji = esc(flag);
  return `<span class="flag-image-wrap" title="${esc(name)}">
    <img src="https://flagcdn.com/w40/${code}.png"
         width="${size}" alt="${esc(name)}"
         loading="lazy"
         onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">
    <span class="flag-fallback" style="display:none;font-size:${size}px">${emoji}</span>
  </span>`;
}

let chats = [];
let activeChat = null;
let lastId = 0;
let users = [];
let myFlag = "🏳️";
let pollBusy = false;
let typingLast = 0;

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
    headers
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
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function time(value) {
  const date = new Date(value);
  return isNaN(date)
    ? ""
    : date.toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore",
        hour: "2-digit",
        minute: "2-digit"
      });
}





function dateHeading(value) {
  const date = new Date(value);

  if (isNaN(date)) return "";

  const day = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    weekday: "long"
  }).format(date);

  const parts = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).formatToParts(date);

  const dayNumber = Number(parts.find(p => p.type === "day").value);
  const month = parts.find(p => p.type === "month").value;
  const year = parts.find(p => p.type === "year").value;

  const suffix =
    dayNumber % 100 >= 11 && dayNumber % 100 <= 13
      ? "th"
      : dayNumber % 10 === 1
        ? "st"
        : dayNumber % 10 === 2
          ? "nd"
          : dayNumber % 10 === 3
            ? "rd"
            : "th";

  return `${day}, ${dayNumber}${suffix} ${month} ${year}`;
}

function singaporeDateKey(value) {
  const date = new Date(value);

  if (isNaN(date)) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
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

  const filtered = chats.filter(chat =>
    `${chat.title} ${chat.last_message}`.toLowerCase().includes(filter)
  );

  $("chatList").innerHTML = filtered.length
    ? filtered.map(chat => `
        <button class="chat-item ${
          activeChat?.id === chat.id ? "selected" : ""
        }" data-id="${chat.id}">
          <span class="avatar ${
            chat.is_group ? "group-avatar" : ""
          }">${esc(chat.title.slice(0, 1).toUpperCase())}</span>
          <span class="chat-item-copy">
            <strong>${esc(chat.title)}</strong>
            <span class="chat-preview">
              ${esc(chat.last_sender ? chat.last_sender + ": " : "")}${esc(chat.last_message)}
            </span>
          </span>
        </button>
      `).join("")
    : `<div class="empty-list">${
        filter ? "No matching chats." : "No chats yet. Start a new chat."
      }</div>`;

  $("chatList").querySelectorAll("[data-id]").forEach(button => {
    button.onclick = () => openChat(Number(button.dataset.id));
  });
}

function msgHtml(message) {
  const attachment = message.attachment
    ? message.attachment_type === "image"
      ? `<a href="${esc(message.attachment)}" target="_blank" rel="noopener">
           <img class="attachment-image"
                src="${esc(message.attachment)}"
                loading="lazy"
                alt="Shared image">
         </a>`
      : `<audio controls preload="none" src="${esc(message.attachment)}"></audio>`
    : "";

  const body = message.deleted
    ? "<i>This message was deleted</i>"
    : `${esc(message.body).replace(/\n/g, "<br>")}${attachment}`;

  return `
    <div class="message-row ${message.own ? "own" : ""}" data-mid="${message.id}" data-date-key="${singaporeDateKey(message.created_at)}">
      ${!message.own
        ? `<span class="message-sender">${esc(message.sender)}</span>`
        : ""}
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
    const messages = await api(
      `/api/conversations/${conversationId}/messages?after=${initial ? 0 : lastId}`
    );

    if (!activeChat || activeChat.id !== conversationId) return;

    if (initial) {
      $("messages").innerHTML = "";
      lastId = 0;
    }

    if (messages.length) {
      const container = $("messages");

      messages.forEach(message => {
        const currentDate = singaporeDateKey(message.created_at);
        const rows = container.querySelectorAll(".message-row");
        const previousRow = rows.length ? rows[rows.length - 1] : null;
        const previousDate = previousRow?.dataset.dateKey || "";

        if (currentDate && currentDate !== previousDate) {
          container.insertAdjacentHTML(
            "beforeend",
            `<div class="date-separator"><span>${esc(dateHeading(message.created_at))}</span></div>`
          );
        }

        container.insertAdjacentHTML("beforeend", msgHtml(message));
      });

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
      <span class="avatar">${flagHtml(user.flag, 24)}</span>
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
      <span class="avatar">${flagHtml(user.flag, 24)}</span>
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
        user_ids: [
          ...$("groupUsers").querySelectorAll("input:checked")
        ].map(input => Number(input.value))
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
  const emojis = [
    "😀","😂","🥹","😍","😎","😭","👍","👎","❤️","🔥",
    "🎉","🙏","🤔","💀","✨","😴","🙌","🤝","💚","😡"
  ];

  const answer = prompt(
    "Choose an emoji by number:\n" +
    emojis.map((emoji, index) => `${index + 1}. ${emoji}`).join("  ")
  );

  const number = Number(answer);

  if (number >= 1 && number <= emojis.length) {
    $("messageInput").value += emojis[number - 1];
    $("messageInput").focus();
  }
};

async function profile() {
  const me = await api("/api/me");
  myFlag = me.flag;
  $("myFlag").innerHTML = flagHtml(myFlag, 22);
  $("myAvatar").innerHTML = flagHtml(myFlag, 28);

  const search = $("flagSearch");
  const renderFlags = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const filtered = FLAGS.filter(flag =>
      flagName(flag).toLowerCase().includes(query) ||
      flagCode(flag).includes(query)
    );

    $("flagGrid").innerHTML = filtered.map(flag => `
      <button type="button"
              class="flag-choice ${flag === myFlag ? "active" : ""}"
              data-flag="${esc(flag)}"
              title="${esc(flagName(flag))}">
        ${flagHtml(flag, 28)}
        <small>${esc(flagName(flag))}</small>
      </button>
    `).join("");

    $("flagGrid").querySelectorAll("[data-flag]").forEach(button => {
      button.onclick = async () => {
        try {
          const result = await api("/api/flag", {
            method: "POST",
            body: JSON.stringify({flag: button.dataset.flag})
          });
          myFlag = result.flag;
          $("myFlag").innerHTML = flagHtml(myFlag, 22);
          $("myAvatar").innerHTML = flagHtml(myFlag, 28);
          $("settingsDialog").close();
          toast("Flag updated!");
          await refreshChats();
        } catch (error) {
          toast(error.message);
        }
      };
    });
  };

  if (search && !search.dataset.bound) {
    search.addEventListener("input", renderFlags);
    search.dataset.bound = "true";
  }
  renderFlags();
}

$("settingsBtn").onclick = async () => {
  try {
    await profile();
    $("settingsDialog").showModal();
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
      <span>${flagHtml(user.flag, 22)} ${esc(user.username)}</span>
      <button class="secondary" data-trade="${user.id}">Offer swap</button>
    </div>
  `).join("") || '<p class="tiny">No friends to trade with yet.</p>';

  $("tradeCreate").querySelectorAll("[data-trade]").forEach(button => {
    button.onclick = async () => {
      try {
        await api("/api/trades", {
          method: "POST",
          body: JSON.stringify({
            to_user_id: Number(button.dataset.trade)
          })
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
            <strong>${trade.incoming
              ? "From " + esc(trade.from)
              : "To " + esc(trade.to)}</strong>
            <p>${flagHtml(trade.offered_flag, 22)} ⇄ ${flagHtml(trade.requested_flag, 22)}
              · ${esc(trade.status)}</p>
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
          <span>${flagHtml(user.flag, 22)} ${esc(user.username)}</span>
          ${user.username !== window.CURRENT_USERNAME
            ? `<button class="secondary" data-remove="${user.id}">Remove</button>`
            : "<small>You</small>"}
        </div>
      `).join("");

      $("adminList").querySelectorAll("[data-remove]").forEach(button => {
        button.onclick = async () => {
          if (!confirm("Remove this account?")) return;

          try {
            await api(`/api/admin/users/${button.dataset.remove}`, {
              method: "DELETE"
            });

            toast("Account removed");
            button.closest(".trade-user").remove();
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
    await api("/api/heartbeat", {
      method: "POST",
      body: "{}"
    });
  } catch (_) {}
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
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
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

    $("callTitle").textContent =
      `${mode === "video" ? "Video" : "Voice"} call · ${peer.username}`;

    $("callStatus").textContent = incoming ? "Connecting…" : "Calling…";

    if (!$("callDialog").open) {
      $("callDialog").showModal();
    }

    if (!incoming) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Carry the call mode separately from the SDP description.
      await sendSignal("offer", {
        mode,
        description: pc.localDescription
      });
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
    body: JSON.stringify({
      conversation_id: callCid,
      to_user_id: callPeer.id,
      kind,
      payload
    })
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
    await setupCall(
      incoming.peer,
      incoming.mode,
      true,
      incoming.cid
    );

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
    const signals = await api(
      `/api/call-signal?after=${signalCursor}`
    );

    for (const signal of signals) {
      signalCursor = Math.max(signalCursor, signal.id);

      if (signal.kind === "offer") {
        if (pc || pendingOffer) continue;

        const conversation = chats.find(
          chat => chat.id === signal.conversation_id
        );

        if (!conversation) continue;

        let peer = users.find(
          user => user.id === signal.from_user_id
        );

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
        $("callStatus").textContent =
          "Accept to connect. Allow microphone/camera access.";

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
          // Keep early candidates until the remote description is set.
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
// Change password
const changePasswordForm = $("changePasswordForm");

if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async event => {
    event.preventDefault();

    const currentPassword = $("currentPassword").value;
    const newPassword = $("newPassword").value;
    const confirmPassword = $("confirmPassword").value;
    const message = $("passwordMessage");
    const submitButton = changePasswordForm.querySelector(
      'button[type="submit"]'
    );

    message.textContent = "";

    if (newPassword !== confirmPassword) {
      message.textContent = "The new passwords do not match.";
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      message.textContent =
        "Your new password must be between 8 and 128 characters.";
      return;
    }

    submitButton.disabled = true;

    try {
      const result = await api("/api/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      changePasswordForm.reset();
      message.textContent = result.message || "Password changed successfully.";
      toast("Password changed successfully.");
    } catch (error) {
      message.textContent = error.message || "Could not change password.";
    } finally {
      submitButton.disabled = false;
    }
  });
}