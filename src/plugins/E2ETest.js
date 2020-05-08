const path = require('path');
const Xvfb = require('xvfb');
const matman = require('matman');

const runCmd = require('../util/run-cmd');
const util = require('../util');

const fse = require('fs-extra');

const BasePlugin = require('./BasePlugin');

class PluginE2ETest extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginE2ETest', opts);

        /**
         * 是否启动测试
         * @type {boolean}
         */
        this.enableTest = (typeof opts.enableTest === 'boolean') ? opts.enableTest : true;

        /**
         * 端对端测试根路径，由于蓝盾测试项目为 DevOps/devops-app ，因此相对而言项目路径为 ../matman-app
         * @type {String}
         */
        this.rootPath = opts.rootPath || '../matman-app';

        /**
         * 端对端测试输出的路径
         * @type {String}
         */
        this.outputPath = '';

        /**
         * 对端测试的覆盖率输出的路径，在 this.outputPath 之内
         * @type {String}
         */
        this.coverageOutputPath = '';

        /**
         * 安装依赖时执行的命令，当其为函数时，会传入参数 testRecorder
         * @type {String|Function}
         */
        this.installCmd = opts.installCmd || function (testRecord) {
            return `npm install`;
        };

        /**
         * 构建项目时执行的命令，当其为函数时，会传入参数 port 和 testRecorder
         * @type {String|Function}
         */
        this.buildCmd = opts.buildCmd || function (testRecord) {
            return `npm run build`;
        };

        const self = this;

        /**
         * 执行测试的命令
         * @type {String|Function}
         */
        this.testCmd = opts.testCmd || function (testRecord) {
            const cmd = `mocha`;

            const whistlePort = self.getWhistlePort(testRecord);

            return whistlePort ? `npx cross-env WHISTLE_PORT=${whistlePort} ${cmd}` : `npx ${cmd}`;
        };

        /**
         * 获得 whistle 规则
         * @type {Function}
         */
        this.getWhistlePort = (typeof opts.getWhistlePort === 'function' ? opts.getWhistlePort : function (testRecord) {
            return 0;
        });

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
    }

    /**
     * 初始化
     * @override
     */
    async init(testRecord) {
        await super.init(testRecord);

        // 特殊处理下目录，将其修改为绝对路径
        this.rootPath = util.getAbsolutePath(testRecord.basePath, this.rootPath);

        this.outputPath = path.join(testRecord.outputPath, 'e2e_test_report');
        this.coverageOutputPath = path.join(this.outputPath, 'coverage');

        testRecord.addTestCustomParams({
            e2eTestRelativePathToOutput: path.relative(testRecord.outputPath, this.outputPath),
            e2eTestCoverageRelativePathToOutput: path.relative(testRecord.outputPath, this.coverageOutputPath)
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
        console.log('ready to runTest for e2e test ...');

        // 安装依赖
        await this.install(testRecord);

        // 测试之前需要构建
        await this.build(testRecord);

        // 启用 xvfb
        await this.startXvfb(testRecord);

        // 在运行测试之前执行的钩子函数
        if (typeof this.onBeforeTest === 'function') {
            await Promise.resolve(this.onBeforeTest.call(this, testRecord, runCmd));
        }

        // 启动测试
        await this.runTest(testRecord);

        // 停止 xvfb
        await this.stopXvfb(testRecord);

        // 处理测试覆盖率
        await this.createE2ECoverage(testRecord);

        // copy build to output
        await this.copyBuildOutputToArchive(testRecord);

        // 追加结果到蓝盾变量中
        testRecord.addTestCustomParams({
            shouldRunE2ETest: this.shouldRun(testRecord)
        });

        console.log('runTest for e2e test finished!');
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
     * 启用 xvfb
     * https://github.com/segmentio/nightmare/issues/224#issuecomment-141575361
     *
     * @param testRecord
     */
    async startXvfb(testRecord) {
        // 这里的变量是 docker 中定义的，因为 linux 中需要依赖特殊的命令才能够跑得起来
        if (!process.env.USE_XVFB) {
            return Promise.resolve();
        }

        console.log('检测到 process.env.USE_XVFB 存在，因此启用 xvfb!');

        // 注意这种写法程序没有响应，原因还未知
        // await runCmd.runByExec('Xvfb -ac -screen scrn 1280x2000x24 :9.0 & export DISPLAY=:9.0', { cwd: this.rootPath },function (data) {
        //     return true;
        // });

        // https://www.npmjs.com/package/xvfb
        // 2020.3.12 保持默认值就可以了，不需要额外配置 xvfb_args 参数，否则在蓝盾里面运行会报错如下错误：
        // nightmare electron child process exited with code 1: general error - you may need xvfb
        const xvfb = new Xvfb({
            // timeout: 2000,
            // xvfb_args: ['-ac', '-screen', 'scrn', '1280x2000x24']
        });

        const t = Date.now();
        xvfb.startSync();
        console.log(`xvfb start success! cost=${Date.now() - t}ms`);

        testRecord.xvfb = xvfb;
    }

    /**
     * 关闭 xvfb
     * https://github.com/segmentio/nightmare/issues/224#issuecomment-141575361
     *
     * @param testRecord
     */
    async stopXvfb(testRecord) {
        // 这里的变量是 docker 中定义的，因为 linux 中需要依赖特殊的命令才能够跑得起来
        if (!process.env.USE_XVFB) {
            return Promise.resolve();
        }

        if (!testRecord.xvfb || !testRecord.xvfb.stop) {
            return Promise.resolve();
        }

        const t = Date.now();
        testRecord.xvfb.stopSync();
        console.log(`xvfb stop success! cost=${Date.now() - t}ms`);
    }

    /**
     * 构建
     *
     * @param testRecord
     */
    async build(testRecord) {
        const cmd = util.getFromStrOrFunc(this.buildCmd, testRecord);

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

        let command = util.getFromStrOrFunc(this.testCmd, testRecord);

        // 2020.3.12 使用了 xvfb 组件之后，这里就无需再使用 xvfb-run 启动了
        // 这里的变量是 docker 中定义的，因为 linux 中需要依赖特殊的命令才能够跑得起来
        // if (process.env.USE_XVFB && (command.indexOf('xvfb-run') < 0)) {
        //     command = `xvfb-run -a ${command}`;
        // }

        await runCmd.runByExec(command, { cwd: this.rootPath }, this.testCompleteCheck.bind(this));

        this._cacheTestCmd = command;
    }

    /**
     * 启动测试
     *
     * @param testRecord
     */
    async createE2ECoverage(testRecord) {
        const globPattern = path.join(this.rootPath, 'build/coverage_output/**/*.json');
        const reporterDir = path.join(this.rootPath, 'build/coverage');

        console.log('准备生成端对端自动化测试报告！', globPattern, reporterDir);

        await matman.istanbulUtil.createE2ECoverage(globPattern, {
            dir: reporterDir
        })
            .then((data) => {
                console.log('生成端对端自动化测试报告成功！', data);
            })
            .catch((err) => {
                console.error('生成端对端自动化测试报告失败！', err && err.message || err);
            });
    }

    /**
     * 将端对端测试运行结果拷贝到归档目录中
     *
     * @param testRecord
     */
    async copyBuildOutputToArchive(testRecord) {
        try {
            const srcPath = path.join(this.rootPath, 'build');
            const distPath = path.join(testRecord.outputPath, 'e2e_test_build_output');
            const reporterDir = path.join(this.rootPath, 'build/coverage');

            if (fse.pathExistsSync(srcPath)) {
                // 将端对端测试运行结果拷贝到归档目录中
                fse.copySync(srcPath, distPath);
            }

            if (fse.pathExistsSync(reporterDir)) {
                // 把生成的覆盖率的结果单独拷贝处理
                fse.copySync(reporterDir, this.coverageOutputPath);
            }

            // 需要移除部分不需要的文件，避免最后归档文件过大
            fse.removeSync(path.join(distPath, 'coverage_output'));

            console.log('copyBuildOutputToArchive success!');
        } catch (err) {
            console.error(err);
        }
    }

}

module.exports = PluginE2ETest;