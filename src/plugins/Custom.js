const BasePlugin = require('./BasePlugin');

class PluginCustom extends BasePlugin {
    constructor(name, opts = {}) {
        super(name || 'pluginCustom', opts);

        this.onInit = opts.onInit;
        this.onBeforeRun = opts.onBeforeRun;
        this.onRun = opts.onRun;
        this.onAfterRun = opts.onAfterRun;
    }

    /**
     * 初始化
     * @override
     */
    async init(testRecord) {
        await super.init(testRecord);

        if (typeof this.onInit === 'function') {
            await this.onInit(testRecord);
        }
    }

    /**
     * 执行之前
     * @override
     */
    async beforeRun(testRecord) {
        await super.beforeRun(testRecord);

        if (typeof this.onBeforeRun === 'function') {
            await this.onBeforeRun(testRecord);
        }
    }

    /**
     * 执行
     * @override
     */
    async run(testRecord) {
        await super.run(testRecord);

        if (typeof this.onRun === 'function') {
            await this.onRun(testRecord);
        }
    }

    /**
     * 执行之后
     * @override
     */
    async afterRun(testRecord) {
        await super.afterRun(testRecord);

        if (typeof this.onAfterRun === 'function') {
            await this.onAfterRun(testRecord);
        }
    }
}

module.exports = PluginCustom;