const testController = require('../../../src/test-controller');
const PluginClean = require('../../../src/plugins/Clean');
const PluginProject = require('../../../src/plugins/Project');
const PluginMockstar = require('../../../src/plugins/Mockstar');
const PluginWhistle = require('../../../src/plugins/Whistle');
const PluginUnitTest = require('../../../src/plugins/UnitTest');
const PluginE2ETest = require('../../../src/plugins/E2ETest');
const PluginArchive = require('../../../src/plugins/Archive');

// const basePath = __dirname;
const basePath = '/Users/helinjiang/gitprojects/web-test-demo/DevOps/devops-app';

const shouldRunE2ETest = true;
const shouldRunUnitTest = false;

const config = {
    shouldRunE2ETest,
    shouldRunUnitTest,
    plugins: [
        new PluginClean('clean'),
        new PluginProject('project', {
            shouldSkip: !shouldRunE2ETest,
            rootPath: '/Users/helinjiang/gitprojects/web-test-demo',
            usePort: true,
            buildCmd: function (port, testRecord) {
                return port ? `npx cross-env PORT=${port} npm start` : 'npm start';
            },
            buildCompleteCheck: function (data) {
                return data && data.indexOf('Compiled successfully') > -1;
            }
        }),
        new PluginMockstar('mockstar', {
            shouldSkip: !shouldRunE2ETest,
            rootPath: '/Users/helinjiang/gitprojects/web-test-demo/DevOps/mockstar-app'
        }),
        new PluginWhistle('whistle', {
            shouldSkip: !shouldRunE2ETest,
            getWhistleRules: function (testRecord) {
                const whistleSetting = require('/Users/helinjiang/gitprojects/web-test-demo/DevOps/whistle');

                return whistleSetting.getDevRules({
                    projectDevPort: testRecord.getPlugin('project').port,
                    projectRootPath: testRecord.getPlugin('project').rootPath,
                    mockstarPort: testRecord.getPlugin('mockstar').port,
                    name: testRecord.getPlugin('whistle')._processKey
                });
            }
        }),
        new PluginUnitTest('unitTest', {
            shouldSkip: !shouldRunUnitTest,
            rootPath: '/Users/helinjiang/gitprojects/web-test-demo'
        }),
        new PluginE2ETest('e2eTest', {
            shouldSkip: !shouldRunE2ETest,
            enableTest: shouldRunE2ETest,
            rootPath: '/Users/helinjiang/gitprojects/web-test-demo/DevOps/matman-app',
            getWhistlePort: function (testRecord) {
                return testRecord.getPlugin('whistle').port || 0;
            }
        }),
        new PluginArchive('archive', {
            getPlugins: function (testRecord) {
                return {
                    pluginE2ETest: testRecord.getPlugin('e2eTest'),
                    pluginUnitTest: testRecord.getPlugin('unitTest'),
                    pluginWhistle: testRecord.getPlugin('whistle')
                };
            }
        })
    ]
};

testController.start(basePath, config)
    .then((data) => {
        console.log(data);
    })
    .catch((err) => {
        console.error(err);
    });

