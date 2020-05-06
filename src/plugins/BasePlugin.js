class BasePlugin {
    constructor(name, opts) {
        // 插件名字
        this.name = name;

        // 是否已经完成了初始化
        this.isInited = false;

        /**
         * 是否应该跳过不执行
         * @type {Boolean|Function}
         */
        this.shouldSkip = opts.shouldSkip || function (testRecord) {
            return false;
        };
    }

    /**
     * 初始化
     */
    async init(testRecord) {
        this.isInited = true;
    }


    /**
     * 执行之前
     */
    async beforeRun(testRecord) {

    }

    /**
     * 执行
     */
    async run(testRecord) {

    }

    /**
     * 执行之后
     */
    async afterRun(testRecord) {

    }

    /**
     * 执行之前
     */
    shouldRun(testRecord) {
        const result = (typeof this.shouldSkip === 'function') ? this.shouldSkip(testRecord) : !!this.shouldSkip;

        return !result;
    }
}

module.exports = BasePlugin;