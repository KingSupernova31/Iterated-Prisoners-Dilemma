//Go to https://manifold.markets/api/v0/slug/which-240-character-program-wins-th, copy the result, and assign it to the "input" variable below.

const fs = require("fs");

const disqualifiedIDs = [18, 19, 6, 7, 12, 20];

setTimeout(function() {
	let programs = input.answers.map(answer => answer.text);
	programs.pop();//Remove the "other" answer.
	for (let i = 0 ; i < programs.length ; i++) {
		if (disqualifiedIDs.includes(i)) {
			console.log(`Disqualifying program ${i}: ` + programs[i].replace(/\n/g," "));
			programs[i] = null;
		}

		if (programs[i] !== null && programs[i].includes("private submission")) {
			console.log(`Invalid program ${i}: ` + programs[i]);
			programs[i] = null;
		}
	}
	console.log(`${programs.filter(program => program !== null).length} valid programs`);
	fs.writeFileSync("allIPDPrograms.json", JSON.stringify(programs));
}, 0);

const input = 
