'use strict'

const { parentPort, workerData } = require("worker_threads");
const { getRandomSecret } = require("./utils");
const jwt = require("jsonwebtoken");

const { tokensToBuild, benchsAlgos, algorithm } = workerData;

const tokens = [];
while (tokens.length !== tokensToBuild) {
    const payload = { data:getRandomSecret(64) };
    const { private_key } = benchsAlgos.get(algorithm);
    const tokenOptions = { expiresIn: '1h', algorithm };
    const token = jwt.sign(payload, private_key, tokenOptions);
    tokens.push(token);
}

parentPort.postMessage({
    tokens 
});