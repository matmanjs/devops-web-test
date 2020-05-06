const BasePlugin = require('./BasePlugin');

const businessProcessHandler = require('../business/process-handler');

class PluginExit extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginLocalCache', opts);
    }

    /**
     * 初始化
     * @override
     */
    async init(testRecord) {
        await super.init(testRecord);
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

        if (testRecord.isRunInDevopsApp) {
            // 注意，在蓝盾平台中，不要执行这个步骤，否则将导致无法设置蓝盾变量
            testRecord._callExit = (delay) => {
                return this.exitNow(testRecord, delay);
            };
        } else {
            await this.exitNow(testRecord);
        }

    }

    /**
     * 执行之后
     * @override
     */
    async afterRun(testRecord) {
        await super.afterRun(testRecord);
    }

    /**
     * 执行之后
     * @override
     */
    async exitNow(testRecord, delay) {
        console.log(`\nAlready cost ${testRecord.getTotalCost() / 1000}s . Next to exit ...`);

        await businessProcessHandler.exit(testRecord, delay);

        console.log(`\nExit complete!`);
    }

}

module.exports = PluginExit;