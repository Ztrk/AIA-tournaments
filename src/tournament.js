const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: String,
    organizer: { type: mongoose.Types.ObjectId, ref: 'User' },
    maxParticipants: {
        type: Number,
        min: 2
    },
    participants: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    games: [{
        player1: { type: mongoose.Types.ObjectId, ref: 'User' },
        player2: { type: mongoose.Types.ObjectId, ref: 'User' },
        winner1: { type: mongoose.Types.ObjectId, ref: 'User' },
        winner2: { type: mongoose.Types.ObjectId, ref: 'User' },
        winner: { type: mongoose.Types.ObjectId, ref: 'User' },
    }],
    startDate: Date,
    registrationDeadline: Date,
    location: String
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
