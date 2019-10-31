'use strict'

const { Worker } = require("worker_threads");
const generator  = require("generate-password");

const createWorker = (service, options) => 
    new Promise((resolve, reject) => {
        const beforeProcessing = Date.now();
        const worker = new Worker(service, options);
        worker.on("message", data => {
            resolve({
                processingDuration: Date.now() - beforeProcessing,
                ...data
            });
        });
        worker.on("error", reject);
        worker.on("exit", code => {
            reject(new Error(`Worker stopped with code error ${code}`));
        });
    });

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
    getRandomSecret
};