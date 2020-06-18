const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const Tournament = require('./tournament');
const tournaments = require('./tournaments');
const accounts = require('./accounts');
const testData = require('./testData.json');

const shouldInitializeDatabase = true;

// Connect to database
mongoose.connect('mongodb://localhost:27017/tournaments', {useNewUrlParser: true});
const db = mongoose.connection;

db.on('error', () => console.error.bind(console, 'connection error:'));
db.once('open', () => console.log('Connected to MongoDB database'));

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

app.set('view engine', 'ejs');

// Logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} ${new Date()}`);
    next();
});

// Routers
app.use('/', accounts);
app.use('/', tournaments);

app.listen(3000, () => 
    console.log('Server running at http://localhost:3000/')
);
