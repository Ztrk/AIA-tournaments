const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: String,
    participants: Array,
    games: Array
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
