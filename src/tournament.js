const mongoose = require('mongoose');
const { gameSchema } = require('./game');
const { ladderEntrySchema } = require('./ladderEntry');

const tournamentSchema = new mongoose.Schema({
    name: String,
    organizer: { type: mongoose.Types.ObjectId, ref: 'User' },
    maxParticipants: {
        type: Number,
        min: 2
    },
    participants: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    numParticipants: {
        type: Number,
        default: 0
    },
    rounds: [ [ gameSchema ] ],
    ladder: [ ladderEntrySchema ],
    startDate: {
        type: Date,
        validate: {
            validator: value => value >= Date.now(),
            message: props => `Start date ${props.value} is in the past`
        }
    },
    registrationDeadline: {
        type: Date,
        validate: {
            validator: function(value) {
                if (this) {
                    return this.registrationDeadline <= this.startDate;
                }
            },
            message: props => `Registration deadline ${props.value} is after start date`
        }
    },
    location: String
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
