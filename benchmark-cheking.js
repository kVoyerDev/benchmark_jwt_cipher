'use strict'

const benchmarkChecking = (benchmarks, algorithms) => {
    for (let bench of benchmarks) {
        const { algorithm, tests, tokens } = bench;
    
        if (!algorithms.includes(algorithm)) {
            console.error(`Unknow algorithm [${algorithm}]`);
            process.exit(1);
        }

        if (typeof tokens !== "number") {
            console.error(`Set a number as [tokens] for algorithm [${algorithm}]`);
            process.exit(1);
        }

        if (!(tests instanceof Array) || tests.length === 0) {
            console.error(`You must provide test(s) for algorithm [${algorithm}]`);
            process.exit(1);
        }
        tests.forEach(test => {
            const { thread_number, active } = test;
            if (typeof active !== "boolean") {
                console.error(`Set a boolean as [active] for algorithm [${algorithm}]`);
                process.exit(1);
            }
        
            if (typeof thread_number !== "number") {
                console.error(`Set a number as [thread_number] for algorithm [${algorithm}]`);
                process.exit(1);
            }
        });
    }
};

module.exports = { benchmarkChecking };