const PluginLocalCache = require('./plugins/LocalCache');
const PluginExit = require('./plugins/Exit');
const TestRecord = require('./TestRecord');

const pkg = require('../package');

async function start(dwtPath, config, nodejsAtomSdk) {
    let testRecord;
    let pluginArr = [];

    try {
        const t = Date.now();

        console.log('\n');
        console.log(`开始执行web自动化测试主流程！基于 ${pkg.name} v${pkg.version}`);

        testRecord = new TestRecord(dwtPath, config, nodejsAtomSdk);

        // 分析 plugins 之间的依赖关系，进行排序，然后执行
        pluginArr = config.plugins || [];

        // 在最开始自动增加 LocalCache
        pluginArr.unshift(new PluginLocalCache('PluginLocalCache'));

        if (!config.doNotExit) {
            // 在最末尾自动增加 Exit
            pluginArr.push(new PluginExit('PluginExit'));
        }

        // 将插件都先初始化，因为后续的逻辑中，有可能插件之间有依赖的
        for (let i = 0; i < pluginArr.length; i++) {
            const plugin = pluginArr[i];

            console.log('\n');
            console.log(`ready to init ${plugin.name} ...`);

            // 初始化
            await plugin.init(testRecord);

            console.log(`${plugin.name} init success!`, plugin);

            // 挂载到 testRecord.plugin 上，以便其他插件可用得到
            testRecord.plugin[plugin.name] = plugin;
        }

        // 运行前需要做的处理，一般用于清理
        for (let i = 0; i < pluginArr.length; i++) {
            const plugin = pluginArr[i];
            await plugin.beforeRun(testRecord);
        }

        // 依次执行，后续可以扩展指定顺序
        for (let i = 0; i < pluginArr.length; i++) {
            const plugin = pluginArr[i];

            const checkIfShouldRun = plugin.shouldRun(testRecord);

            if (checkIfShouldRun) {
                await plugin.run(testRecord);
            } else {
                console.log(`跳过执行插件： ${plugin.name}`);
            }
        }

        // 运行后需要做的处理，一般用于清理
        // 开发模式下最后不要清理，因为如果有问题的话可以在现有环境中直接调试
        if (!testRecord.isDev) {
            for (let i = 0; i < pluginArr.length; i++) {
                const plugin = pluginArr[i];
                await plugin.afterRun(testRecord);
            }
        }

        console.log(`web自动化测试主流程执行已完成，耗时 ${(Date.now() - t) / 1000} 秒！`);

        return testRecord;
    } catch (e) {
        console.error('[error] 自动化测试主流程出现了异常，未能正常执行完成！', e, testRecord);

        // 如果出错了，则尝试清理下，避免占用端口等资源
        if (pluginArr) {
            for (let i = 0; i < pluginArr.length; i++) {
                const plugin = pluginArr[i];
                await plugin.afterRun(testRecord);
            }
        }

        // 抛出异常
        throw new Error(`自动化测试主流程出现了异常，未能正常执行完成，原因为：${e && e.message || e}`);
    }
}

module.exports = {
    start
};