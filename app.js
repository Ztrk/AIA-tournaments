const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const testData = require('./testData.json');

const shouldInitializeDatabase = true;

// Connect to database
mongoose.connect('mongodb://localhost:27017/tournaments', {useNewUrlParser: true});
const db = mongoose.connection;

db.on('error', () => console.error.bind(console, 'connection error:'));
db.once('open', () => console.log('Connected to MongoDB database'));

// Create schema
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
const tournamentSchema = new mongoose.Schema({
    name: String,
    participants: Array,
    games: Array
});

const User = mongoose.model('User', usersSchema);
const Tournament = mongoose.model('Tournament', tournamentSchema);

async function initializeDatabase() {
    await Tournament.deleteMany({})
    await Tournament.create(...testData.tournaments);
}

if (shouldInitializeDatabase) {
    initializeDatabase();
}

const app = express();

app.use(express.urlencoded({ extended: true})); // for parsing post body

app.use(session({
    secret: 'this is very secret',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} ${new Date()}`);
    next();
});

app.set('view engine', 'ejs');

class Page {
    constructor(number, active = false, disabled = false) {
        this.number = number;
        this.active = active;
        this.disabled = disabled;
    }
}

app.get('/', async (req, res) => {
    const itemsPerPage = 10;
    let page = 1
    if (req.query.page) {
        const parsed = parseInt(req.query.page, 10);
        if (!isNaN(parsed) && parsed > 0) {
            page = parsed;
        }
    }

    try {
        let numPages = Math.ceil((await Tournament.estimatedDocumentCount()) / 10);
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

        for (let i = Math.max(1, Math.min(page - 2, numPages - 4)), j = Math.min(i + 4, numPages); i <= j; ++i) {
            pages.pages.push(new Page(i, i == page));
        }

        const tournaments = await Tournament.find().sort({ name: 'asc'})
            .skip((page - 1) * itemsPerPage).limit(itemsPerPage);
        res.render('index', { tournaments, pages });
    }
    catch (error) {
        console.log(error);
    }
});

app.get('/login', (req, res) => {
    const lastLoginFailed = req.session.lastLoginFailed;
    req.session.lastLoginFailed = false;
    res.render('login', { lastLoginFailed });
});

app.post('/login', async (req, res) => {
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

app.get('/register', (req, res) => {
    registerError = req.session.registerError || {};
    req.session.registerError = null;
    console.log(registerError);
    res.render('register', { registerError });
});

app.post('/register', async (req, res) => {
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

app.listen(3000, () => 
    console.log('Server running at http://localhost:3000/')
);
