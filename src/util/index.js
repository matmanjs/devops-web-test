const path = require('path');
const axios = require('axios');
const { findAvailablePort, killPort, portIsOccupied } = require('./port');
const { runBySpawn, runByExec } = require('./run-cmd');

function getAbsolutePath(basePath, curPath) {
    // 注意：有可能 rootPath 后面携带了一个反斜杠，需要去掉
    if (curPath) {
        return path.isAbsolute(curPath) ? curPath : path.resolve(path.join(basePath, curPath));
    } else {
        return path.isAbsolute(basePath) ? basePath : path.resolve(basePath);
    }
}

function getBase64(data, length) {
    const buff = Buffer.from(data + '');
    const base64data = buff.toString('base64');
    return length ? base64data.slice(-1 * length) : base64data;
}

function getFromStrOrFunc(target, ...args) {
    return (typeof target === 'function') ? target(...args) : target;
}

/**
 * 检查是否能访问，一直到能够访问或者访问超时为止
 *
 * @param {String} url 请求地址
 * @param {Object} [opts] 选项
 * @param {Number} [opts.retryLimit] 最多重试次数
 * @param {Number} [opts.count] 当前重试次数
 * @param {Number} [opts.timeout] 每次重试之后需要等待的时间，单位为ms
 * @return {Promise<Boolean>}
 */
async function checkAndWaitURLAvailable(url, opts = {}) {
    const result = await axios.get(url).catch(() => {
    });

    if (!opts.count) {
        opts.count = 0;
    }
    if (!opts.retryLimit) {
        opts.retryLimit = 10;
    }
    if (!opts.timeout) {
        opts.timeout = 1000;
    }

    if (result) {
        console.log(`checkAndWaitURLAvailable return true!`, url, opts);
        return true;
    } else if (opts.count >= opts.retryLimit) {
        console.log(`retry max! ${opts.count}/${opts.retryLimit}`);
        return Promise.reject(new Error('retry max'));
    } else {
        opts.count++;

        console.log(`check again: ${opts.count}/${opts.retryLimit}, waiting ${opts.timeout}ms`);

        return new Promise((resolve, reject) => {
            setTimeout(async () => {

                checkAndWaitURLAvailable(url, opts)
                    .then((data) => {
                        resolve(data);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }, opts.timeout);
        });
    }
}

module.exports = {
    getAbsolutePath,
    getBase64,
    getFromStrOrFunc,
    checkAndWaitURLAvailable,
    findAvailablePort,
    killPort,
    portIsOccupied,
    runBySpawn,
    runByExec
};

