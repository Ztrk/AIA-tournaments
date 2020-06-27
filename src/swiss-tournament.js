
const WIN_POINTS = 1;
const LOSE_POINTS = 0;

class Game {
    constructor(black, white) {
        this.black = black;
        this.white = white;
        this.blackWinner = null;
        this.whiteWinner = null;
        this.winner = null;
    }
}

class LadderEntry {
    constructor(player) {
        this.position = 0;
        this.player = player;
        this.points = 0;
        this.opponentsScore = 0;
        this.defeatedScore = 0;
        this.games = 0;
    }

}

function compareEntries(a, b) {
    if (b.points !== a.points) {
        return b.points - a.points;
    }
    if (b.opponentsScore !== a.opponentsScore) {
        return b.opponentsScore - a.opponentsScore;
    }
    return b.defeatedScore - a.defeatedScore;
}

function createLadder(players, rounds) {
    const ladder = new Map();
    for (player of players) {
        ladder.set(player, { ladderEntry: new LadderEntry(player), opponents: [], defeated: [] })
    }

    for (round of rounds) {
        for (game of round) {
            if (game.winner != null) {
                let winnerEntry, loserEntry;
                if (game.black === game.winner) {
                    winnerEntry = ladder.get(game.black);
                    loserEntry = ladder.get(game.white);
                }
                else {
                    winnerEntry = ladder.get(game.white);
                    loserEntry = ladder.get(game.black);
                }

                winnerEntry.ladderEntry.points += WIN_POINTS;

                if (loserEntry != null) {
                    loserEntry.ladderEntry.points += LOSE_POINTS;

                    winnerEntry.opponents.push(loserEntry.ladderEntry.player);
                    winnerEntry.defeated.push(loserEntry.ladderEntry.player);
                    loserEntry.opponents.push(winnerEntry.ladderEntry.player);

                    winnerEntry.ladderEntry.games += 1;
                    loserEntry.ladderEntry.games += 1;
                }
            }
        }
    }

    ladder.forEach((value, key, map) => {
        for (opponent of value.opponents) {
            value.ladderEntry.opponentsScore += map.get(opponent).ladderEntry.points;
        }
        for (defeated of value.defeated) {
            value.ladderEntry.defeatedScore += map.get(defeated).ladderEntry.points;
        }
    });

    const ladderEntries = [];
    ladder.forEach(value => {
        ladderEntries.push(value.ladderEntry);
    });

    ladderEntries.sort(compareEntries);

    for (let i = 0; i < ladderEntries.length; ++i) {
        if (i > 0 && compareEntries(ladderEntries[i], ladderEntries[i - 1]) === 0) {
            ladderEntries[i].position = ladderEntries[i - 1].position;
        }
        else {
            ladderEntries[i].position = i + 1;
        }
    }

    return ladderEntries;
}

function createRound(ladder, rounds) {
    const players = []
    if (ladder.length % 2 === 1) {
        players.push(null);
    }
    for (let i = 0; i < ladder.length; ++i) {
        players.push(ladder[i].player);
    }
    
    const playersNum = players.length;
    const indexes = new Map();
    for (let i = 0; i < playersNum; ++i) {
        indexes.set(players[i], i);
    }

    const gamesMatrix = new Array(playersNum);
    for (let i = 0; i < playersNum; ++i) {
        gamesMatrix[i] = new Array(playersNum).fill(0);
    }
    
    for (let games of rounds) {
        for (let game of games) {
            const black = indexes.get(game.black);
            const white = indexes.get(game.white);
            gamesMatrix[black][white] = 1;
            gamesMatrix[white][black] = 1;
        }
    }

    const isPaired = new Array(playersNum).fill(false);
    const games = []
    for (let i = 0; i < playersNum; ++i) {
        if (isPaired[i]) {
            continue;
        }

        let j = i + 1;
        while (j < playersNum && (isPaired[j] || gamesMatrix[i][j] === 1)) {
            ++j;
        }

        if (j >= playersNum) {
            throw new Error('Matching players failed');
        }

        games.push(new Game(players[i], players[j]));

        isPaired[i] = true;
        isPaired[j] = true;
    }

    return games;
}

function main() {
    const players = ['A', 'B', 'C'];
    const numRounds = players.length - 1;
    const rounds = [];
    let ladder = createLadder(players, rounds);
    console.log(ladder);

    try {
        for (let i = 0; i < numRounds; ++i) {
            const round = createRound(ladder, rounds);

            for (game of round) {
                if (game.black != null) {
                    game.winner = game.black;
                }
                else {
                    game.winner = game.white;
                }
            }
            console.log(round);
            rounds.push(round);

            ladder = createLadder(players, rounds)
            console.log(ladder);
        }
    }
    catch (error) {
        console.error(error);
    }
}

main();

