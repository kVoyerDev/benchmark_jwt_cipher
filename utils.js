'use strict'

const generator  = require("generate-password");
const { WorkerPool } = require("pool-worker-threads");
const pool = new WorkerPool(4, true);
const createWorker = async (options) => {
    const start = Date.now();
    const res = await pool.exec(options).toPromise();
    return { 
        processingDuration:Date.now() - start,
        ...res
    };
}

/**
 * @param {number} length 
 */
const getRandomSecret = length => generator.generate({
    length,
    numbers:true,
    symbols:false
});

module.exports = {
    createWorker,
    getRandomSecret,
    pool
};