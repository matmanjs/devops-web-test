const runCmd = require('../util/run-cmd');
const util = require('../util');
const utilPort = require('../util/port');
const businessProcessHandler = require('../business/process-handler');
const businessLocalCache = require('../business/local-cache');

const BasePlugin = require('./BasePlugin');

class PluginProject extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginProject', opts);

        /**
         * 项目根路径。
         * 默认值： 由于我们推荐 DWT 路径为 DevOps/devops-app ，因此相对而言项目路径为 ../../
         * @type {String}
         */
        this.rootPath = opts.rootPath || '../../';

        /**
         * 是否需要一个端口，有些场景下本地启动会需要一个端口，例如 webpack 构建项目时使用热更新模式
         * @type {Boolean}
         */
        this.usePort = !!opts.usePort || false;

        /**
         * 项目启动时需要占用的端口号，取值为 >= 0 and < 65536
         * @type {Number}
         */
        this.port = opts.port || 0;

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
        this.buildCmd = opts.buildCmd || function (port, testRecord) {
            return `npm start`;
        };

        /**
         * 检查构建是否完成，传入 data 参数，代表的是控制台输出，在某些场景下，可以通过判断某些输出，来判断构建已经结束，如果返回 true，则将强制结束构建
         * @type {Function}
         */
        this.buildCompleteCheck = (typeof opts.buildCompleteCheck === 'function' ? opts.buildCompleteCheck : function (data) {
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
        this.rootPath = util.getAbsolutePath(testRecord.dwtPath, this.rootPath);

        // 进程中追加一些唯一标识
        this._processKey = `project-e2etest-${testRecord.seqId}`;
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

        console.log('\n');
        console.log('ready to start project build ...');

        // 进入项目中安装依赖，注意自动化测试需要依赖npm，因此此步骤不能省略
        await this.install(testRecord);

        // 获取 project 的端口号
        await this.findPort(testRecord);

        // 构建项目
        await this.build(testRecord);

        console.log('project build finished!');
        console.log('\n');
    }

    /**
     * 执行之后
     * @override
     */
    async afterRun(testRecord) {
        await super.afterRun(testRecord);

        await this.clean(testRecord);
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

        const command = `${cmd} --${this._processKey}`;

        await runCmd.runByExec(command, { cwd: this.rootPath });
    }

    /**
     * 构建项目
     *
     * @param testRecord
     */
    async build(testRecord) {
        const cmd = util.getFromStrOrFunc(this.buildCmd, this.port, testRecord);

        const command = `${cmd} --${this._processKey}`;

        await runCmd.runByExec(command, { cwd: this.rootPath }, this.buildCompleteCheck);
    }

    /**
     * 清理
     *
     * @param testRecord
     */
    async clean(testRecord) {
        if (!this.usePort) {
            console.log(`project not use port, no need to clean port!`);
            return Promise.resolve();
        }

        await businessProcessHandler.kill(this._processKey)
            .catch((err) => {
                console.log(`businessProcessHandler.kill failed`, this._processKey, err);
            });

        // 清理 whistle 的端口
        if (this.port) {
            await utilPort.kill(this.port)
                .catch((err) => {
                    console.log(`utilPort.kill failed`, this.port, err);
                });

            console.log(`already clean project port=${this.port}!`);
        }
    }

    /**
     * 获得可用的端口号
     *
     * @param testRecord
     */
    async findPort(testRecord) {
        // 如果不需要端口，则返回
        if (!this.usePort) {
            console.log(`project not use port!`);
            return Promise.resolve();
        }

        // 如果传递了固定端口，则返回
        if (this.port) {
            console.log(`project already use port=${this.port}!`);
            return Promise.resolve();
        }

        // 获得本地缓存的已经被占用的端口
        const usedPort = businessLocalCache.getUsedPort();

        // 获得可用的端口
        this.port = await utilPort.findAvailablePort(9528, usedPort);

        // 缓存在本地
        businessLocalCache.saveUsedPort('project', this.port, testRecord);

        console.log(`get project port: ${this.port}`);
    }
}

module.exports = PluginProject;