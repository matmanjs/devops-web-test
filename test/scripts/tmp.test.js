const chai = require('chai');
const expect = chai.expect;

describe('测试练习', function () {
    it('对比字符串', function () {
        expect('com.tencent.now').to.be.equal('com.tencent.now');
    });
});