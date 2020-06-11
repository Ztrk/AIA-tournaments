const mongoose = require('mongoose');
const express = require('express');

const testData = require('./testData.json');

const shouldInitializeDatabase = true;

// Connect to database
mongoose.connect('mongodb://localhost:27017/tournaments', {useNewUrlParser: true});
const db = mongoose.connection;

db.on('error', () => console.error.bind(console, 'connection error:'));
db.once('open', () => console.log('Connected to MongoDB database'));

// Create schema
const usersSchema = new mongoose.Schema({
    name: String,
    password: String,
    salt: String
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
    res.render('login');
});

app.post('/login', (req, res) => {
    res.redirect(303, '/login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    res.redirect(303, '/register');
});

app.listen(3000, () => 
    console.log('Server running at http://localhost:3000/')
);
