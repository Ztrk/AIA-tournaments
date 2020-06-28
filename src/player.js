const mongoose = require('mongoose');

const playerSchema = mongoose.Schema({
    id: mongoose.Types.ObjectId,
    name: String
}, { 
    _id: false 
});

const Player = mongoose.model('Player', playerSchema);

module.exports = { Player, playerSchema };
