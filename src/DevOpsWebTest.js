const path = require('path');
const _ = require('lodash');
const fse = require('fs-extra');
const util = require('./util');
const businessProcessHandler = require('./business/process-handler');
const businessLocalCache = require('./business/local-cache');

class DevOpsWebTest {
    constructor(dwtPath, config = {}) {
        // DWT（DevOps for Web Test） 目录，流水线式执行web自动化测试和输出测试产物的路径，如果插件传入了相对路径，则是相对于该路径而言
        this.dwtPath = util.getAbsolutePath(dwtPath);

        // 测试产物输出目录
        this.outputPath = util.getAbsolutePath(this.dwtPath, config.outputPath || 'output');

        // 是否为开发者模式
        this.isDev = !!config.isDev;

        // 自动生成的唯一ID，用于区别不同批次的流程，
        // 尤其是有多个流程在同一个测试机中运行的时候，如果不做区分，则可能会有相互影响
        // 注意不要出现等号，否则whistle里面会有问题
        this.seqId = this.isDev ? 'dev' : util.getBase64(this.dwtPath, 6).replace(/=/gi, 'd') + Date.now();

        // 用在蓝盾系统中的自定义环境变量，可用于在蓝盾站点中配置使用
        this.cacheData = {
            // DWT（DevOps for Web Test） 目录，流水线式执行web自动化测试和输出测试产物的路径，如果插件传入了相对路径，则是相对于该路径而言
            dwtPath: this.dwtPath,

            // 输出文件的绝对路径
            outputPath: this.outputPath
        };

        this._startTime = Date.now();
    }

    /**
     * 设置缓存数据
     *
     * @param {Object} obj
     */
    addCacheData(obj) {
        this.cacheData = _.merge({}, this.cacheData, obj);
    }

    /**
     * 获得缓存数据
     *
     * @return {Object}
     */
    getCacheData() {
        return this.cacheData;
    }

    /**
     * 获取耗时，单位为 ms
     * @return {Number}
     */
    getTotalCost() {
        return Date.now() - this._startTime;
    }

    async saveJsonFile(jsonFilePath, jsonData) {
        fse.outputJsonSync(jsonFilePath, jsonData);
    }

    async runByExec(cmdToRun, options, customCloseHandler) {
        const cmd = util.getFromStrOrFunc(cmdToRun);

        // const command = `${cmd} --dwt-${this.seqId}`;
        const command = `${cmd}`;

        return util.runByExec(command, options, customCloseHandler);
    }

    async findAvailablePort(name = 'unknown') {
        // 获得本地缓存的已经被占用的端口
        const usedPort = businessLocalCache.getUsedPort();

        // 获得可用的端口
        const port = await util.findAvailablePort(9528, usedPort);

        if (port) {
            // 缓存在本地
            businessLocalCache.saveUsedPort(name, port, {
                seqId: this.seqId,
                dwtPath: this.dwtPath
            });
        }

        return port;
    }

    async lockPort(name, port, pid) {
        // 缓存在本地
        businessLocalCache.saveUsedPid(name, pid, {
            seqId: this.seqId,
            dwtPath: this.dwtPath
        });
    }

    async checkIfWhistleIsStarted(port) {
        // 自检一下 whistle 是否真正启动了
        const checkURL = `http://127.0.0.1:${port}/cgi-bin/get-data`;

        await util.checkAndWaitURLAvailable(checkURL)
            .then((data) => {
                return data;
            })
            .catch((err) => {
                return Promise.reject(`检测 whistle 未成功启动, checkURL=${checkURL}`);
            });
    }

    async generateWhistleRulesConfigFile(configFile, getWhistleRules) {
        const whistleRules = getWhistleRules();

        // 校验合法性
        if (!whistleRules || !whistleRules.name || !whistleRules.rules) {
            console.log('无法自动生成 whistle 代理规则！', JSON.stringify(this));
            return Promise.reject('无法自动生成 whistle 代理规则！');
        }

        let ruleContent = whistleRules.rules;

        // 设置开启 Capture TUNNEL CONNECTs，否则 https 情况下可能会有问题
        const shouldEnableCapture = '* enable://capture';
        ruleContent = `${shouldEnableCapture}\n\n${ruleContent}`;

        // 更新
        whistleRules.rules = ruleContent;

        // 文件内容
        const configFileContent = `module.exports = ${JSON.stringify(whistleRules, null, 2)};`;

        // 保存文件
        fse.outputFileSync(configFile, configFileContent);

        console.log(`成功生成 whistle 规则配置文件: ${configFile}, 文件内容为：\n ${configFileContent}`);
    }
}

module.exports = DevOpsWebTest;