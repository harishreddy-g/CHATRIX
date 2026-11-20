const mongoose = require('mongoose');
const User = require('../models/Users');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const ensureGroupMembership = async (userId) => {
    await Conversation.updateMany(
        { isGroup: true, participants: { $ne: userId } },
        { $addToSet: { participants: userId } }
    );
};

exports.renderChat = async (req, res) => {
    try {
        await ensureGroupMembership(req.user.userId);
        const user = await User.findById(req.user.userId).select('username profilePicture').lean();

        if (!user) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        return res.render('chat', {
            currentUser: {
                _id: user._id.toString(),
                username: user.username,
                profilePicture: user.profilePicture || ''
            },
            dmTarget: mongoose.Types.ObjectId.isValid(req.query.dm || '') ? req.query.dm : ''
        });
    } catch (error) {
        console.error('Render chat error:', error.message);
        return res.status(500).send('Unable to load chat.');
    }
};

exports.listConversations = async (req, res) => {
    try {
        const userId = req.user.userId;
        await ensureGroupMembership(userId);

        const conversations = await Conversation.find({ participants: userId })
            .sort({ updatedAt: -1 })
            .populate('participants', 'username profilePicture')
            .populate('lastMessage.sender', 'username')
            .lean();

        const result = conversations.map((c) => {
            const isGroup = !!c.isGroup;
            let title = 'Direct message';
            let avatar = '';

            if (isGroup) {
                title = c.name || 'Group';
            } else {
                const other = (c.participants || []).find((p) => p._id.toString() !== userId.toString());
                if (other) {
                    title = other.username;
                    avatar = other.profilePicture || '';
                }
            }

            return {
                _id: c._id.toString(),
                isGroup,
                title,
                avatar,
                lastMessage: c.lastMessage && c.lastMessage.body ? {
                    body: c.lastMessage.body,
                    createdAt: c.lastMessage.createdAt,
                    senderName: c.lastMessage.sender ? c.lastMessage.sender.username : ''
                } : null,
                updatedAt: c.updatedAt
            };
        });

        return res.status(200).json({ count: result.length, conversations: result });
    } catch (error) {
        console.error('List conversations error:', error.message);
        return res.status(500).json({ message: 'Unable to load conversations' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid conversation id' });
        }

        const conv = await Conversation.findOne({ _id: id, participants: userId }).lean();
        if (!conv) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const messages = await Message.find({ conversation: id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('sender', 'username profilePicture')
            .lean();

        messages.reverse();

        return res.status(200).json({
            count: messages.length,
            messages: messages.map((m) => ({
                _id: m._id.toString(),
                body: m.body,
                createdAt: m.createdAt,
                sender: {
                    _id: m.sender._id.toString(),
                    username: m.sender.username,
                    profilePicture: m.sender.profilePicture || ''
                },
                own: m.sender._id.toString() === userId.toString()
            }))
        });
    } catch (error) {
        console.error('Get messages error:', error.message);
        return res.status(500).json({ message: 'Unable to load messages' });
    }
};

exports.openDirectMessage = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(400).json({ message: 'Invalid friend id' });
        }
        if (userId.toString() === friendId.toString()) {
            return res.status(400).json({ message: 'You cannot message yourself' });
        }

        const [me, friend] = await Promise.all([
            User.findById(userId).select('friends'),
            User.findById(friendId).select('username profilePicture')
        ]);

        if (!me || !friend) {
            return res.status(404).json({ message: 'User not found' });
        }

        const areFriends = me.friends.some((f) => f.toString() === friendId.toString());
        if (!areFriends) {
            return res.status(403).json({ message: 'You can only message your friends' });
        }

        let conv = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [userId, friendId], $size: 2 }
        }).lean();

        if (!conv) {
            const created = await Conversation.create({
                isGroup: false,
                participants: [userId, friendId],
                name: ''
            });
            conv = created.toObject();
        }

        return res.status(200).json({
            conversation: {
                _id: conv._id.toString(),
                isGroup: false,
                title: friend.username,
                avatar: friend.profilePicture || ''
            }
        });
    } catch (error) {
        console.error('Open DM error:', error.message);
        return res.status(500).json({ message: 'Unable to open conversation' });
    }
};
