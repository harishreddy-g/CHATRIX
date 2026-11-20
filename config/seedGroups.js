const Conversation = require('../models/Conversation');

const DEFAULT_GROUPS = ['General Chat', 'Project Room', 'Video Lovers'];

const seedGroups = async () => {
    for (const name of DEFAULT_GROUPS) {
        await Conversation.updateOne(
            { isGroup: true, name },
            { $setOnInsert: { isGroup: true, name, participants: [] } },
            { upsert: true }
        );
    }
};

module.exports = seedGroups;
