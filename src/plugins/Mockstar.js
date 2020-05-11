const util = require('../util');
const businessProcessHandler = require('../business/process-handler');
const businessLocalCache = require('../business/local-cache');

const BasePlugin = require('./BasePlugin');

class PluginMockstar extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginMockstar', opts);

        /**
         * mockstar 项目的根路径，由于我们推荐 DWT 路径为 DevOps/devops-app ，因此相对而言项目路径为 ../mockstar-app
         *
         * @type {String}
         */
        this.rootPath = opts.rootPath || '../mockstar-app';

        /**
         * 项目启动时需要占用的端口号，取值为 >= 0 and < 65536
         *
         * @type {Number}
         */
        this.port = opts.port || 0;

        /**
         * 安装依赖时执行的命令，当其为函数时，会传入参数 testRecorder
         *
         * @type {String|Function}
         */
        this.installCmd = opts.installCmd || function (testRecord) {
            return `npm install`;
        };

        /**
         * 启动项目时执行的命令，当其为函数时，会传入参数 testRecorder 和 port
         *
         * @type {String|Function}
         */
        this.startCmd = opts.startCmd || function (testRecord, port) {
            return `mockstar run -p ${port}`;
        };
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
        this._processKey = `mockstar-e2etest-${testRecord.seqId}`;
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
        console.log('ready to start mockstar ...');

        // 进入项目中安装依赖
        await this.install(testRecord);

        // 获取 mockstar 的端口号
        await this.findPort(testRecord);

        // 启动 mockstar
        await this.start(testRecord);

        console.log('start mockstar finished!');
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
     * 清理
     *
     * @param testRecord
     */
    async clean(testRecord) {
        await businessProcessHandler.kill(this._processKey)
            .catch((err) => {
                console.log(`businessProcessHandler.kill failed`, this._processKey, err);
            });

        // 清理 mockstar 的端口
        if (this.port) {
            await util.killPort(this.port)
                .catch((err) => {
                    console.log(`util.kill killPort`, this.port, err);
                });

            console.log(`already clean mockstar port=${this.port}!`);
        }
    }

    /**
     * 获得可用的端口号
     *
     * @param testRecord
     */
    async findPort(testRecord) {
        // 如果传递了固定端口，则返回
        if (this.port) {
            console.log(`mockstar already use port=${this.port}!`);
            return Promise.resolve();
        }

        // 获得本地缓存的已经被占用的端口
        const usedPort = businessLocalCache.getUsedPort();

        // 获得可用的端口
        this.port = await util.findAvailablePort(9528, usedPort);

        // 缓存在本地
        businessLocalCache.saveUsedPort('mockstar', this.port, testRecord);

        console.log(`get mockstar port: ${this.port}`);
    }

    /**
     * 进入项目中安装依赖
     *
     * @param testRecord
     */
    async install(testRecord) {
        if (testRecord.isDev) {
            return Promise.resolve();
        }

        if (typeof this.installCmd === 'function') {
            this.installCmd = this.installCmd.bind(this);
        }

        const cmd = util.getFromStrOrFunc(this.installCmd, testRecord);

        const command = `${cmd} --${this._processKey}`;

        await util.runByExec(command, { cwd: this.rootPath });
    }

    /**
     * 启动 mockstar
     *
     * @param testRecord
     */
    async start(testRecord) {
        if (typeof this.startCmd === 'function') {
            this.startCmd = this.startCmd.bind(this);
        }

        const cmd = util.getFromStrOrFunc(this.startCmd, testRecord, this.port);

        const command = `${cmd} --${this._processKey}`;

        const cmdRun = await util.runByExec(command, { cwd: this.rootPath }, (data) => {
            return data && data.indexOf(`127.0.0.1:${this.port}`) > -1;
        });

        // 缓存在本地
        businessLocalCache.saveUsedPid('mockstar', cmdRun.pid, testRecord);

        // TODO 自检一下 mockstar 是否真正启动了，参考检查 whistle 的方式来实现
    }
}

module.exports = PluginMockstar;