const path = require('path');
const fse = require('fs-extra');
const { exec } = require('child_process');

const util = require('../util');

const businessProcessHandler = require('../business/process-handler');
const businessLocalCache = require('../business/local-cache');

const BasePlugin = require('./BasePlugin');

class PluginWhistle extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginWhistle', opts);

        /**
         * 项目启动时需要占用的端口号，取值为 >= 0 and < 65536
         *
         * @type {Number}
         */
        this.port = opts.port || 0;

        /**
         * 是否应该重复使用已存在的 whistle 进程，
         * 如果已经有启动的 whistle，则复用之
         * 如果没有启动的 whistle，则启动之后不清理
         *
         * @type {Boolean}
         */
        this.shouldReuse = !!opts.shouldReuse;

        /**
         * 获得 whistle 规则，返回值的格式为 {name: String, rules: String}
         *
         * @type {Function}
         */
        this.getWhistleRules = (typeof opts.getWhistleRules === 'function' ? opts.getWhistleRules : function (testRecord) {
            return {
                rules: `# 也许你需要配置下代理 \n ${JSON.stringify(testRecord, null, 2)}`
            };
        });

        /**
         * whistle 配置文件路径，自动生成，一般情况下无需修改，
         * whistle 启动时会加载这个文件的配置
         *
         * @type {String}
         */
        this.configFileName = 'test.whistle.js';

        /**
         * 直接使用当前已经启动的 whistle，不需要清理和重启 whistle
         *
         * @type {Boolean}
         * @private
         */
        this._useCurrentStartedWhistle = false;

        this._forceOverride = true;
    }

    /**
     * 初始化
     * @override
     */
    async init(testRecord) {
        await super.init(testRecord);

        // whistle 配置文件路径，自动生成，一般情况下无需修改
        this.configFile = path.join(testRecord.outputPath, this.configFileName);

        // 如果是复用的情况下，查一下现在是不是有 whistle 启动了
        if (this.shouldReuse) {
            try {
                const startedWhistlePort = await checkIfWhistleStarted();
                console.log('[exist whistle]', startedWhistlePort);

                // 如果已经启动的 whistle 端口就是传入的指定端口，则不需要清理端口和重启 whistle
                if (startedWhistlePort && (startedWhistlePort === this.port)) {
                    this._useCurrentStartedWhistle = true;
                    this.port = startedWhistlePort;
                }
            } catch (e) {

            }
        }

        // 进程中追加一些唯一标识
        this._processKey = `whistle-e2etest-${testRecord.seqId}`;
    }

    /**
     * 执行之前
     * @override
     */
    async beforeRun(testRecord) {
        await super.beforeRun(testRecord);

        if (!this._useCurrentStartedWhistle) {
            await this.clean(testRecord);
        }
    }

    /**
     * 执行
     * @override
     */
    async run(testRecord) {
        await super.run(testRecord);

        console.log('\n');
        console.log('ready to start whistle ...');

        // 获取 whistle 的端口号
        await this.findPort(testRecord);

        // 生成 .whistle.js 配置文件
        await this.generateConfigFile(testRecord);

        // 启动 whislte
        await this.start(testRecord);

        // 设置并强制使用指定 whistle 配置规则
        await this.use(testRecord);

        console.log('start whistle finished!');
        console.log('\n');
    }

    /**
     * 执行之后
     * @override
     */
    async afterRun(testRecord) {
        await super.afterRun(testRecord);

        // 如果是不复用 whistle 的场景，用完则需要清理
        if (!this.shouldReuse) {
            await this.clean(testRecord);
        }
    }

    /**
     * 生成 .whistle.js 配置文件
     *
     * @param testRecord
     */
    async generateConfigFile(testRecord) {
        const whistleRules = this.getWhistleRules(testRecord);

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
        fse.outputFileSync(this.configFile, configFileContent);

        console.log(`成功生成 whistle 规则配置文件: ${this.configFile}, 文件内容为：\n ${configFileContent}`);
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

        // 清理 whistle 的端口
        if (this.port) {
            await util.killPort(this.port)
                .catch((err) => {
                    console.log(`util.killPort failed`, this.port, err);
                });

            console.log(`already clean whistle port=${this.port}!`);
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
            console.log(`whistle already use port=${this.port}!`);
            return Promise.resolve();
        }

        // 获得本地缓存的已经被占用的端口
        const usedPort = businessLocalCache.getUsedPort();

        // 获得可用的端口
        this.port = await util.findAvailablePort(9528, usedPort);

        // 缓存在本地
        businessLocalCache.saveUsedPort('whistle', this.port, testRecord);

        console.log(`get whistle port: ${this.port}`);
    }

    /**
     * 启动 whislte
     *
     * @param testRecord
     */
    async start(testRecord) {
        if (this._useCurrentStartedWhistle) {
            console.log('this._useCurrentStartedWhistle is true!', this.port);
            return;
        }

        // w2 start -S whistle-e2etest -p $w_port
        const cmd = await util.runBySpawn('w2', ['start', '-S', this._processKey, '-p', this.port]);

        // 缓存在本地
        businessLocalCache.saveUsedPid('whistle', cmd.pid, testRecord);

        // 自检一下 whistle 是否真正启动了
        const checkURL = `http://127.0.0.1:${this.port}/cgi-bin/get-data`;

        await util.checkAndWaitURLAvailable(checkURL)
            .then((data) => {
                // 保存最后使用的 whistle 端口，以便单独 runTest 场景用
                businessLocalCache.saveLastUsedPort('Whistle', this.port);

                return data;
            })
            .catch((err) => {
                return Promise.reject(`检测 whistle 未成功启动, checkURL=${checkURL}`);
            });
    }

    /**
     * 设置并强制使用指定 whistle 配置规则
     *
     * @param testRecord
     */
    async use(testRecord) {
        // w2 use xx/.whistle.js -S whistle-e2etest --force
        let cmd = `w2 use ${this.configFile}`;

        if (!this._useCurrentStartedWhistle) {
            cmd = `${cmd} -S ${this._processKey}`;
        }

        if (this._forceOverride) {
            cmd = `${cmd} --force`;
        }

        await util.runByExec(cmd);
    }

    async getLastUsedWhistlePort() {
        const port = businessLocalCache.getLastUsedPort('Whistle');
        if (!port) {
            return;
        }

        console.log(`本地缓存中记录了最后一次启动 whistle 端口为 ${port} !`);

        // 自检一下 whistle 是否真正启动了，也许已经被杀掉了
        const checkURL = `http://127.0.0.1:${port}/cgi-bin/get-data`;

        // 此种情况只需要检查一次即可
        return await util.checkAndWaitURLAvailable(checkURL, { retryLimit: 1 })
            .then((data) => {
                console.log(`${checkURL} 通过检查，whistle 端口为 ${port} 有效!`);

                return port;
            })
            .catch((err) => {
                console.log(`${checkURL} 未通过检查，whistle 端口为 ${port} 无效!`);

                // 既然端口已经不存在了，则清理
                businessLocalCache.saveLastUsedPort('Whistle', 0);

                return Promise.resolve();
            });
    }
}

function checkIfWhistleStarted() {
    return new Promise((resolve, reject) => {
        exec('w2 status', function (error, stdout, stderr) {
            if (error) {
                return reject(error);
            }

            const matchResult = stdout.match(/127\.0\.0\.1:([0-9]+)\//i);
            if (matchResult && matchResult[1]) {
                resolve(matchResult[1]);
            } else {
                reject(stdout);
            }
        });
    });
}

module.exports = PluginWhistle;