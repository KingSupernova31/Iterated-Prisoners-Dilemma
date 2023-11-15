"use strict";

const express = require("express"),
	app = express();

app.use(express.static("."));

const server = app.listen(8081, function () {
	console.log("Listening on port 8081");
});