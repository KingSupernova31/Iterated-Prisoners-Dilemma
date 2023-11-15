onmessage = async function(message) {

	const bot = eval("(" + message.data.source + ")");
	const simulate = eval("(" + message.data.simulateString + ")");

	const result = await bot(message.data.opponentSource, message.data.source, simulate, message.data.history, message.data.opponentHistory);

	postMessage(result);
}