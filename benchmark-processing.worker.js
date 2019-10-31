'use strict'

const { parentPort, workerData } = require("worker_threads");
const jwt = require("jsonwebtoken");

const { tokens, key } = workerData;

const invalidTokenList = tokens.filter(token => {
    try {
        jwt.verify(token, key);
        return false;
    }catch(e) {
        return true;
    }
});

parentPort.postMessage({
    tokenInvalid:invalidTokenList.length,
    tokenChecked:tokens.length
});