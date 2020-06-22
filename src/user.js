const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    username: {
        type: String,
        match: /^\w+$/,
        minlength: 4,
        maxlength: 32,
        required: true,
        unique: true
    },
    email: {
        type: String,
        match: /^.+@.+$/,
        maxlength: 254,
        required: true,
        unique: true
    },
    firstname: String,
    lastname: String,
    passwordHash: {
        type: String,
        required: true
    },
    licenseId: {
        type: String,
        index: { unique: true, partialFilterExpression: { licenseId: { $exists: true } } }
    },
    ranking: {
        type: Number,
        min: 1,
        index: { unique: true, partialFilterExpression: { licenseId: { $exists: true } } }
    },
    emailVerificationToken: String,
    emailVerificationTime: Date,
    passwordResetToken: String,
    passwordResetTime: Date
});

const User = mongoose.model('User', usersSchema);

module.exports = User;
