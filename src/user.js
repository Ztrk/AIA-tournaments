const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true // builds unique index
    },
    email: {
        type: String,
        match: /^.+@.+$/
    },
    passwordHash: String
});

const User = mongoose.model('User', usersSchema);

module.exports = User;
