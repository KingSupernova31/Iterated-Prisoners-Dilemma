/*
General rules for what you can access/modify: Bots may mess with a bot that they're simulating or a bot that's simulating them. Bots may not mess with the tournament program or with another bot at the top level of the heiarachy.
*/

const fs = require("fs");

const shuffle = function(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
}

const programs = JSON.parse(fs.readFileSync("allIPDPrograms.json", "utf8"));
const programData = {};
for (let i in programs) {
	if (programs[i] !== null) {
		programData[i] = {
			"id": Number(i),
			"source": programs[i],
			"scores": {},//This will be filled with keys for each opponent id, and values that are objects like {id:0, score:2, matchHistory:[]}
			"finalScore": 0
		};
	}
}

const createBot = function(code) {
	let f;
	eval(`f = function(d,m,c,s,f,h,i) {
			let r = 9;
			${code}
			return Number(r);
		};
	`);
	return f;
}

const score = function(bot1Result, bot2Result) {
	if (![0, 1].includes(bot1Result)) {
		throw new Error(`Bot 1 returned ${bot1Result}`);
	}
	if (![0, 1].includes(bot2Result)) {
		throw new Error(`Bot 2 returned ${bot2Result}`);
	}
	if (bot1Result === 0 && bot2Result === 0) {
		return [1, 1];
	}
	if (bot1Result === 1 && bot2Result === 1) {
		return [2, 2];
	}
	if (bot1Result === 0 && bot2Result === 1) {
		return [3, 0];
	}
	if (bot1Result === 1 && bot2Result === 0) {
		return [0, 3];
	}
}

const getIndividualResult = function(programData1, programData2, history) {
	const bot = createBot(programData1.source);
	const dz = programData2.id,
				mz = programData1.id,
				cz = programData2.source,
				sz = programData1.source,
				fz = function(a,d,m,c,s,f,h,i) {
					if (d === undefined) {d = dz;}
					if (m === undefined) {m = mz;}
					if (c === undefined) {c = cz;}
					if (s === undefined) {s = sz;}
					if (f === undefined) {f = fz;}
					if (h === undefined) {h = hz;}
					if (i === undefined) {i = iz;}
					let bot;
					eval(`bot = function(d,m,c,s,f,h,i) {
							let r = 9;
							${a}
							return Number(r);
						};
					`);
					return bot(d, m, c, s, f, h, i);
				},
				hz = history.map(h => ({"m": h[programData1.id], "o": h[programData2.id]})),
				iz = history.map(h => ({"m": h[programData2.id], "o": h[programData1.id]}));

	const startTime = performance.now();
	const result = bot(dz, mz, cz, sz, fz, hz, iz);
	const endTime = performance.now();
	if (![0, 1].includes(result)) {
		throw new Error(`Bad bot. (Result was ${result})`);
	}
	if (endTime > startTime + 1000) {
		throw new Error(`Slow bot. (Took ${endTime - startTime})`);
	}

	return result;
}

const runGame = function(programData1, programData2, history) {
	console.log(`Playing bot ${programData1.id} against ${programData2.id}`);
	const bot1Result = getIndividualResult(programData1, programData2, history);
	console.log(`Playing bot ${programData2.id} against ${programData1.id}`);
	const bot2Result = getIndividualResult(programData2, programData1, history);
	return [bot1Result, bot2Result];
}

const runMatch = function(programData1, programData2) {
	const numGames = Math.floor(Math.random() * 100) + 1;
	const history = [];
	let bot1Score = 0,
			bot2Score = 0;

	for (let gameNum = 0 ; gameNum < numGames ; gameNum++) {
		const gameResult = runGame(programData1, programData2, history);

		const historyObj = {};
		historyObj[programData1.id] = gameResult[0];
		historyObj[programData2.id] = gameResult[1];
		history.push(historyObj);

		const scores = score(...gameResult);
		bot1Score += scores[0];
		bot2Score += scores[1];
	}

	return {
		"program1FinalScore": bot1Score / numGames,
		"program2FinalScore": bot2Score / numGames,
		"history": history,
	}
}

//If a program errors or hangs, there is no built-in detection for this, it's handled manually. The human should remove that program from the program list at the top by setting it to null, then re-run.
const runTournament = function() {
	const remainingProgramIds = Object.keys(programData);
	shuffle(remainingProgramIds);

	while (remainingProgramIds.length > 0) {
		const currentProgramId = remainingProgramIds.pop();
		const opponentIds = Object.keys(programData);
		shuffle(opponentIds);
		const alreadyPlayedOpponents = Object.keys(programData[currentProgramId].scores);
		const opponentsToPlay = opponentIds.filter(opp => !alreadyPlayedOpponents.includes(opp));

		while (opponentsToPlay.length > 0) {
			const currentOpponentId = opponentsToPlay.pop();
			const matchResult = runMatch(programData[currentProgramId], programData[currentOpponentId]);
			programData[currentProgramId].scores[currentOpponentId] = {
				"id": currentOpponentId,
				"score": matchResult.program1FinalScore,
				"matchHistory": matchResult.history,
			};
			programData[currentOpponentId].scores[currentProgramId] = {
				"id": currentProgramId,
				"score": matchResult.program2FinalScore,
				"matchHistory": matchResult.history,
			};
		}
	}

	const finalScores = {}
	for (let id in programData) {
		const matchScores = Object.values(programData[id].scores).map(scoreObj => scoreObj.score);
		let finalScore = 0;
		for (let score of matchScores) {
			finalScore += score;
		}
		finalScores[id] = finalScore;
		programData[id].finalScore = finalScore;
	}

	const numValidPrograms = Object.keys(programData).length;
	console.log(`${numValidPrograms} bots entered the tournament. The minimum score is 0, and the maximum is ${numValidPrograms * 3}. If all bots had cooperated they would have each gotten ${numValidPrograms * 2} points, and if they had all defeected they would have each gotten ${numValidPrograms}. Final scores:`);
	console.log(finalScores);
	fs.writeFileSync("IPDResults.json", JSON.stringify(programData));
}
runTournament();
