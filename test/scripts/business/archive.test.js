const path = require('path');
const chai = require('chai');
const expect = chai.expect;

const businessArchive = require('../../../src/business/archive');

describe('business/archive.js getUnitTestReport()', function () {
    const archiveConfigRootPath = path.join(__dirname, '../../fixtures/business/archive');

    it('测试 unit_test_report_01 ok', function () {
        const testRecord = {
            shouldRunUnitTest: true,
            archiveConfig: {
                rootPath: archiveConfigRootPath
            },
            unitTestConfig: {
                outputFolder: 'unit_test_report_01'
            }
        };
        const result = businessArchive.getUnitTestReport(testRecord);
        // console.log(result);
        expect(result.testResult).to.be.eql({
            stats: {
                suites: 54,
                tests: 436,
                passes: 431,
                pending: 4,
                failures: 0,
                start: '2020-02-25T11:41:19.239Z',
                end: '2020-02-25T11:41:19.351Z',
                duration: 112,
                testsRegistered: 436,
                passPercent: 0.99770642201,
                pendingPercent: 0.9174311926605505,
                other: 0,
                hasOther: false,
                skipped: 1,
                hasSkipped: false
            },
            passPercent: '98.85',
            actualSuccessPercent: '100.00',
            duration: '0.112秒',
            summary:
                '单元测试通过率: 98.85%（431/436)，实际成功率: 100.00%（431/(431+0)，耗时 0.112秒，总用例数436个，成功431个，失败0个，主动跳过未执行4个，超时异常未执行1个'
        });
    });

    it('若不存在归档文件则提示无报告报告', function () {
        const testRecord = {
            shouldRunUnitTest: true,
            archiveConfig: {
                rootPath: archiveConfigRootPath
            },
            unitTestConfig: {
                outputFolder: 'unit_test_report_not_exist'
            }
        };
        const result = businessArchive.getUnitTestReport(testRecord);
        // console.log(result);
        expect(result.testResult).to.be.eql({
            summary: '单元测试失败，没有测试报告！'
        });
    });

    it('若跳过测试则提示已跳过', function () {
        const testRecord = {
            shouldRunUnitTest: false,
            archiveConfig: {
                rootPath: archiveConfigRootPath
            },
            unitTestConfig: {
                outputFolder: 'unit_test_report_01'
            }
        };
        const result = businessArchive.getUnitTestReport(testRecord);
        // console.log(result);
        expect(result.testResult).to.be.eql({
            summary: '已配置不执行单元测试！'
        });
    });
});

describe('business/archive.js getE2ETestReport()', function () {
    const archiveConfigRootPath = path.join(__dirname, '../../fixtures/business/archive');

    it('测试 e2e_test_report_01 ok', function () {
        const testRecord = {
            shouldRunE2ETest: true,
            archiveConfig: {
                rootPath: archiveConfigRootPath
            },
            e2eTestConfig: {
                outputFolder: 'e2e_test_report_01'
            }
        };
        const result = businessArchive.getE2ETestReport(testRecord);
        // console.log(result);
        expect(result.testResult).to.be.eql({
            stats: {
                suites: 78,
                tests: 148,
                passes: 144,
                pending: 1,
                failures: 3,
                start: '2020-02-25T11:31:19.232Z',
                end: '2020-02-25T11:41:17.057Z',
                duration: 597825,
                testsRegistered: 372,
                passPercent: 38.97849462365591,
                pendingPercent: 0,
                other: 16,
                hasOther: true,
                skipped: 224,
                hasSkipped: true
            },
            passPercent: '38.71',
            actualSuccessPercent: '97.96',
            duration: '9分57.825秒',
            summary: '端对端测试通过率: 38.71%（144/372)，实际成功率: 97.96%（144/(144+3)，耗时 9分57.825秒，总用例数372个，成功144个，失败3个，主动跳过未执行1个，超时异常未执行224个'
        });
    });

    it('若不存在归档文件则提示无报告报告', function () {
        const testRecord = {
            shouldRunE2ETest: true,
            archiveConfig: {
                rootPath: archiveConfigRootPath
            },
            e2eTestConfig: {
                outputFolder: 'e2e_test_report_not_exist'
            }
        };
        const result = businessArchive.getE2ETestReport(testRecord);
        // console.log(result);
        expect(result.testResult).to.be.eql({
            summary: '端对端测试失败，没有测试报告！'
        });
    });

    it('若跳过测试则提示已跳过', function () {
        const testRecord = {
            shouldRunE2ETest: false,
            archiveConfig: {
                rootPath: archiveConfigRootPath
            },
            e2eTestConfig: {
                outputFolder: 'e2e_test_report_01'
            }
        };
        const result = businessArchive.getE2ETestReport(testRecord);
        // console.log(result);
        expect(result.testResult).to.be.eql({
            summary: '已配置不执行端对端测试！'
        });
    });
});