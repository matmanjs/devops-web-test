const path = require('path');
const fs = require('fs');
const os = require('os');
const util = require('util');
const cp = require('child_process');

const fse = require('fs-extra');
const osenv = require('osenv');
const _ = require('lodash');

const yaml = require('../util/yaml');
const runCmd = require('../util/run-cmd');
const businessProcessHandler = require('./process-handler');
// const colorsLog = require('./colorsLog');

// 数据缓存的根目录
const DATA_DIR = path.join(osenv.home(), '.devops-web-test');
fse.ensureDirSync(DATA_DIR);

console.log(`本地临时缓存目录 DATA_DIR=${DATA_DIR}`);

// 启动数据缓存文件路径
const TEST_CACHE_PATH = path.join(DATA_DIR, 'testAppData.yml');
fse.ensureFileSync(TEST_CACHE_PATH);

/**
 * 获得缓存数据
 *
 * @return {Object || null}
 */
function getCache() {
    const cacheData = yaml.getCache(TEST_CACHE_PATH);

    if (!cacheData) {
        console.log('local-cache is null');
    }

    return cacheData;
}

/**
 * 获得缓存数据
 *
 * @param {Object} obj 要保持的对象
 */
function saveCache(obj) {
    return yaml.saveCache(obj, TEST_CACHE_PATH);
}

async function _cleanTestRecord(seqId, cacheData) {
    console.log(`_cleanTestRecord local-cache: ${seqId} ${JSON.stringify(cacheData[seqId])}`);

    const cacheTestRecord = cacheData[seqId];

    if (cacheTestRecord && cacheTestRecord.list && cacheTestRecord.list.length) {
        // 杀掉进程
        const pids = [];

        cacheTestRecord.list.forEach((item) => {
            if (item.pid) {
                pids.push(item.pid);
            }
        });

        if (pids.length) {
            try {
                await businessProcessHandler.killPids(pids);
            } catch (e) {
                console.log(`killPids failed`, pids, e);
            }
        }
    }

    // 删除本地缓存对应的记录
    delete cacheData[seqId];

    // 更新到本地缓存
    saveCache(cacheData);
}

async function clean(testRecord) {
    const cacheData = getCache();

    if (!cacheData) {
        return;
    }

    const data = testRecord && cacheData[testRecord.seqId];

    // 如果存在记录，则清理当前id对应的 pid 记录
    if (data) {
        console.log(`${testRecord.seqId} exist in local-cache`);

        await _cleanTestRecord(testRecord.seqId, cacheData);
    }

    // 检查：两个小时过期
    const EXPIRE = 2 * 60 * 60 * 1000;
    const nowTimestamp = Date.now();

    for (let key in cacheData) {
        if (nowTimestamp - cacheData[key].t > EXPIRE) {
            await _cleanTestRecord(key, cacheData);
        }
    }
}

function getUsedPort() {
    const cacheData = getCache();

    if (!cacheData) {
        return [];
    }

    let result = [];
    for (let key in cacheData) {
        const list = cacheData[key].list;
        if (list && list.length) {
            result = result.concat(list.map(item => item.port));
        }
    }

    return _.uniq(result);
}

function saveUsedPort(name, port, testRecord) {
    const cacheData = getCache() || {};

    const item = {
        name,
        port
    };

    let data = cacheData[testRecord.seqId];

    // 如果存在记录，则清理当前id对应的 pid 记录
    if (data) {
        data.list.push(item);
    } else {
        data = {
            list: [item]
        };
    }

    // 更新时间
    data.t = Date.now();
    data.dwtPath = testRecord.dwtPath;

    // 更新记录
    cacheData[testRecord.seqId] = data;

    // 保存到本地
    saveCache(cacheData);
}

function saveUsedPid(name, pid, testRecord) {
    const cacheData = getCache() || {};

    let data = cacheData[testRecord.seqId];

    // 如果存在记录，则清理当前id对应的 pid 记录
    if (!data) {
        return;
    }

    const item = data.list.filter(item => item.name === name)[0];
    if (!item) {
        return;
    }

    item.pid = pid;

    // 更新时间
    data.t = Date.now();

    // 更新记录
    cacheData[testRecord.seqId] = data;

    // 保存到本地
    saveCache(cacheData);
}

function saveLastUsedPort(name, port) {
    const cacheData = getCache() || {};
    const saveKey = `lastUsed${name}`;

    // 更新记录
    cacheData[saveKey] = {
        port,
        t: Date.now()
    };

    // 保存到本地
    saveCache(cacheData);
}

function getLastUsedPort(name) {
    const cacheData = getCache() || {};
    const saveKey = `lastUsed${name}`;
    const saveData = cacheData[saveKey];

    return saveData && saveData.port;
}

module.exports = {
    getCache,
    saveCache,
    clean,
    getUsedPort,
    saveUsedPort,
    saveUsedPid,
    getLastUsedPort,
    saveLastUsedPort
};