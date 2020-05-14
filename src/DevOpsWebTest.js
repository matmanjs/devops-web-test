const path = require('path');
const _ = require('lodash');
const fse = require('fs-extra');
const ejs = require('ejs');
const compressing = require('compressing');
const $ = require('cheerio');

const pkg = require('../package');

const util = require('./util');
const businessProcessHandler = require('./business/process-handler');
const businessLocalCache = require('./business/local-cache');

const matman = require('matman');

class DevOpsWebTest {
    constructor(dwtPath, config = {}) {
        // DWT（DevOps for Web Test） 目录，流水线式执行web自动化测试和输出测试产物的路径，如果插件传入了相对路径，则是相对于该路径而言
        this.dwtPath = util.getAbsolutePath(dwtPath);

        // 测试产物输出目录
        this.outputPath = util.getAbsolutePath(this.dwtPath, config.outputPath || 'output');

        this.NPM = config.NPM || 'npm';

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

    /**
     * 清理
     *
     * @param opts
     * @param opts.doNotRemoveOutput
     * @return {Promise<void>}
     */
    async clean(opts = {}) {
        // 清理本地缓存的记录，记录了过去占用的端口等信息
        await businessLocalCache.clean({
            seqId: this.seqId
        });

        if (!opts.doNotRemoveOutput) {
            // 清理掉 output 目录
            console.log('\n');
            console.log(`准备清理 output 文件: ${this.outputPath}`);
            fse.removeSync(this.outputPath);
            console.log(`清理 output 文件成功！`);
        }
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
        const whistleRules = getWhistleRules(this);

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

    /**
     * 分析并生成测试覆盖率数据
     *
     * @param globPattern
     * @param reporterDir
     */
    async createE2ECoverage(globPattern, reporterDir) {
        console.log('准备生成端对端自动化测试报告！', globPattern, reporterDir);

        return await matman.istanbulUtil.createE2ECoverage(globPattern, {
            dir: reporterDir
        })
            .then((data) => {
                console.log('生成端对端自动化测试报告成功！', data);
                return data;
            })
            .catch((err) => {
                this.isExistCoverageReport = false;
                console.error('生成端对端自动化测试报告失败！', err && err.message || err);
            });
    }

    /**
     * 将端对端测试运行结果拷贝到归档目录中
     *
     * @param opts
     */
    async copyMatmanBuildOutputToArchive(opts = {}) {
        try {
            const {
                srcPath,
                distPath,
                generatedE2ECoverageDir,
                coverageOutputPath
            } = opts;

            if (fse.pathExistsSync(srcPath)) {
                // 将端对端测试运行结果拷贝到归档目录中
                fse.copySync(srcPath, distPath);
            }

            if (fse.pathExistsSync(generatedE2ECoverageDir)) {
                // 把生成的覆盖率的结果单独拷贝处理
                fse.copySync(generatedE2ECoverageDir, coverageOutputPath);
            }

            // 需要移除部分不需要的文件，避免最后归档文件过大
            fse.removeSync(path.join(distPath, 'coverage_output'));

            console.log('copyMatmanBuildOutputToArchive success!');
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * 获得单元测试报告数据
     *
     * @param {String} name
     * @param {Object} opts
     * @return {Object}
     */
    getTestReport(name, opts = {}) {
        return getTestReport(name, opts);
    }

    /**
     * 保存自定义报告入口文件
     * @param {Object} data
     * @param {String} outputPath
     */
    saveOutputIndexHtml(data, outputPath) {
        // 获取模版内容
        const tplPath = path.join(__dirname, '../tpl/index.html.tpl');
        const tplContent = fse.readFileSync(tplPath, {
            encoding: 'utf8'
        });

        const tplData = Object.assign({
            pkg
        }, data);

        // 获取最终内容
        let htmlContent = ejs.render(tplContent, tplData);

        // 保存文件
        fse.outputFileSync(path.join(outputPath, 'index.html'), htmlContent);
        fse.outputJsonSync(path.join(outputPath, 'index-html.json'), tplData);
    }

    async compressDir(sourceFolder, outputZipPath) {
        const source = sourceFolder;
        const tmpDest = path.join(__dirname, path.basename(outputZipPath));
        const dest = outputZipPath;
        console.log(dest);

        // 压缩zip，注意先保存在临时目录里面
        await compressing.zip.compressDir(source, tmpDest);

        // 然后再移动目的地
        fse.moveSync(tmpDest, dest, {
            overwrite: true
        });
    }
}

/**
 * 获得处理之后的百分值，留两位有效数字
 * @param {Number} percent 百分值，例如 99.19354838709677
 * @return {String} 保留两位有效数字，例如 99.19
 */
function getPercentShow(percent) {
    return percent.toFixed(2);
}

/**
 * 将毫秒时间转义为易识别的时间
 * @param {Number} duration 时间，单位毫秒
 */
function getDurationShow(duration = 0) {
    const ONE_SECOND = 1000;
    const ONE_MINUTE = 60 * ONE_SECOND;

    if (duration < ONE_MINUTE) {
        return duration / ONE_SECOND + '秒';
    } else {
        const minutes = parseInt(duration / ONE_MINUTE, 10);
        const seconds = (duration - minutes * ONE_MINUTE) / ONE_SECOND;
        return minutes + '分' + seconds + '秒';
    }
}

/**
 * 从测试报告中获得自己需要的报告
 *
 * @param {String} name
 * @param {Object} opts
 * @return {Object}
 */
function getTestReport(name, opts) {
    const { enableTest, mochawesomeFilePath, coverageHtmlPath } = opts;

    // 如果不运行测试的话
    if (!enableTest) {
        return {
            testResult: {
                summary: `已配置不执行${name}！`
            }
        };
    }

    // 如果没有这个报告，则说明并没有执行测试
    if (!fse.existsSync(mochawesomeFilePath)) {
        return {
            testResult: {
                summary: `${name}失败，没有测试报告！`
            }
        };
    }

    const testResult = {};
    const mochawesomeJsonData = require(mochawesomeFilePath);

    // 执行的结果状态
    testResult.stats = mochawesomeJsonData.stats || {};

    // 测试用例通过率
    // 注意 testResult.stats.passPercent 会把 passes 和 pending（用it.skip语法主动跳过的用例） 都算成功
    // testResult.passPercent = getPercentShow(testResult.stats.passPercent);
    testResult.passPercent = getPercentShow(testResult.stats.passes * 100 / testResult.stats.testsRegistered);

    // 测试用例实际成功率
    testResult.actualSuccessPercent = getPercentShow(testResult.stats.passes * 100 / (testResult.stats.passes + testResult.stats.failures));

    // 运行耗时
    testResult.duration = getDurationShow(testResult.stats.duration);

    // 报告汇总
    // 单元测试通过率: 98.85%（431/436)，实际成功率: 100.00%（431/(431+0)，耗时 0.112秒，总用例数436个，成功431个，失败0个，主动跳过未执行4个，超时异常未执行1个
    testResult.summary = `${name}通过率: ${testResult.passPercent}%（${testResult.stats.passes}/${testResult.stats.testsRegistered})，实际成功率: ${testResult.actualSuccessPercent}%（${testResult.stats.passes}/(${testResult.stats.passes}+${testResult.stats.failures})，耗时 ${testResult.duration}，总用例数${testResult.stats.testsRegistered}个，成功${testResult.stats.passes}个，失败${testResult.stats.failures}个，主动跳过未执行${testResult.stats.pending}个，超时异常未执行${testResult.stats.skipped}个`;

    // 从覆盖率文件中获得覆盖率数据
    const coverageResult = getCoverageDataFromIndexHtml(coverageHtmlPath);

    const isCoverageSuccess = !!(coverageResult && coverageResult.htmlResult);

    return {
        testResult,
        coverageResult,
        isTestSuccess: true,
        isCoverageSuccess
    };
}

function getCoverageDataFromIndexHtml(filePath) {
    const result = {};

    if (!fse.existsSync(filePath)) {
        return result;
    }

    try {
        // html 文件内容
        const contents = fse.readFileSync(filePath, { encoding: 'utf8' });

        // 获取关键数据
        result.htmlResult = $('.wrapper .pad1 .clearfix', contents).html() || '';

        const map = {};

        // 解析出数据
        $('.coverage-wrapper > div', `<div class="coverage-wrapper">${result.htmlResult}</div>`).each(function () {
            const $this = $(this);
            const value = $('span', $this).eq(0).text().trim();
            const name = $('span', $this).eq(1).text().trim().toLowerCase();
            const desc = $('span', $this).eq(2).text().trim();

            map[name] = {
                name,
                value,
                desc
            };
        });

        result.data = map;

        return result;
    } catch (err) {
        return result;
    }
}

module.exports = DevOpsWebTest;