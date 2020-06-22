const bcrypt = require('bcrypt');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const User = require('./user');
const { fieldFromMongoError, ensureNotLoggedIn, ensureNotConfirmed } = require('./utils');
const config = require('./config.json')
const router = express.Router();

const TOKEN_LENGTH = 32;

const transporter = nodemailer.createTransport({
    host: "localhost",
    port: 25,
    secure: false,
    auth: config.email,
    tls: {
        // Allow self-signed certificates, UNSAFE
        rejectUnauthorized: false
    }
});

async function sendVerificationMail(email, link) {
    const message = 'Hello,\n' +
        'someone registered an account using your email address in Tournaments App.\n' +
        'If it was you please confirm your account by clicking this link:\n' +
        `${link}\n` +
        '\n' +
        'The link is valid for 24 hours.\n' +
        '\n' +
        "If it wasn't you, you may ignore this email.\n";

    const htmlMessage = '<p>Hello,</p>' +
        '<p>someone registered an account using your email address in Tournaments App. ' +
        'If it was you please confirm your account by clicking this link:</p>' +
        `<p><a href=${link}>${link}</a></p>` +
        '<p>The link is valid for 24 hours.</p>' +
        "<p>If it wasn't you, you may ignore this email.</p>";

    const info = await transporter.sendMail({
        from: '"Tournaments App" <tournamentsApp@localhost>',
        to: email,
        subject: 'Account confirmation',
        text: message,
        html: htmlMessage
    });
}

async function sendPasswordResetMail() {

}

function toBase64url(str) {
    return str
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateToken(length) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length, (err, buf) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(toBase64url(buf.toString('base64')));
            }
        });
    });
}

function isPasswordValid(password) {
    return /^[\x00-\x7F]{5,72}$/.test(password);
}

router.all('/login', ensureNotLoggedIn);

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

router.all('/register', ensureNotLoggedIn);

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
    const emailVerificationToken = await generateToken(TOKEN_LENGTH);
    const user = new User({ 
        username: req.body.username,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        passwordHash,
        emailVerificationToken,
        emailVerificationTime: Date.now()
    });

    try {
        await user.save();
        req.session.user = user;
        const link = `${req.hostname}:3000${req.baseUrl}/confirm?token=${emailVerificationToken}`;
        await sendVerificationMail(user.email, link);
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
        else {
            console.error(error);
        }
        res.redirect(303, 'register');
        return;
    }

    res.redirect(303, '/requireConfirmation');
    return;
});

router.get('/requireConfirmation', ensureNotConfirmed);

router.get('/requireConfirmation', (req, res) => {
    res.render('requireConfirmation', { user: req.session.user });
});

router.get('/confirm', ensureNotConfirmed);

router.get('/confirm', async (req, res) => {
    const user = new User(req.session.user);
    const tokenExpirationTime = 24 * 60 * 60 * 1000; // milliseconds
    if (user.emailVerificationToken !== req.query.token
            || Date.now() - user.emailVerificationTime.getTime() > tokenExpirationTime) {
        const errorMessage = 'Token is invalid';
        res.render('error', { errorMessage, user });
        return;
    }

    try {
        await user.updateOne({
            $unset: { emailVerificationToken: "", emailVerificationTime: "" }
        });
        user.emailVerificationToken = undefined;
        user.emailVerificationTime = undefined;
        req.session.user = user;
    }
    catch (error) {
        console.error(error);
        res.render('error', { errorMessage: '500 Unknown error occurred', user });
        return;
    }
    res.render('confirmationSuccess', { user });
});

router.post('/resend', ensureNotConfirmed);

router.post('/resend', async (req, res) => {
    const user = new User(req.session.user);
    try {
        const token = await generateToken(TOKEN_LENGTH);
        const link = `${req.hostname}:3000${req.baseUrl}/confirm?token=${token}`;
        sendVerificationMail(user.email, link);
        const currentDate = Date.now();
        await user.updateOne({
            emailVerificationToken: token,
            emailVerificationTime: currentDate
        });
        user.emailVerificationToken = token;
        user.emailVerificationTime = currentDate;
        req.session.user = user;
    }
    catch (error) {
        console.error(error);
    }
    res.redirect(303, 'requireConfirmation');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('back');
});

module.exports = router;
