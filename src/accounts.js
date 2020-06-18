const bcrypt = require('bcrypt');
const express = require('express');
const mongoose = require('mongoose');
const User = require('./user');
const router = express.Router();

router.get('/login', (req, res) => {
    const lastLoginFailed = req.session.lastLoginFailed;
    req.session.lastLoginFailed = false;
    res.render('login', { lastLoginFailed, user: req.session.user });
});

router.post('/login', async (req, res) => {
    if (req.body.username && req.body.password) {
        const user = await User.findOne({ name: req.body.username });
        if (user) {
            const isCorrect = await bcrypt.compare(req.body.password, user.passwordHash);
            if (isCorrect) {
                req.session.user = user;
                req.session.lastLoginFailed = false;
                res.redirect(303, '/');
                return;
            }
        }
        req.session.lastLoginFailed = true;
    }
    res.redirect(303, '/login');
});

router.get('/register', (req, res) => {
    registerError = req.session.registerError || {};
    req.session.registerError = null;
    res.render('register', { registerError, user: req.session.user });
});

router.post('/register', async (req, res) => {
    const bcryptRounds = 12;
    if (req.body.username && req.body.email && req.body.password && req.body.confirmedPassword) {
        if (req.body.password == req.body.confirmedPassword) {
            const passwordHash = await bcrypt.hash(req.body.password, bcryptRounds);
            const user = new User({ 
                name: req.body.username,
                email: req.body.email,
                passwordHash
            });
            try {
                await user.save();
                res.redirect(303, '/');
                return;
            }
            catch (error) {
                req.session.registerError = {};
                if (error.code === 11000) {
                    // username exists
                    req.session.registerError['username'] = true;
                }
                else if (error instanceof mongoose.Error.ValidationError) {
                    if (error.errors.name instanceof mongoose.Error.ValidatorError) {
                        req.session.registerError['username'] = true;
                    }
                    if (error.errors.email instanceof mongoose.Error.ValidatorError) {
                        req.session.registerError['email'] = true;
                    }
                }
            }
        }
        else {
            req.session.registerError = { confirmedPassword: true };
        }
    }
    res.redirect(303, '/register');
});

module.exports = router;
