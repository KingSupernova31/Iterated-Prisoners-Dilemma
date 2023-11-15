"use strict";

const programs = ["function(){return 1}"];//Bots go here.

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

const simulate = async function(source, opponentSource, history, timeLimit) {

	const sleep = async function(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	const worker = new Worker("IPDworker.js");

	const data = {
		"opponentSource": opponentSource,
		"source": source,
		"simulateString": simulate.toString(),
		"history": history,
		"opponentHistory": history.map(h => ({"m": h.o, "o": h.m})),
	}

	let result;
	worker.onmessage = function(message) {
		result = message.data;
		if ([0, false, "d", "D", "defect", "Defect"].includes(result)) {
			result = 0;
		} else if ([1, true, "c", "C", "cooperate", "Cooperate"].includes(result)) {
			result = 1;
		} else {
			result = null;
		}
	}

	worker.postMessage(data);
	const startTime = performance.now();

	while (true) {
		await sleep(1);
		if (result !== undefined) {
			break;
		}
		if (performance.now() - startTime >= timeLimit) {
			result = null;
			break;
		}
	}

	worker.terminate();
	return result;
};

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

const score = function(bot1Result, bot2Result) {
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
	if (bot1Result === null && bot2Result === null) {
		return [0, 0];
	}
	if (bot1Result === null) {
		return [0, 3];
	}
	if (bot2Result === null) {
		return [3, 0];
	}
}

const runGame = async function(programData1, programData2, history) {

	const bot1History = history.map(h => ({"m": h[programData1.id], "o": h[programData2.id]}));
	const bot2History = history.map(h => ({"m": h[programData2.id], "o": h[programData1.id]}));

	const bot1Result = await simulate(programData1.source, programData2.source, bot1History, 1000);
	const bot2Result = await simulate(programData2.source, programData1.source, bot2History, 1000);

	return [bot1Result, bot2Result];
}

const runMatch = async function(programData1, programData2) {
	const numGames = Math.floor(Math.random() * 100) + 1;
	const history = [];
	let bot1Score = 0,
			bot2Score = 0;

	for (let gameNum = 0 ; gameNum < numGames ; gameNum++) {
		const gameResult = await runGame(programData1, programData2, history);

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
const runTournament = async function() {
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
			const matchResult = await runMatch(programData[currentProgramId], programData[currentOpponentId]);
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
}
runTournament();