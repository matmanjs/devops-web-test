const path = require('path');
const _ = require('lodash');
const util = require('./util');

class TestRecord {
    constructor(basePath, config = {}, nodejsAtomSdk) {
        // devops-app 目录的根路径，自动化测试项目根目录
        this.basePath = util.getAbsolutePath(basePath);

        // 产物输出目录
        this.outputPath = util.getAbsolutePath(this.basePath, config.outputPath || 'output');

        // 工作区的路径，相当于这个 git 仓库的根目录，在蓝盾中拉到的项目根目录
        this.workspacePath = util.getAbsolutePath(this.basePath, config.workspacePath || '../../');

        // 是否为开发者模式
        this.isDev = !!config.isDev;

        // 是否需要运行端对端测试
        this.shouldRunE2ETest = (typeof config.shouldRunE2ETest === 'boolean') ? config.shouldRunE2ETest : true;

        // 是否需要运行单元测试
        this.shouldRunUnitTest = (typeof config.shouldRunUnitTest === 'boolean') ? config.shouldRunUnitTest : true;

        // 判断是否在蓝盾平台运行
        this.isRunInDevopsApp = !!config.isRunInDevopsApp;
        this.nodejsAtomSdk = nodejsAtomSdk;

        // 获取蓝盾中环境变量的数据，注意这个值只是当时的情况，
        // 后续的其他插件还会改变它的，
        // 因此如果要保证最新的，则需要用方法调用
        this.curDevopsAppInputParams = this.nodejsAtomSdk && this.nodejsAtomSdk.getInputParams && this.nodejsAtomSdk.getInputParams() || {};

        // 蓝盾平台的流水线地址地址
        this.devopsAppPipelineHomeUrl = this.curDevopsAppInputParams.devops_app_pipeline_home_url || '';

        // 自定义 dwt 配置包
        this.dwtCustomPackageInfo = {
            name: this.curDevopsAppInputParams['dwt_custom_package_info.name'] || '',
            version: this.curDevopsAppInputParams['dwt_custom_package_info.version'] || ''
        };

        // 自动生成的唯一ID，用于区别不同批次的流程，
        // 尤其是有多个流程在同一个测试机中运行的时候，如果不做区分，则可能会有相互影响
        // 注意不要出现等号，否则whistle里面会有问题
        this.seqId = this.isDev ? 'dev' : util.getBase64(this.basePath, 6).replace(/=/gi, 'd') + Date.now();

        // 插件
        this.plugin = {};

        // 用在蓝盾系统中的自定义环境变量，可用于在蓝盾站点中配置使用
        this.testCustomParams = {
            // 输出文件的绝对路径
            outputPath: this.outputPath,

            // output 相对路径，例如 DevOps/devops-app/output
            outputRelativePath: path.relative(this.workspacePath, this.outputPath),

            // devops-app 相对路径，例如 DevOps/devops-app
            devopsAppRelativePath: path.relative(this.workspacePath, this.basePath)
        };

        this._startTime = Date.now();
    }

    /**
     * 通过插件名字获得插件
     * @param {String} name
     * @return {*}
     */
    getPlugin(name) {
        return this.plugin[name];
    }

    /**
     * 追加信息到蓝盾的变量中，以便后续流程中使用
     * @param {Object} obj
     */
    addTestCustomParams(obj) {
        this.testCustomParams = _.merge({}, this.testCustomParams, obj);
    }

    /**
     * 获取耗时，单位为 ms
     * @return {Number}
     */
    getTotalCost() {
        return Date.now() - this._startTime;
    }
}

module.exports = TestRecord;