const fs = require('fs');
const fse = require('fs-extra');
const yaml = require('js-yaml');

/**
 * 获取 yaml 文件中的配置
 *
 * https://github.com/nodeca/js-yaml#api
 *
 * @param {String} filePath yaml 文件的绝对路径
 * @return {Object || null}
 */
function getCache(filePath) {
    let config;

    try {
        config = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.log(`parseYaml ${filePath} catch`, e);
        config = null;
    }

    return config;
}

/**
 * 保存内容到 yaml 文件中
 *
 * @param {Object} obj 要保持的对象
 * @param {String} filePath yaml 文件的绝对路径
 * @return {undefined}
 */
function saveCache(obj, filePath) {
    let doc;

    try {
        doc = yaml.safeDump(obj, {
            'styles': {
                '!!null': 'canonical' // dump null as ~
            },
            'sortKeys': true        // sort object keys
        });
    } catch (e) {
        console.log(e);
    }

    return fse.outputFileSync(filePath, doc, 'utf-8');
}

exports.getCache = getCache;
exports.saveCache = saveCache;
