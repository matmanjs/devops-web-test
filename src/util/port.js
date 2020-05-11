const net = require('net');
const runCmd = require('./run-cmd');

/**
 * 检查某个端口是否被占用
 * @param {Number} port 端口号，取值为 >= 0 and < 65536
 * @param {Function} [callback] 回调，接受两个参数，isSuccess 和 err
 */
function portIsOccupied(port, callback) {
    // 创建服务并监听该端口
    const server = net.createServer().listen(port);

    server.on('listening', function () {
        // 执行这块代码说明端口未被占用

        // 关闭服务
        server.close();

        // 控制台输出信息
        // console.log('The port【' + port + '】 is available.');

        if (typeof callback === 'function') {
            callback(true);
        }
    });

    server.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            // 端口已经被使用
            // console.log('The port【' + port + '】 is occupied, please change other port.');
        }

        if (typeof callback === 'function') {
            callback(false, err);
        }
    });
}

/**
 * 找到当前未被占用的端口号
 *
 * @param {Number} [port] 查找的起始端口号
 * @param {Array} [skipList
 *] 需要忽略的端口号
 * @return {Promise}
 */
function findAvailablePort(port = 9528, skipList = []) {
    return new Promise((resolve, reject) => {
        let targetPort = port;

        const check = () => {
            // 过滤掉目标端口
            while (skipList.indexOf(targetPort) > -1) {
                targetPort++;
            }

            portIsOccupied(targetPort, (isFound) => {
                if (isFound) {
                    resolve(targetPort);
                } else {
                    targetPort++;

                    if (targetPort > 65535) {
                        reject(new Error('can not find available port'));
                    } else {
                        check();
                    }
                }
            });
        };

        check();
    });
}

/**
 * 杀掉指定端口的进程
 *
 * @param port
 * @return {Promise}
 */
function killPort(port) {
    console.log('---kill---', port);

    // const command = `ps -ef | grep "node" | grep ${port} | grep -v grep | awk '{print $2}' | xargs kill -9`;
    const command = `lsof -i:${port} | grep ${port}  | grep -v grep | awk '{print $2}' | xargs kill -9`;

    return runCmd.runByExec(command)
        .then((data) => {
            console.log(`kill port=${port} success!`);
            return data;
        })
        .catch((err) => {
            console.log(`kill port=${port} fail!`, err);
            return Promise.reject(err);
        });
}

module.exports = {
    findAvailablePort,
    killPort,
    portIsOccupied
};
