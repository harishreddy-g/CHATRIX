const mongoose = require('mongoose');
const User = require('../models/Users');

const publicUserFields = '_id username email';

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const hasUserId = (ids, userId) => {
    return ids.some((id) => id.toString() === userId.toString());
};

exports.searchUsers = async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const searchTerm = (req.query.query || req.query.search || req.query.q || '').trim();

        if (!searchTerm) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { username: { $regex: escapeRegex(searchTerm), $options: 'i' } },
                { email: { $regex: escapeRegex(searchTerm), $options: 'i' } }
            ]
        })
            .select(publicUserFields)
            .limit(20)
            .lean();

        return res.status(200).json({
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Search users error:', error.message);
        return res.status(500).json({ message: 'Unable to search users' });
    }
};

exports.sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user.userId;
        const { receiverId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: 'Invalid receiver id' });
        }

        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
        }

        const [sender, receiver] = await Promise.all([
            User.findById(senderId).select('friends sentRequests receivedRequests'),
            User.findById(receiverId).select('friends sentRequests receivedRequests username email')
        ]);

        if (!sender) {
            return res.status(404).json({ message: 'Sender account not found' });
        }

        if (!receiver) {
            return res.status(404).json({ message: 'Receiver account not found' });
        }

        const alreadyFriends = hasUserId(sender.friends, receiverId) || hasUserId(receiver.friends, senderId);
        if (alreadyFriends) {
            return res.status(409).json({ message: 'You are already friends with this user' });
        }

        const requestAlreadySent = hasUserId(sender.sentRequests, receiverId)
            || hasUserId(receiver.receivedRequests, senderId);
        if (requestAlreadySent) {
            return res.status(409).json({ message: 'Friend request already sent' });
        }

        const requestAlreadyReceived = hasUserId(sender.receivedRequests, receiverId)
            || hasUserId(receiver.sentRequests, senderId);
        if (requestAlreadyReceived) {
            return res.status(409).json({ message: 'This user has already sent you a friend request' });
        }

        await User.bulkWrite([
            {
                updateOne: {
                    filter: { _id: sender._id },
                    update: { $addToSet: { sentRequests: receiver._id } }
                }
            },
            {
                updateOne: {
                    filter: { _id: receiver._id },
                    update: { $addToSet: { receivedRequests: sender._id } }
                }
            }
        ]);

        return res.status(201).json({
            message: 'Friend request sent successfully',
            request: {
                from: sender._id,
                to: {
                    _id: receiver._id,
                    username: receiver.username,
                    email: receiver.email
                }
            }
        });
    } catch (error) {
        console.error('Send friend request error:', error.message);
        return res.status(500).json({ message: 'Unable to send friend request' });
    }
};

exports.getReceivedRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('receivedRequests')
            .populate('receivedRequests', publicUserFields)
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            count: user.receivedRequests.length,
            receivedRequests: user.receivedRequests
        });
    } catch (error) {
        console.error('Get received requests error:', error.message);
        return res.status(500).json({ message: 'Unable to fetch received friend requests' });
    }
};

exports.getSentRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('sentRequests')
            .populate('sentRequests', publicUserFields)
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            count: user.sentRequests.length,
            sentRequests: user.sentRequests
        });
    } catch (error) {
        console.error('Get sent requests error:', error.message);
        return res.status(500).json({ message: 'Unable to fetch sent friend requests' });
    }
};
