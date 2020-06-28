const mongoose = require('mongoose');
const { playerSchema } = require('./player');

const ladderEntrySchema = mongoose.Schema({
    position: Number,
    player: playerSchema,
    points: {
        type: Number,
        default: 0
    },
    opponentsScore: {
        type: Number,
        default: 0
    },
    defeatedScore: {
        type: Number,
        default: 0
    },
    games: {
        type: Number,
        default: 0
    }
}, {
    _id: false
});

const LadderEntry = mongoose.model('LadderEntry', ladderEntrySchema);

module.exports = { LadderEntry, ladderEntrySchema };
