(function () {
    const body = document.body;
    const me = {
        id: body.dataset.userId,
        username: body.dataset.username,
        avatar: body.dataset.avatar
    };
    const dmTarget = body.dataset.dmTarget || '';

    const listEl = document.getElementById('conversationList');
    const threadEl = document.getElementById('messageThread');
    const titleEl = document.getElementById('chatTitle');
    const typingEl = document.getElementById('typingIndicator');
    const form = document.getElementById('messageForm');
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    let socket = null;
    let conversations = [];
    let activeId = null;
    let typingTimeout = null;

    const escapeHtml = (str) => String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const formatTime = (iso) => {
        try {
            return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    async function api(path, options) {
        const res = await fetch(path, Object.assign({ headers: { 'Accept': 'application/json' } }, options || {}));
        if (!res.ok) {
            let msg = 'Request failed';
            try { const j = await res.json(); msg = j.message || msg; } catch (e) { /* ignore */ }
            throw new Error(msg);
        }
        return res.json();
    }

    function avatarHtml(name, url) {
        if (url) {
            return `<img src="${escapeHtml(url)}" class="avatar-small" alt="">`;
        }
        const initial = (name || '?').charAt(0).toUpperCase();
        return `<div class="avatar-small avatar-placeholder">${escapeHtml(initial)}</div>`;
    }

    function renderConversations() {
        if (!conversations.length) {
            listEl.innerHTML = '<p class="muted-text">No conversations yet. Message a friend from the dashboard.</p>';
            return;
        }

        listEl.innerHTML = conversations.map((c) => {
            const active = c._id === activeId ? ' active' : '';
            const preview = c.lastMessage
                ? escapeHtml(c.lastMessage.body)
                : '<span class="muted-text">No messages yet</span>';
            const groupTag = c.isGroup ? ' <span class="tag">Group</span>' : '';
            return `<button type="button" class="conversation-item${active}" data-id="${escapeHtml(c._id)}">
                ${avatarHtml(c.title, c.avatar)}
                <span class="conversation-meta">
                    <strong>${escapeHtml(c.title)}${groupTag}</strong>
                    <span class="conversation-preview">${preview}</span>
                </span>
            </button>`;
        }).join('');

        listEl.querySelectorAll('.conversation-item').forEach((btn) => {
            btn.addEventListener('click', () => openConversation(btn.dataset.id));
        });
    }

    function messageHtml(m) {
        const own = m.own || (m.sender && m.sender._id === me.id);
        const name = m.sender ? m.sender.username : '';
        const avatar = avatarHtml(name, m.sender ? m.sender.profilePicture : '');
        return `<div class="message-row${own ? ' own' : ''}">
            ${avatar}
            <div class="message-bubble">
                <div class="message-head"><strong>${escapeHtml(name)}</strong><span class="message-time">${formatTime(m.createdAt)}</span></div>
                <div class="message-body">${escapeHtml(m.body)}</div>
            </div>
        </div>`;
    }

    function renderMessages(messages) {
        threadEl.innerHTML = messages.map(messageHtml).join('');
        scrollToBottom();
    }

    function appendMessage(m) {
        threadEl.insertAdjacentHTML('beforeend', messageHtml(m));
        scrollToBottom();
    }

    function scrollToBottom() {
        threadEl.scrollTop = threadEl.scrollHeight;
    }

    async function openConversation(id) {
        activeId = id;
        const conv = conversations.find((c) => c._id === id);
        titleEl.textContent = conv ? conv.title : 'Conversation';
        input.disabled = false;
        sendBtn.disabled = false;
        typingEl.textContent = '';
        renderConversations();

        if (socket) socket.emit('conversation:join', id);

        try {
            const data = await api(`/api/chat/conversations/${id}/messages`);
            renderMessages(data.messages || []);
        } catch (err) {
            threadEl.innerHTML = `<p class="error-message">${escapeHtml(err.message)}</p>`;
        }
        input.focus();
    }

    async function loadConversations() {
        const data = await api('/api/chat/conversations');
        conversations = data.conversations || [];
        renderConversations();
        return conversations;
    }

    function updateConversationFromMessage(msg) {
        const c = conversations.find((x) => x._id === msg.conversationId);
        if (c) {
            c.lastMessage = { body: msg.body, createdAt: msg.createdAt, senderName: msg.sender.username };
            conversations = [c].concat(conversations.filter((x) => x._id !== c._id));
            renderConversations();
        } else {
            loadConversations();
        }
    }

    function connectSocket() {
        socket = io();

        socket.on('auth:error', () => {
            window.location.href = '/login';
        });

        socket.on('message:new', (msg) => {
            if (msg.conversationId === activeId) {
                appendMessage(msg);
            }
            updateConversationFromMessage(msg);
        });

        socket.on('user:typing', (data) => {
            if (data.conversationId !== activeId) return;
            typingEl.textContent = data.isTyping ? 'Someone is typing\u2026' : '';
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text || !activeId || !socket) return;

        socket.emit('message:send', { conversationId: activeId, body: text }, (resp) => {
            if (!resp || !resp.ok) {
                alert(resp && resp.message ? resp.message : 'Failed to send message');
                return;
            }
            input.value = '';
            socket.emit('typing', { conversationId: activeId, isTyping: false });
        });
    });

    input.addEventListener('input', () => {
        if (!socket || !activeId) return;
        socket.emit('typing', { conversationId: activeId, isTyping: true });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', { conversationId: activeId, isTyping: false });
        }, 1200);
    });

    async function openDmTarget() {
        try {
            const data = await api(`/api/chat/dm/${dmTarget}`, { method: 'POST' });
            await loadConversations();
            if (data.conversation && data.conversation._id) {
                await openConversation(data.conversation._id);
            }
        } catch (err) {
            listEl.insertAdjacentHTML('afterbegin', `<p class="error-message">${escapeHtml(err.message)}</p>`);
        }
    }

    async function init() {
        try {
            await loadConversations();
        } catch (err) {
            listEl.innerHTML = `<p class="error-message">${escapeHtml(err.message)}</p>`;
        }

        connectSocket();

        if (dmTarget) {
            await openDmTarget();
        } else if (conversations.length) {
            await openConversation(conversations[0]._id);
        }
    }

    init();
})();
