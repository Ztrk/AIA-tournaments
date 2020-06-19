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
    passwordHash: String,
    licenseId: {
        type: String,
        unique: true
    },
    ranking: {
        type: Number,
        min: 1,
        unique: true
    }
});

const User = mongoose.model('User', usersSchema);

module.exports = User;
