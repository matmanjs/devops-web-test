const testController = require('./test-controller');
const runCmd = require('./util/run-cmd');

const BasePlugin = require('./plugins/BasePlugin');
const PluginProject = require('./plugins/Project');
const PluginMockstar = require('./plugins/Mockstar');
const PluginWhistle = require('./plugins/Whistle');
const PluginUnitTest = require('./plugins/UnitTest');
const PluginE2ETest = require('./plugins/E2ETest');
const PluginArchive = require('./plugins/Archive');
const PluginCustom = require('./plugins/Custom');

module.exports = {
    start: testController.start,
    runCmd,
    PluginProject,
    PluginMockstar,
    PluginWhistle,
    PluginUnitTest,
    PluginE2ETest,
    PluginArchive,
    PluginCustom,
    BasePlugin
};