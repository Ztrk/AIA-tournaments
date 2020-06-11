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

app.get('/', async (req, res) => {
    try {
        const tournaments = await Tournament.find().sort({ name: 'asc'});
        res.render('index', { tournaments });
    }
    catch (error) {
        console.log(error);
    }
});

app.listen(3000, () => 
    console.log('Server running at http://localhost:3000/')
);
