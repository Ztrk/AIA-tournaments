const mongoose = require('mongoose');
const { playerSchema } = require('./player');

const gameSchema = mongoose.Schema({
    black: playerSchema,
    white: playerSchema,
    blackWinner: playerSchema,
    whiteWinner: playerSchema, 
    winner: playerSchema
});

const Game = mongoose.model('Game', gameSchema);

module.exports = { Game, gameSchema };
