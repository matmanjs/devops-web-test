const path = require('path');
const fse = require('fs-extra');
const ejs = require('ejs');
const compressing = require('compressing');
const $ = require('cheerio');

const pkg = require('../../package');

const BasePlugin = require('./BasePlugin');

class PluginArchive extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginArchive', opts);

        /**
         * 获得 getPlugins 规则
         * @type {Function}
         */
        this.getPlugins = (typeof opts.getPlugins === 'function' ? opts.getPlugins : function (testRecord) {
            return {
                pluginE2ETest: null,
                pluginUnitTest: null,
                pluginWhistle: null
            };
        });
    }

    /**
     * 初始化
     * @override
     */
    async init(testRecord) {
        await super.init(testRecord);

        this.rootPath = testRecord.outputPath;

        // 产出文件：output.zip，将整个 output 打包，以便在其他场景下使用
        this.outputZipPath = path.join(this.rootPath, 'output.zip');

        // 产出文件: index.html
        this.indexHtmlPath = path.join(this.rootPath, 'index.html');

        // 产出文件: index-html.json
        this.indexHtmlDataPath = path.join(this.rootPath, 'index-html.json');

        // 产出文件: test-recorder.json
        this.testRecordPath = path.join(this.rootPath, 'test-record.json');

        // 追加结果到蓝盾变量中
        testRecord.addTestCustomParams({
            archiveConfig: {
                path: path.relative(testRecord.workspacePath, this.rootPath),
                entryFile: 'index.html',
                tag: 'web自动化测试结果报告'
            },
            outputZipRelativePath: path.relative(testRecord.workspacePath, this.outputZipPath)
        });
    }

    /**
     * 执行之前
     * @override
     */
    async beforeRun(testRecord) {
        await super.beforeRun(testRecord);

        await this.clean(testRecord);
    }

    /**
     * 执行
     * @override
     */
    async run(testRecord) {
        await super.run(testRecord);

        console.log('\nready to archive ...');

        const pluginMap = this.getPlugins(testRecord);

        // 获得 matman 端对端测试报告数据
        const e2eTestReport = this.getE2ETestReport(testRecord, pluginMap.pluginE2ETest);

        // 获得单元测试报告数据
        const unitTestReport = this.getUnitTestReport(testRecord, pluginMap.pluginUnitTest);

        // 判定测试是否成功
        // result: 0为成功，1为失败, 2为跳过部分测试
        let unionTestReport = {
            result: 0
        };

        let summary = '';
        if (e2eTestReport.testResult.stats == undefined) {
            unionTestReport.result = 2;
            summary += e2eTestReport.testResult.summary + '\n';
        }
        if (unitTestReport.testResult.stats == undefined) {
            unionTestReport.result = 2;
            summary += unitTestReport.testResult.summary + '\n';
        }

        if (e2eTestReport.testResult.stats != undefined)
            if (e2eTestReport.testResult.stats.failures != 0 || e2eTestReport.testResult.stats.skipped != 0) {
                unionTestReport.result = 1;
                summary += '端到端测试不通过' + '\n';
            }
        if (unitTestReport.testResult.stats != undefined)
            if (unitTestReport.testResult.stats.failures != 0 || unitTestReport.testResult.stats.skipped != 0) {
                unionTestReport.result = 1;
                summary += '单元测试不通过' + '\n';
            }

        unionTestReport.summary = summary;

        // 追加结果到蓝盾变量中
        testRecord.addTestCustomParams({
            e2eTest: e2eTestReport.testResult,
            unitTest: unitTestReport.testResult,
            unionResult: unionTestReport
        });

        // 保存自定义报告入口文件
        this.saveOutputIndexHtml(testRecord, pluginMap);

        // 保存 testRecord 内容
        this.saveTestRecordContent(testRecord);

        // 压缩下 output 目录
        await this.compressDir(testRecord);
    }

    /**
     * 执行之后
     * @override
     */
    async afterRun(testRecord) {
        await super.afterRun(testRecord);
    }

    /**
     * 清理
     *
     * @param testRecord
     */
    async clean(testRecord) {
        console.log('\n');
        console.log(`准备清理 output 文件: ${this.rootPath}`);
        fse.removeSync(this.rootPath);
        console.log(`output 文件成功！`);
    }

    /**
     * 获得 matman 端对端测试报告数据
     * @param {Object} testRecord
     * @return {Object}
     */
    getE2ETestReport(testRecord, pluginE2ETest) {
        // 产出文件: e2e_test_report/mochawesome.json
        const e2eTestReportPath = `${pluginE2ETest.outputPath}/mochawesome.json`;

        return getTestReport('端对端测试', pluginE2ETest.shouldRun(testRecord), e2eTestReportPath);
    }

    /**
     * 获得单元测试报告数据
     * @param {Object} testRecord
     * @return {Object}
     */
    getUnitTestReport(testRecord, pluginUnitTest) {
        // 产出文件: unit_test_report/mochawesome.json
        const unitTestReportPath = `${pluginUnitTest.outputPath}/mochawesome.json`;

        return getTestReport('单元测试', pluginUnitTest.shouldRun(testRecord), unitTestReportPath);
    }

    /**
     * 保存自定义报告入口文件
     * @param {Object} testRecord
     */
    saveOutputIndexHtml(testRecord, pluginMap) {
        // 获取模版内容
        const tplPath = path.join(__dirname, '../../tpl/index.html.tpl');
        const tplContent = fse.readFileSync(tplPath, {
            encoding: 'utf8'
        });

        // 总耗时
        const totalCost = `${testRecord.getTotalCost() / 1000} 秒`;

        // 获取模板中需要的数据
        const tplData = {
            testRecord,
            pkg,
            dwtCustomPackageInfo: testRecord.dwtCustomPackageInfo,
            totalCost,
            list1: [],
            list2: [],
            e2eTest: {
                shouldTest: pluginMap.pluginE2ETest.shouldRun(testRecord),
                msg: testRecord.testCustomParams.e2eTest.summary,
                outputUrl: `${path.relative(testRecord.outputPath, pluginMap.pluginE2ETest.outputPath)}/mochawesome.html`
            },
            e2eTestCoverage: {
                shouldRun: pluginMap.pluginE2ETest.shouldRun(testRecord),
                isExist: pluginMap.pluginE2ETest.isExistCoverageReport,
                outputUrl: `${path.relative(testRecord.outputPath, pluginMap.pluginE2ETest.coverageOutputPath)}/index.html`
            },
            unitTest: {
                shouldTest: pluginMap.pluginUnitTest.shouldRun(testRecord),
                msg: testRecord.testCustomParams.unitTest.summary,
                outputUrl: `${path.relative(testRecord.outputPath, pluginMap.pluginUnitTest.outputPath)}/mochawesome.html`
            },
            unitTestCoverage: {
                shouldRun: pluginMap.pluginUnitTest.shouldRun(testRecord),
                outputUrl: `${path.relative(testRecord.outputPath, pluginMap.pluginUnitTest.coverageOutputPath)}/index.html`
            }
        };

        // 从 coverage/index.html 中获取覆盖率信息
        if (tplData.e2eTestCoverage.shouldRun && tplData.e2eTestCoverage.outputUrl) {
            const coverageData = getCoverageDataFromIndexHtml(path.join(testRecord.outputPath, tplData.e2eTestCoverage.outputUrl));
            tplData.e2eTestCoverage.resultMsg = coverageData.htmlResult || '';

            if (coverageData.data) {
                // 追加结果到蓝盾变量中
                testRecord.addTestCustomParams({
                    e2eTestCoverage: coverageData.data
                });
            }
        }

        // 从 coverage/index.html 中获取覆盖率信息
        if (tplData.unitTestCoverage.shouldRun && tplData.unitTestCoverage.outputUrl) {
            const coverageData = getCoverageDataFromIndexHtml(path.join(testRecord.outputPath, tplData.unitTestCoverage.outputUrl));
            tplData.unitTestCoverage.resultMsg = coverageData.htmlResult || '';

            if (coverageData.data) {
                // 追加结果到蓝盾变量中
                testRecord.addTestCustomParams({
                    unitTestCoverage: coverageData.data
                });
            }
        }

        tplData.list2.push({
            url: `output.zip`,
            msg: 'output.zip'
        });

        tplData.list2.push({
            url: `test-record.json`,
            msg: 'test-record.json'
        });

        if (pluginMap.pluginE2ETest.shouldRun(testRecord)) {
            tplData.list2.push({
                url: pluginMap.pluginWhistle.configFileName,
                msg: pluginMap.pluginWhistle.configFileName
            });
        }

        // 获取最终内容
        let htmlContent = ejs.render(tplContent, tplData);

        // 保存文件
        fse.outputFileSync(this.indexHtmlPath, htmlContent);
        fse.outputJsonSync(this.indexHtmlDataPath, tplData);
    }

    /**
     * 保存 testRecord 内容
     * @param {Object} testRecord
     */
    saveTestRecordContent(testRecord) {
        // 复制一份数据，简化 xvfb 记录，这个对象比较大，没有意义
        const data = JSON.parse(JSON.stringify(testRecord));
        if (testRecord.xvfb && (typeof testRecord.xvfb === 'object')) {
            data.xvfb = {
                '_display': testRecord.xvfb._display,
                '_timeout': testRecord.xvfb._timeout,
                '_xvfb_args': testRecord.xvfb._xvfb_args,
                '_process': {
                    'spawnargs': testRecord.xvfb._process && testRecord.xvfb._process.spawnargs,
                    'pid': testRecord.xvfb._process && testRecord.xvfb._process.pid
                }
            };
        }

        fse.outputJsonSync(this.testRecordPath, data);
    }

    async compressDir(testRecord) {
        const source = this.rootPath;
        const tmpDest = path.join(testRecord.dwtPath, path.basename(this.outputZipPath));
        const dest = this.outputZipPath;
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
 * @param {Boolean} shouldRun
 * @param {String} testReportPath
 * @return {Object}
 */
function getTestReport(name, shouldRun, testReportPath) {
    // 如果不运行测试的话
    if (!shouldRun) {
        return {
            testResult: {
                summary: `已配置不执行${name}！`
            }
        };
    }

    const reportPath = testReportPath;

    // 如果没有这个报告，则说明并没有执行测试
    if (!fse.existsSync(reportPath)) {
        return {
            testResult: {
                summary: `${name}失败，没有测试报告！`
            }
        };
    }

    // 在蓝盾系统中定义的自定义全局变量
    const testResult = {};
    const reportResult = require(reportPath);

    // 执行的结果状态
    testResult.stats = reportResult.stats || {};

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

    return {
        testResult,
        reportResult
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

module.exports = PluginArchive;