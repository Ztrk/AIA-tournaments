const express = require('express');
const mongoose = require('mongoose');
const Tournament = require('./tournament');
const User = require('./user');
const { ensureLoggedIn, fieldFromMongoError } = require('./utils');
const router = express.Router();

class Page {
    constructor(number, active = false, disabled = false) {
        this.number = number;
        this.active = active;
        this.disabled = disabled;
    }
}

function isEditAllowed(tournament, user) {
    if (!user) {
        return false;
    }
    if (!tournament.organizer._id 
            || tournament.organizer._id.toString() !== user._id) {
        return false;
    }
    return true;
}

function canUserRegister(tournament, user) {
    if (tournament.registrationDeadline < Date.now()) {
        return false
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
        return false;
    }

    if (!user) {
        return true;
    }

    const isUserRegistered = tournament.participants.some(participant => 
        participant._id.toString() === user._id
    );
    if (isUserRegistered) {
        return false;
    }

    return true;
}

async function getTournamentById(req, res, next) {
    if (mongoose.isValidObjectId(req.params.id)) {
        const tournament = await Tournament.findById(req.params.id).populate('organizer');
        if (tournament) {
            req.tournament = tournament;
            next();
            return;
        }
    }

    if (req.method === "GET") {
        res.status(404);
        res.render('error', { 
            errorMessage: '404 Tournament Not Found', 
            user: req.session.user 
        });
    }
    else {
        res.redirect(303, req.originalUrl);
    }
}

router.get('/', async (req, res) => {
    const itemsPerPage = 10;
    let page = 1
    if (req.query.page) {
        const parsed = parseInt(req.query.page, 10);
        if (!isNaN(parsed) && parsed > 0) {
            page = parsed;
        }
    }

    try {
        let numPages = Math.ceil(Math.max((await Tournament.estimatedDocumentCount()), 1) / 10);
        page = Math.min(page, numPages);

        const pages = { 
            previous: new Page(page - 1),
            next: new Page(page + 1), 
            pages: []
        };
        if (pages.previous.number < 1) {
            pages.previous.disabled = true;
        }
        if (pages.next.number > numPages) {
            pages.next.disabled = true;
        }

        for (let i = Math.max(1, Math.min(page - 2, numPages - 4)), 
                 j = Math.min(i + 4, numPages); i <= j; ++i) {
            pages.pages.push(new Page(i, i == page));
        }

        const tournaments = await Tournament.find().sort({ name: 'asc'})
            .skip((page - 1) * itemsPerPage).limit(itemsPerPage);
        res.render('index', { tournaments, pages, user: req.session.user });
    }
    catch (error) {
        console.log(error);
    }
});

router.use('/tournaments/:id', (req, res, next) => {
    if (req.baseUrl === '/tournaments/new' && req.path === '/') {
        next();
    }
    else {
        getTournamentById(req, res, next);
    }
});

router.get('/tournaments/:id/details', async (req, res) => {
    const tournament = req.tournament;
    res.render('tournament', { 
        tournament, 
        editAllowed: isEditAllowed(tournament, req.session.user), 
        registrationAllowed: canUserRegister(tournament, req.session.user),
        user: req.session.user 
    });
});

router.use('/tournaments/new', ensureLoggedIn);

router.get('/tournaments/new', async (req, res) => {
    const tournament = req.session.editedTournament 
        ? new Tournament(req.session.editedTournament) : new Tournament();

    const validationError = req.session.validationError || {};
    delete req.session.editedTournament;
    delete req.session.validationError;
    res.render('tournamentForm', {
        tournament,
        validationError,
        user: req.session.user
    });
});

router.post('/tournaments/new', async (req, res) => {
    const tournament = new Tournament({
        name: req.body.name,
        organizer: req.session.user,
        maxParticipants: req.body.maxParticipants,
        startDate: req.body.startDate,
        registrationDeadline: req.body.registrationDeadline,
        location: req.body.location
    });

    try {
        await tournament.save();
    }
    catch (error) {
        req.session.validationError = {};
        if (error instanceof mongoose.Error.ValidationError) {
            if (error.errors.maxParticipants instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.maxParticipants = true;
            }
            if (error.errors.startDate instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.startDate = true;
            }
            if (error.errors.registrationDeadline instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.registrationDeadline = true;
            }
        }
        else {
            console.error(error);
        }
        req.session.editedTournament = tournament;
        res.redirect(303, '/tournaments/new');
        return;
    }
    res.redirect(303, `/tournaments/${tournament._id}/details`)
});

router.use('/tournaments/:id/edit', ensureLoggedIn);

router.get('/tournaments/:id/edit', async (req, res) => {
    const tournament = req.tournament;

    if (!tournament.organizer || 
            tournament.organizer._id.toString() !== req.session.user._id) {
        res.status(403);
        res.render('error', { 
            errorMessage: '403 Forbidden\nOnly tournament organizer can edit tournament.', 
            user: req.session.user 
        });
        return;
    }

    let editedTournament = tournament;
    if (req.session.editedTournament && 
            req.session.editedTournament._id == tournament._id.toString()) {
        editedTournament = new Tournament(req.session.editedTournament);
    }

    const validationError = req.session.validationError || {};
    delete req.session.editedTournament;
    delete req.session.validationError;
    res.render('tournamentForm', {
        tournament: editedTournament,
        validationError,
        user: req.session.user
    });
});

router.post('/tournaments/:id/edit', async (req, res) => {
    const tournament = req.tournament;

    if (!tournament.organizer || 
            tournament.organizer._id.toString() !== req.session.user._id) {
        res.redirect(303, 'edit');
        return;
    }

    tournament.name = req.body.name,
    tournament.maxParticipants = req.body.maxParticipants,
    tournament.startDate = req.body.startDate,
    tournament.registrationDeadline = req.body.registrationDeadline,
    tournament.location = req.body.location

    try {
        await tournament.save();
    }
    catch (error) {
        req.session.validationError = {};
        if (error instanceof mongoose.Error.ValidationError) {
            if (error.errors.maxParticipants instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.maxParticipants = true;
            }
            if (error.errors.startDate instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.startDate = true;
            }
            if (error.errors.registrationDeadline instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.registrationDeadline = true;
            }
        }
        else {
            console.error(error);
        }
        req.session.editedTournament = tournament;
        res.redirect(303, 'edit');
        return;
    }
    res.redirect(303, 'details');
});

router.use('/tournaments/:id/register/ranking', ensureLoggedIn);

router.get('/tournaments/:id/register/ranking', async (req, res) => {
    const user = new User(req.session.user);
    const validationError = req.session.validationError || {};
    delete req.session.validationError;
    res.render('userRankingForm', { validationError, user });
});

router.post('/tournaments/:id/register/ranking', async (req, res) => {
    const user = new User(req.session.user);
    if (!req.body.licenseId || !req.body.ranking) {
        res.redirect(303, 'ranking');
        res.session.validationError = { licenseId: true, ranking: true };
        return;
    }

    try {
        await user.updateOne({ 
            licenseId: req.body.licenseId,
            ranking: req.body.ranking
        }, { runValidators: true });

        user.licenseId = req.body.licenseId;
        user.ranking = req.body.ranking;
    }
    catch (error) {
        req.session.validationError = {};
        if (error.code === 11000) {
            const field = fieldFromMongoError(error);
            if (field === 'licenseId') {
                req.session.validationError.licenseId = true;
            }
            else if (field === 'ranking') {
                req.session.validationError.ranking = true;
            }
        }
        else if (error instanceof mongoose.Error.ValidationError) {
            if (error.errors.licenseId instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.licenseId = true;
            }
            if (error.errors.ranking instanceof mongoose.Error.ValidatorError) {
                req.session.validationError.ranking = true;
            }
        }
        else {
            console.error(error);
        }
        res.redirect(303, 'ranking');
        return;
    }
    req.session.user = user;
    res.redirect(303, '../register');
});

router.use('/tournaments/:id/register', ensureLoggedIn);

router.get('/tournaments/:id/register', async (req, res) => {
    const error = req.session.registrationError;
    if (error) {
        delete req.session.registrationError;
        res.render('error', { 
            errorMessage: error, 
            user: req.session.user 
        });
        return;
    }
    res.render('tournamentRegistration', { user: req.session.user });
});

router.post('/tournaments/:id/register', async (req, res) => {
    const tournament = req.tournament;

    const isUserRegistered = tournament.participants.some(user => 
        user._id.toString() === req.session.user._id
    );
    if (isUserRegistered) {
        req.session.registrationError = 'You are already registered';
        res.redirect(303, 'register');
        return;
    }

    if (tournament.registrationDeadline < Date.now()) {
        req.session.registrationError = 'Registration deadline has passed';
        res.redirect(303, 'register');
        return;
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
        req.session.registrationError = 'All places already taken';
        res.redirect(303, 'register');
        return;
    }

    const userId = req.session.user._id
    const result = await Tournament.updateOne({ 
            _id: tournament._id,
            numParticipants: { $lt : tournament.maxParticipants},
            participants: { $not : { $elemMatch: { _id: userId } } }
        }, {
            $push: { participants: userId },
            $inc: { numParticipants: 1 }
        }
    );

    if (result.modifiedCount === 0) {
        req.session.registrationError = 'Too many users registered';
    }

    res.redirect(303, '/');
});

module.exports = router;
