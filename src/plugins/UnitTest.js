const path = require('path');
const util = require('../util');

const BasePlugin = require('./BasePlugin');

class PluginUnitTest extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginUnitTest', opts);

        /**
         * 执行单元测试的根路径
         * 默认值： 由于我们推荐 DWT 路径为 DevOps/devops-app ，因此相对而言项目路径为 ../../
         *
         * @type {String}
         */
        this.runTestPath = opts.runTestPath || '../../';

        /**
         * 单元测试结果输出的路径
         *
         * @type {String}
         */
        this.outputPath = '';

        /**
         * 单元测试的覆盖率输出的路径，在 this.outputPath 之内
         *
         * @type {String}
         */
        this.coverageOutputPath = '';

        /**
         * 执行测试的命令，当其为函数时，会传入参数 testRecorder
         *
         * @type {String|Function}
         */
        this.testCmd = opts.testCmd || function (testRecord) {
            return 'npm test';
        };

        /**
         * 执行获取测试覆盖率的命令
         * @type {String|Function} 接受两个参数：testRecord, testCmdToExecute
         */
        this.coverageCmd = opts.coverageCmd || function (testRecord, testCmdToExecute) {
            return 'npm run coverage';
        };

        /**
         * 在运行测试之前执行的钩子函数
         *
         * @type {Function} 接受两个参数：testRecord, util
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
        this.runTestPath = util.getAbsolutePath(testRecord.dwtPath, this.runTestPath);

        this.outputPath = path.join(testRecord.outputPath, 'unit_test_report');
        this.coverageOutputPath = path.join(this.outputPath, 'coverage');

        // TODO 需要移除
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

        // 在运行测试之前执行的钩子函数
        if (typeof this.onBeforeTest === 'function') {
            await Promise.resolve(this.onBeforeTest.call(this, testRecord, util));
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

        await util.runByExec(command, { cwd: this.runTestPath }, this.testCompleteCheck.bind(this));

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

        await util.runByExec(command, { cwd: this.runTestPath });

        // 检查文件已经存在才算结束
        // 2020.3.13 发现命令执行完成时，coverage 文件夹可能还没有来的及生成
        if (typeof this.coverageCompleteCheck === 'function') {
            await Promise.resolve(this.coverageCompleteCheck.call(this, testRecord));
        }
    }
}

module.exports = PluginUnitTest;