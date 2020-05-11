const BasePlugin = require('./BasePlugin');

const businessProcessHandler = require('../business/process-handler');

class PluginExit extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginExit', opts);

        /**
         * 延迟调用函数名字
         *
         * @type {String}
         */
        this.delayCallName = '';
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

        if (this.delayCallName) {
            testRecord[this.delayCallName] = async (delay) => {
                return await this.exitNow(testRecord, delay);
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