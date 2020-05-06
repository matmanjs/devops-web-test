const BasePlugin = require('./BasePlugin');

const businessLocalCache = require('../business/local-cache');

class PluginLocalCache extends BasePlugin {
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

        await this.clean(testRecord);
    }

    /**
     * 执行
     * @override
     */
    async run(testRecord) {
        await super.run(testRecord);
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
     * 执行
     * @override
     */
    async clean(testRecord) {
        // 清理本地缓存的记录，记录了过去占用的端口等信息
        await businessLocalCache.clean(testRecord);
    }
}

module.exports = PluginLocalCache;