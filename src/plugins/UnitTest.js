const path = require('path');
const runCmd = require('../util/run-cmd');
const util = require('../util');

const fse = require('fs-extra');

const BasePlugin = require('./BasePlugin');

class PluginUnitTest extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginUnitTest', opts);

        /**
         * 单元根路径，由于蓝盾测试项目为 DevOps/devops-app ，因此相对而言项目路径为 ../../
         * @type {String}
         */
        this.rootPath = opts.rootPath || '../../';

        /**
         * 单元测试输出的路径
         * @type {String}
         */
        this.outputPath = '';

        /**
         * 单元测试的覆盖率输出的路径，在 this.outputPath 之内
         * @type {String}
         */
        this.coverageOutputPath = '';

        /**
         * 安装依赖时执行的命令，当其为函数时，会传入参数 testRecorder
         * @type {String|Function}
         */
        this.installCmd = opts.installCmd || function (testRecord) {
            return `tnpm install`;
        };

        /**
         * 执行测试的命令
         * @type {String|Function}
         */
        this.testCmd = opts.testCmd || function (testRecord) {
            return `npx cross-env BABEL_ENV=test mocha`;
        };

        /**
         * 执行测试的命令
         * @type {String|Function} 接受两个参数：testCmd, testRecord
         */
        this.coverageCmd = opts.coverageCmd || function (testCmd, testRecord) {
            return `npx nyc --silent ${testCmd.replace(/^npx\s+/, ' ')}`;
        };

        /**
         * 在运行测试之前执行的钩子函数
         *
         * @type {Function} 接受两个参数：testRecord, runCmd
         */
        this.onBeforeTest = opts.onBeforeTest;

        /**
         * 检查测试是否完成，传入 data 参数，代表的是控制台输出，在某些场景下，可以通过判断某些输出，来判断测试已经结束，如果返回 true，则将强制结束构建
         * @type {Function}
         */
        this.testCompleteCheck = (typeof opts.testCompleteCheck === 'function' ? opts.testCompleteCheck : function (data) {
            return false;
        });

        /**
         * 检查覆盖率是否完成
         * @type {Function}
         */
        this.coverageCompleteCheck = opts.coverageCompleteCheck;
    }

    /**
     * 初始化
     * @override
     */
    async init(testRecord) {
        await super.init(testRecord);

        // 特殊处理下目录，将其修改为绝对路径
        this.rootPath = util.getAbsolutePath(testRecord.basePath, this.rootPath);

        this.outputPath = path.join(testRecord.outputPath, 'unit_test_report');
        this.coverageOutputPath = path.join(this.outputPath, 'coverage');

        testRecord.addTestCustomParams({
            unitTestRelativePathToOutput: path.relative(testRecord.outputPath, this.outputPath),
            unitTestCoverageRelativePathToOutput: path.relative(testRecord.outputPath, this.coverageOutputPath)
        });
    }

    /**
     * 执行之前
     * @override
     */
    async beforeRun(testRecord) {
        await super.beforeRun(testRecord);
    }

    /**
     * 执行
     * @override
     */
    async run(testRecord) {
        await super.run(testRecord);

        console.log('\n');
        console.log('ready to runTest for unit test ...');

        // 安装依赖
        await this.install(testRecord);

        // 在运行测试之前执行的钩子函数
        if (typeof this.onBeforeTest === 'function') {
            await Promise.resolve(this.onBeforeTest.call(this, testRecord, runCmd));
        }

        // 启动测试
        await this.runTest(testRecord);

        // 获取单元测试覆盖率
        await this.runCoverage(testRecord);

        // 追加结果到蓝盾变量中
        testRecord.addTestCustomParams({
            shouldRunUnitTest: this.shouldRun(testRecord)
        });

        console.log('runTest for unit test finished!');
        console.log('\n');
    }

    /**
     * 执行之后
     * @override
     */
    async afterRun(testRecord) {
        await super.afterRun(testRecord);
    }

    /**
     * 安装依赖
     *
     * @param testRecord
     */
    async install(testRecord) {
        if (testRecord.isDev) {
            return Promise.resolve();
        }

        const cmd = util.getFromStrOrFunc(this.installCmd, testRecord);

        const command = `${cmd}`;

        await runCmd.runByExec(command, { cwd: this.rootPath });
    }

    /**
     * 启动测试
     *
     * @param testRecord
     */
    async runTest(testRecord) {
        if (typeof this.testCmd === 'function') {
            this.testCmd = this.testCmd.bind(this);
        }

        // 获得测试命令
        const command = util.getFromStrOrFunc(this.testCmd, testRecord);

        await runCmd.runByExec(command, { cwd: this.rootPath }, this.testCompleteCheck.bind(this));

        this._cacheTestCmd = command;
    }

    /**
     * 获取单元测试覆盖率
     *
     * @param testRecord
     */
    async runCoverage(testRecord) {
        if (typeof this.coverageCmd === 'function') {
            this.coverageCmd = this.coverageCmd.bind(this);
        }

        const command = util.getFromStrOrFunc(this.coverageCmd, this._cacheTestCmd, testRecord);

        this._cacheCoverageCmd = command;

        await runCmd.runByExec(command, { cwd: this.rootPath });

        // 检查文件已经存在才算结束
        // 2020.3.13 发现命令执行完成时，coverage 文件夹可能还没有来的及生成
        if (typeof this.coverageCompleteCheck === 'function') {
            await Promise.resolve(this.coverageCompleteCheck.call(this, testRecord));
        }
    }
}

module.exports = PluginUnitTest;