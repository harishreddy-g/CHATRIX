const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwt');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/Users');

const MAX_BODY = 2000;

const parseCookies = (header) => {
    const cookies = {};
    if (!header) return cookies;
    header.split(';').forEach((part) => {
        const idx = part.indexOf('=');
        if (idx === -1) return;
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        if (key) {
            try {
                cookies[key] = decodeURIComponent(val);
            } catch (e) {
                cookies[key] = val;
            }
        }
    });
    return cookies;
};

const authenticate = (socket) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    let token = cookies.token;

    if (!token) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader) {
            token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        }
    }

    if (!token) return null;

    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

const convRoom = (id) => `conv:${id}`;
const userRoom = (id) => `user:${id}`;

const initChatSocket = (io) => {
    io.on('connection', async (socket) => {
        const payload = authenticate(socket);
        if (!payload || !payload.userId) {
            socket.emit('auth:error', { message: 'Authentication required' });
            return socket.disconnect(true);
        }

        const userId = payload.userId.toString();
        socket.data.userId = userId;
        socket.join(userRoom(userId));

        try {
            const conversations = await Conversation.find({ participants: userId }).select('_id').lean();
            conversations.forEach((c) => socket.join(convRoom(c._id.toString())));
        } catch (error) {
            console.error('Socket join conversations error:', error.message);
        }

        socket.on('conversation:join', async (conversationId) => {
            try {
                if (typeof conversationId !== 'string') return;
                const conv = await Conversation.findOne({ _id: conversationId, participants: userId }).select('_id').lean();
                if (conv) socket.join(convRoom(conv._id.toString()));
            } catch (error) {
                console.error('conversation:join error:', error.message);
            }
        });

        socket.on('message:send', async (data, ack) => {
            const respond = typeof ack === 'function' ? ack : () => {};
            try {
                const conversationId = data && data.conversationId;
                const body = data && typeof data.body === 'string' ? data.body.trim() : '';

                if (!conversationId || !body) {
                    return respond({ ok: false, message: 'Conversation and message body are required' });
                }
                if (body.length > MAX_BODY) {
                    return respond({ ok: false, message: `Message too long (max ${MAX_BODY} characters)` });
                }

                const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
                if (!conv) {
                    return respond({ ok: false, message: 'Conversation not found' });
                }

                const message = await Message.create({ conversation: conv._id, sender: userId, body });

                conv.lastMessage = { body, sender: userId, createdAt: message.createdAt };
                await conv.save();

                const sender = await User.findById(userId).select('username profilePicture').lean();

                const outgoing = {
                    _id: message._id.toString(),
                    conversationId: conv._id.toString(),
                    sender: {
                        _id: userId,
                        username: sender ? sender.username : 'Unknown',
                        profilePicture: sender ? (sender.profilePicture || '') : ''
                    },
                    body: message.body,
                    createdAt: message.createdAt
                };

                conv.participants.forEach((pid) => {
                    io.to(userRoom(pid.toString())).emit('message:new', outgoing);
                });

                return respond({ ok: true, message: outgoing });
            } catch (error) {
                console.error('message:send error:', error.message);
                return respond({ ok: false, message: 'Unable to send message' });
            }
        });

        socket.on('typing', (data) => {
            try {
                const conversationId = data && data.conversationId;
                if (!conversationId || typeof conversationId !== 'string') return;
                socket.to(convRoom(conversationId)).emit('user:typing', {
                    conversationId,
                    userId,
                    isTyping: !!(data && data.isTyping)
                });
            } catch (error) {
                console.error('typing error:', error.message);
            }
        });
    });
};

module.exports = initChatSocket;
