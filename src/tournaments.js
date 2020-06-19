const express = require('express');
const mongoose = require('mongoose');
const Tournament = require('./tournament');
const router = express.Router();

class Page {
    constructor(number, active = false, disabled = false) {
        this.number = number;
        this.active = active;
        this.disabled = disabled;
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

router.get('/tournaments/:id/details', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404);
        res.render('error', { errorMessage: '404 Not Found', user: req.session.user });
        return;
    }

    const tournament = await Tournament.findById(req.params.id).populate('organizer');

    if (tournament == null) {
        res.status(404);
        res.render('error', { errorMessage: '404 Not Found', user: req.session.user });
        return;
    }

    res.render('tournament', { tournament, user: req.session.user });
});

router.get('/tournaments/new', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }
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
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }

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

router.get('/tournaments/:id/edit', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404);
        res.render('error', { errorMessage: '404 Not Found', user: req.session.user });
        return;
    }

    const tournament = await Tournament.findById(req.params.id).populate('organizer');

    if (tournament == null) {
        res.status(404);
        res.render('error', { errorMessage: '404 Not Found', user: req.session.user });
        return;
    }

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
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
        res.redirect(303, '');
        return;
    }

    const tournament = await Tournament.findById(req.params.id).populate('organizer');

    if (tournament == null) {
        res.redirect(303, '');
        return;
    }

    if (!tournament.organizer || 
            tournament.organizer._id.toString() !== req.session.user._id) {
        res.redirect(303, '');
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
        res.redirect(303, '');
        return;
    }
    res.redirect(303, 'details');
});

module.exports = router;
