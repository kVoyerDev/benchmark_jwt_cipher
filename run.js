'use strict'

const fs  = require("fs");
const os  = require("os");
const { run } = require("./benchmark");
const { pool } = require("./utils");

if (!fs.existsSync("./results"))
    fs.mkdir("./results", err => {
        if (err) {
            console.error("Can't create results directory");
        }
    });

run()
    .then(benchStates => {
        pool.destroy();
        const data = {
            host: {
                cpus:os.cpus()[0].model
            },
            benchStates
        };
        const date = new Date();
        const pattern = `${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;

        const file = `resBench-${pattern}.json`;
        fs.writeFileSync(`./results/${file}`, JSON.stringify(data, null, 4));
    })
    .catch(console.error);