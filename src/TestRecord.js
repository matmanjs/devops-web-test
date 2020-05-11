const path = require('path');
const _ = require('lodash');
const util = require('./util');

class TestRecord {
    constructor(dwtPath, config = {}) {
        // devops-app 目录的根路径，自动化测试项目根目录
        this.dwtPath = util.getAbsolutePath(dwtPath);

        // 测试产物输出目录
        this.outputPath = util.getAbsolutePath(this.dwtPath, config.outputPath || 'output');

        // 工作区间的路径，即项目的根目录，如果是 git 项目，则是 git 仓库的根目录
        this.workspacePath = util.getAbsolutePath(this.dwtPath, config.workspacePath || '../../');

        // 是否为开发者模式
        this.isDev = !!config.isDev;

        // 自动生成的唯一ID，用于区别不同批次的流程，
        // 尤其是有多个流程在同一个测试机中运行的时候，如果不做区分，则可能会有相互影响
        // 注意不要出现等号，否则whistle里面会有问题
        this.seqId = this.isDev ? 'dev' : util.getBase64(this.dwtPath, 6).replace(/=/gi, 'd') + Date.now();

        // 插件
        this.plugin = {};

        // 用在蓝盾系统中的自定义环境变量，可用于在蓝盾站点中配置使用
        this.testCustomParams = {
            // 输出文件的绝对路径
            outputPath: this.outputPath,

            // output 相对路径，例如 DevOps/devops-app/output
            outputRelativePath: path.relative(this.workspacePath, this.outputPath),

            // devops-app 相对路径，例如 DevOps/devops-app
            devopsAppRelativePath: path.relative(this.workspacePath, this.dwtPath)
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