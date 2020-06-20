const bcrypt = require('bcrypt');
const express = require('express');
const mongoose = require('mongoose');
const User = require('./user');
const { fieldFromMongoError, ensureNotLoggedIn } = require('./utils');
const router = express.Router();

function isPasswordValid(password) {
    return /^[\x00-\x7F]{5,72}$/.test(password);
}

router.use('/login', ensureNotLoggedIn);

router.get('/login', (req, res) => {
    const lastLoginFailed = req.session.lastLoginFailed;
    req.session.lastLoginFailed = false;
    res.render('login', { lastLoginFailed, user: req.session.user });
});


router.post('/login', async (req, res) => {
    if (!req.body.login || !req.body.password) {
        req.session.lastLoginFailed = true;
        res.redirect(303, '/login');
        return;
    }

    const user = await User.findOne({ 
        $or: [{ username: req.body.login }, { email: req.body.login }]
    });

    if (!user) {
        req.session.lastLoginFailed = true;
        res.redirect(303, '/login');
        return;
    }

    const isPasswordCorrect = await bcrypt.compare(req.body.password, user.passwordHash);

    if (!isPasswordCorrect) {
        req.session.lastLoginFailed = true;
        res.redirect(303, '/login');
        return;
    }

    req.session.user = user;
    req.session.lastLoginFailed = false;
    res.redirect(303, '/');
});

router.use('/register', ensureNotLoggedIn);

router.get('/register', (req, res) => {
    const registerError = req.session.registerError || {};
    req.session.registerError = null;
    res.render('register', { registerError, user: req.session.user });
});

router.post('/register', async (req, res) => {
    const bcryptRounds = 12;
    if (!req.body.username || !req.body.email 
            || !req.body.password || !req.body.confirmedPassword) {
        res.redirect(303, 'register');
        return;
    }

    if (req.body.password !== req.body.confirmedPassword) {
        req.session.registerError = { confirmedPassword: true, password: true };
        res.redirect(303, 'register');
        return;
    }

    if (!isPasswordValid(req.body.password)) {
        req.session.registerError = { password: true };
        res.redirect(303, 'register');
        return;
    }

    const passwordHash = await bcrypt.hash(req.body.password, bcryptRounds);
    const user = new User({ 
        username: req.body.username,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        passwordHash
    });

    try {
        await user.save();
    }
    catch (error) {
        req.session.registerError = {};
        if (error.code === 11000) {
            const field = fieldFromMongoError(error);
            if (field === 'username') {
                req.session.registerError.username 
                    = 'User with this username is already registered';
            }
            else if (field === 'email') {
                req.session.registerError.email 
                    = 'User with this email is already registered';
            }
        }
        else if (error instanceof mongoose.Error.ValidationError) {
            if (error.errors.username instanceof mongoose.Error.ValidatorError) {
                req.session.registerError.username = 'Username is not valid';
            }
            if (error.errors.email instanceof mongoose.Error.ValidatorError) {
                req.session.registerError.email = 'Email is not valid';
            }
        }
        res.redirect(303, 'register');
        return;
    }

    res.redirect(303, '/');
    return;
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('back');
});

module.exports = router;
