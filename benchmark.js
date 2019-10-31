'use strict'

const { generateKeyPair }    = require('crypto');
const fs                     = require('fs');
const yaml                   = require('js-yaml');

const { benchmarkChecking } = require("./benchmark-cheking");
const { 
    getRandomSecret, 
    createWorker 
} = require("./utils");

try {
    var { benchmarks, config } = yaml.safeLoad(fs.readFileSync('./benchmarks.config.yml', 'utf8'));
} catch (e) {
    console.error(e);
    process.exit(1);
}

const benchsAlgos = new Map();
const dbTokens = new Map();

const generateRsaKeys = (modulusLength) => {
    return new Promise((resolve, reject) => {
        const keysOptions = {
            modulusLength,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        };
        generateKeyPair('rsa', keysOptions, (err, public_key, private_key) => {
            if (err) {
                console.error(err);
                reject(err);
                return;
            }
            resolve({public_key, private_key});
        });
    });
};

const buildBenchsAlgos = async () => {
    benchsAlgos.set("HS256", { private_key: getRandomSecret(256) });
    benchsAlgos.set("HS384", { private_key: getRandomSecret(384) });
    benchsAlgos.set("HS512", { private_key: getRandomSecret(512) });

    benchsAlgos.set("RS256", { ...await generateRsaKeys(1024) });
    benchsAlgos.set("RS384", { ...await generateRsaKeys(2048) });
    benchsAlgos.set("RS512", { ...await generateRsaKeys(4096) });

    const algorithms = Array.from(benchsAlgos.keys());
    benchmarkChecking(benchmarks, algorithms);
};

/**
 * @param {string} pathDB 
 * @param {*} bench 
 * @param {string[]} tokens 
 */
const createDBS = async (benchmarks, index) => {
    if (index === benchmarks.length)
        return [];

    var tokens = [];
    const bench = benchmarks[index];
    const workers = [];

    console.log(`Build data for bench ${bench.algorithm}...`);
    const start = Date.now();
    const { thread_db_building } = config;
    for (let i = 0; i < thread_db_building; i++) {
        const workerOptions = {
            workerData : {
                tokensToBuild:bench.tokens/thread_db_building,
                benchsAlgos,
                algorithm:bench.algorithm
            }
        };
        const workerPromise = createWorker("./build-db.worker.js", workerOptions);
        workers.push(workerPromise);
        workerPromise.catch(err => {
            console.error(err);
        });
    }

    const resWorkers = await Promise.all(workers);
    for (let resWorker of resWorkers)
        tokens = tokens.concat(resWorker.tokens);
    dbTokens.set(bench.algorithm, tokens);
    const duration = Date.now() - start;
    console.log(`Data for bench ${bench.algorithm} builded (${duration}ms)`);
    return [{algorithm:bench.algorithm, duration}, ...await createDBS(benchmarks, index + 1)];
};

const runTests = async (index, bench) => {
    if (index === bench.tests.length || !bench.tests[index].active)
        return [];

    const test = bench.tests[index];
    const tokens = dbTokens.get(bench.algorithm);
    const { public_key, private_key, passphrase } = benchsAlgos.get(bench.algorithm);
    const workers = [];
    const { thread_number } = test;
    const testDesc = `[${bench.algorithm}-${index+1}](thread:${thread_number})`;
    const msgBegin = `Processing for test ${testDesc}...`;
    console.log(msgBegin);
    const before = Date.now();
    for (let i = 0; i < test.thread_number; i++) {
        const partLength = parseInt(tokens.length/test.thread_number, 10);
        const dataWorker = tokens.slice(0, partLength);
        const workerOptions = {
            workerData: {
                key: public_key ? public_key : private_key,
                tokens:dataWorker,
                passphrase: passphrase
            }
        };
        workers.push(createWorker("./benchmark-processing.worker.js", workerOptions));
    }
    const workersReturns = await Promise.all(workers);
    const duration = Date.now() - before;
    const msgEnd = `Processing for test ${testDesc} done (${duration}ms)`;
    console.log(msgEnd);

    const resTest = {
        testnumber: index + 1,
        thread_number: test.thread_number,
        processingAndThreadInstance:duration,
        workersReturns
    };
    const nextIndex = index + 1;
    const resTestFromNext = await runTests(nextIndex, bench);
    return [resTest, ...resTestFromNext];
};

const runBenchs = async (benchmarks, index) => {
    if (index === benchmarks.length)
        return [];
    const bench = benchmarks[index];
    const resTests = await runTests(0, bench);
    dbTokens.delete(bench.algorithm);
    const resBench = {
        algorithm:bench.algorithm,
        buildDuration:0,
        tests:resTests
    };
    const nextIndex = index + 1;
    const resBenchFromNext = await runBenchs(benchmarks, nextIndex);
    return [resBench, ...resBenchFromNext];
}

const run = async (benchmarks) => {
    await buildBenchsAlgos();
    const buildStats = await createDBS(benchmarks, 0);
    const benchStats = await runBenchs(benchmarks, 0);
    for (let bs of buildStats) {
        const b = benchStats.find(b => b.algorithm === bs.algorithm);
        b.buildDuration = bs.duration;
    }
    return benchStats;
}

module.exports = { run:run.bind(null, benchmarks) };