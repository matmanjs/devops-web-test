const runCmd = require('../util/run-cmd');

function kill(search) {
    console.log('---process handler kill---', search);

    // ps aux | grep "mockstar-e2etest" | grep -v grep | awk '{print $2}' | xargs kill -9
    const command = `ps aux | grep "${search}" | grep -v grep | awk '{print $2}' | xargs kill -9`;

    return runCmd.runByExec(command)
        .then((data) => {
            console.log(`kill by search=${search} success!`);
            return data;
        })
        .catch((err) => {
            console.log(`kill by search=${search} fail!`, err);
            return Promise.reject(err);
        });
}

function killPids(pids) {
    console.log('---process handler killPids---', pids);

    const pidList = Array.isArray(pids) ? pids : [pids];

    const command = `kill -9 ${pidList.join(' ')}`;

    return runCmd.runByExec(command)
        .then((data) => {
            console.log(`kill by pids=${pids} success!`);
            return data;
        })
        .catch((err) => {
            console.log(`kill by pids=${pids} fail!`, err);
            return Promise.reject(err);
        });
}

function exit(testRecord, delay = 1000) {
    console.log('---process handler exit---', delay);

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            process.exit();
            resolve();
        }, delay);
    });
}

module.exports = {
    kill,
    killPids,
    exit
};