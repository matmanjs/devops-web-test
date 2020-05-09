# devops-web-test

定制流水线式执行web自动化测试的工具。

## 推荐的目录结构

不同插件的默认值是按照如下目录结构来设置默认值的，也是我们推荐的目录结构。

- project_path
  - DevOps
    - devops-app （用于DevOps执行自动化测试和输出测试产物）
    - matman-app （端对端测试）
    - mockstar-app （数据打桩）
    - README.md
  - src (项目源码)
  - test (测试用例)
  - package.json


## 接口文档

### start(dwtPath, config, nodejsAtomSdk)

启动自动化测试。

- `dwtPath`，`String`，`DWT`（DevOps for Web Test） 目录，流水线式执行web自动化测试和输出测试产物的路径，，如果插件传入了相对路径，则是相对于该路径而言
- `config`，`Object`，配置参数
  - `config.workspacePath`，`String`，工作区间的路径，即项目的根目录，如果是 git 项目，则是 git 仓库的根目录
  - `config.outputPath`，`String`，测试产物输出目录，默认为 `path.join(dwtPath, 'output')`
  - `config.plugins`，`Array`，插件列表，启动测试之后，会依次执行插件的生命周期事件(`init` - > `beforeRun` - > `run` - > `afterRun`)

### BasePlugin

插件的基础类，所有的插件需要继承它。启动测试之后，会依次执行插件的生命周期事件(`init` - > `beforeRun` - > `run` - > `afterRun`)。

#### constructor(name, opts)

- `name`，`String`，插件的名字
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当其为函数时，会传入参数 `testRecorder`

#### async init(testRecord)

初始化插件

#### async beforeRun(testRecord)

运行自动化测试之前执行

#### async run(testRecord)

运行自动化测试

#### async afterRun(testRecord)

运行自动化测试之后执行

#### shouldRun(testRecord)

判断是否应该运行该插件

### PluginProject

工程项目插件，即我们原始的工程，自动化测试时，我们可能需要安装依赖和构建等操作。

#### constructor(name, opts)

- `name`，`String`，插件的名字，默认值为 `pluginProject`
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.rootPath`，`String`，项目根路径，默认值：由于我们推荐 `DWT` 路径为 `DevOps/devops-app` ，因此默认值为 `path.join(dwtPath, '../../')`
  - `opts.usePort`，`Boolean`，是否需要端口，有些开发场景时，启动项目会使用一个端口，例如 webpack 构建项目时使用热更新模式下，就需要一个端口，默认值：`false` 
  - `opts.port`，`Number`，端口号，如果设置了 `opts.usePort` 为 `true`，若没有传入，则会自动找到未被占用的端口
  - `opts.installCmd`，`String|Function`，安装依赖时执行的命令，当其为函数时，会传入参数 `testRecorder`，默认值为 `function (testRecord) { return 'npm install'; }`
  - `opts.buildCmd`，`String|Function`，构建项目时执行的命令，当其为函数时，会传入参数 `testRecorder` 和 `port` ，默认值为 `function (testRecord, port) { return 'npm start'; }`
  - `opts.buildCompleteCheck`，`Function`，检查构建是否完成，会传入参数 `data` ，代表的时控制台输出，在某些场景下，可以通过判断某些输出，来判断构建已经结束，如果返回 `true`，则将强制结束构建，默认值为 `function (data) { return false; }`


#### async init(testRecord)

初始化插件，需要处理的事情包括：

- 将 `rootPath` 修改为绝对路径

#### async beforeRun(testRecord)

运行自动化测试之前执行，需要处理的事情包括：

```
await this.clean(testRecord);
```

#### async run(testRecord)

运行自动化测试，需要处理的事情包括：

```
// 进入项目中安装依赖
await this.install(testRecord);

// 获取 project 的端口号
await this.findPort(testRecord);

// 构建项目
await this.build(testRecord);
```

#### async afterRun(testRecord)

运行自动化测试之后执行，需要处理的事情包括：
           
```
await this.clean(testRecord);
```

#### async install(testRecord)

安装依赖，执行 `this.installCmd` 命令

#### async build(testRecord)

构建项目，执行 `this.buildCmd` 命令

#### async clean(testRecord)

清理，需要处理的事情包括：

- 清理端口号 `port`，避免该端口号被占用

#### async findPort(testRecord)

获得可用的端口号，并存储在 `this.port` 中


### PluginUnitTest

单元测试项目插件。

#### constructor(name, opts)

- `name`，`String`，插件的名字，默认值为 `pluginUnitTest`
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.runTestPath`，`String`，执行单元测试的根路径，默认值：由于我们推荐 `DWT` 路径为 `DevOps/devops-app` ，因此默认值为 `path.join(dwtPath, '../../')`
  - `opts.outputPath`，`String`，单元测试结果输出的路径，默认值：`path.join(testRecord.outputPath, 'unit_test_report')` 
  - `opts.coverageOutputPath`，`String`，单元测试的覆盖率输出的路径，推荐放在单元测试结果输出文件夹内，默认值：`path.join(this.outputPath, 'coverage')` 
  - `opts.testCmd`，`String|Function`，执行测试的命令，当其为函数时，会传入参数 `testRecorder`，默认值为 `function (testRecord) { return 'npm test'; }`
  - `opts.coverageCmd`，`String|Function`，执行测试的命令，当其为函数时，会传入参数 `testRecorder` 和 `testCmdToExecute`(实际执行的测试的命令)，默认值为 `function (testRecord, testCmdToExecute) { return 'npm run coverage'; }`
  - `opts.onBeforeTest`，`Function`，在运行测试之前执行的钩子函数，会传入参数 `testRecorder` 和 `util`
  - `opts.testCompleteCheck`，`Function`，检查测试过程是否完成，会传入参数 `data` ，代表的时控制台输出，在某些场景下，可以通过判断某些输出，来判断构建已经结束，如果返回 `true`，则将强制结束构建，默认值为 `function (data) { return false; }`
  - `opts.coverageCompleteCheck`，`Function`，检查覆盖率是否完成，会传入参数 `testRecorder` ，由于生成覆盖率文件是异步的，某些时候需要实际去检查所需要的覆盖率文件是否实际已经完成，此时可以用该方法


#### async init(testRecord)

初始化插件，需要处理的事情包括：

- 将 `runTestPath` 修改为绝对路径
- 将 `outputPath` 修改为绝对路径
- 将 `coverageOutputPath` 修改为绝对路径

#### async beforeRun(testRecord)

运行自动化测试之前执行，暂无。

#### async run(testRecord)

运行自动化测试，需要处理的事情包括：

```
// 在运行测试之前执行的钩子函数
if (typeof this.onBeforeTest === 'function') {
    await Promise.resolve(this.onBeforeTest.call(this, testRecord, util));
}

// 启动测试
await this.runTest(testRecord);

// 获取单元测试覆盖率
await this.runCoverage(testRecord);
```

#### async afterRun(testRecord)

运行自动化测试之后执行，暂无。

#### async runTest(testRecord)

启动测试，执行 `this.testCmd` 命令

#### async runCoverage(testRecord)

构建项目，执行 `this.coverageCmd` 命令


### PluginMockstar

mockstar 项目插件。

#### constructor(name, opts)

- `name`，`String`，插件的名字，默认值为 `pluginMockstar`
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.rootPath`，`String`，项目根路径，默认值：由于我们推荐 `DWT` 路径为 `DevOps/devops-app` ，因此默认值为 `path.join(dwtPath, '../mockstar-app')`
  - `opts.port`，`Number`， mockstar 启动端口
  - `opts.installCmd`，`String|Function`，安装依赖时执行的命令，当其为函数时，会传入参数 `testRecorder`，默认值为 `function (testRecord) { return 'npm install'; }`
  - `opts.startCmd`，`String|Function`，安装依赖时执行的命令，当其为函数时，会传入参数 `testRecorder` 和 `port`，默认值为 `function (testRecord, port) { return 'npm install'; }`


#### async init(testRecord)

初始化插件，需要处理的事情包括：

- 将 `rootPath` 修改为绝对路径
- 自动生成唯一标识 `this._processKey`

#### async beforeRun(testRecord)

运行自动化测试之前执行：

```
await this.clean(testRecord);
```

#### async run(testRecord)

运行自动化测试，需要处理的事情包括：

```
// 进入项目中安装依赖
await this.install(testRecord);

// 获取 mockstar 的端口号
await this.findPort(testRecord);

// 启动 mockstar
await this.start(testRecord);
```

#### async afterRun(testRecord)

运行自动化测试之后执行：

```
await this.clean(testRecord);
```

#### async clean(testRecord)

清理，需要处理的事情包括：

- 清理端口号 `port`，避免该端口号被占用

#### async findPort(testRecord)

获得可用的端口号，并存储在 `this.port` 中

#### async install(testRecord)

安装依赖，执行 `this.installCmd` 命令

#### async start(testRecord)

构建项目，执行 `this.startCmd` 命令



### PluginWhistle

mockstar 项目插件。

#### constructor(name, opts)

- `name`，`String`，插件的名字，默认值为 `pluginWhistle`
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.port`，`Number`， whistle 启动端口
  - `opts.getWhistleRules`，`Function`，获得 whistle 规则，需要返回格式为 `{name: String, rules: String}`
  - `opts.configFileName`，`String`，whistle 规则配置文件名，文件中包含了规则信息等，默认值为 `test.whistle.js`
  - `opts.configFile`，`String`，whistle 规则配置文件路径，默认值为 `path.join(testRecord.outputPath, this.configFileName)`


#### async init(testRecord)

初始化插件，需要处理的事情包括：

- 将 `configFile` 修改为绝对路径
- 自动生成唯一标识 `this._processKey`

#### async beforeRun(testRecord)

运行自动化测试之前执行：

```
await this.clean(testRecord);
```

#### async run(testRecord)

运行自动化测试，需要处理的事情包括：

```
// 获取 whistle 的端口号
await this.findPort(testRecord);

// 生成 .whistle.js 配置文件
await this.generateConfigFile(testRecord);

// 启动 whislte
await this.start(testRecord);

// 设置并强制使用指定 whistle 配置规则
await this.use(testRecord);
```

#### async afterRun(testRecord)

运行自动化测试之后执行：

```
await this.clean(testRecord);
```
#### async generateConfigFile(testRecord)

根据 `this.getWhistleRules` 获得的代理规则，生成一个本地的 whistle 配置文件。

#### async clean(testRecord)

清理，需要处理的事情包括：

- 清理端口号 `port`，避免该端口号被占用

#### async findPort(testRecord)

获得可用的端口号，并存储在 `this.port` 中

#### async start(testRecord)

启动 whistle，启动命令格式为 `w2 start -S ${this._processKey} -p ${this.port}`。


#### async use(testRecord)

使用指定的 whistle 规则配置文件，启动命令格式为 `w2 use ${this.configFile} -S ${this._processKey} --force`。


### PluginE2ETest

端对端测试项目插件。

#### constructor(name, opts)

- `name`，`String`，插件的名字，默认值为 `pluginE2ETest`
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.runTestPath`，`String`，执行端对端测试的根路径，默认值：由于我们推荐 `DWT` 路径为 `DevOps/devops-app` ，因此默认值为 `path.join(dwtPath, '../../')`
  - `opts.outputPath`，`String`，单元测试结果输出的路径，默认值：`path.join(testRecord.outputPath, 'e2e_test_report')` 
  - `opts.coverageOutputPath`，`String`，单元测试的覆盖率输出的路径，推荐放在单元测试结果输出文件夹内，默认值：`path.join(this.outputPath, 'coverage')` 
  - `opts.testCmd`，`String|Function`，执行测试的命令，当其为函数时，会传入参数 `testRecorder` 和 `whistlePort`，默认值为 `function (testRecord, whistlePort) { return 'npm test'; }`
  - `opts.onBeforeTest`，`Function`，在运行测试之前执行的钩子函数，会传入参数 `testRecorder` 和 `util`
  - `opts.testCompleteCheck`，`Function`，检查测试过程是否完成，会传入参数 `data` ，代表的时控制台输出，在某些场景下，可以通过判断某些输出，来判断构建已经结束，如果返回 `true`，则将强制结束构建，默认值为 `function (data) { return false; }`
  - `opts.getWhistlePort`，`Function`，获得 `whistle` 的端口号，默认值为 `function (testRecord) { return 0; }`
  - `opts.matmanAppPath`，`String`，matman 应用的根路径，默认值：由于我们推荐 `DWT` 路径为 `DevOps/devops-app` ，因此默认值为 `path.join(dwtPath, '../matman')`
  - `opts.matmanAppInstallCmd`，`String|Function`，matman 应用安装依赖时执行的命令，当其为函数时，会传入参数 `testRecorder`，默认值为 `function (testRecord) { return 'npm install'; }`
  - `opts.matmanAppBuildCmd`，`String|Function`，matman 应用构建项目时执行的命令，当其为函数时，会传入参数 `testRecorder` ，默认值为 `function (testRecord,) { return 'npm run build'; }`

#### async init(testRecord)

初始化插件，需要处理的事情包括：

- 将 `runTestPath` 修改为绝对路径
- 将 `matmanAppPath` 修改为绝对路径
- 将 `outputPath` 修改为绝对路径
- 将 `coverageOutputPath` 修改为绝对路径

#### async beforeRun(testRecord)

运行自动化测试之前执行，暂无。

#### async run(testRecord)

运行自动化测试，需要处理的事情包括：

```
// matman-app 安装依赖
await this.matmanAppInstall(testRecord);

// 测试之前需要 matman-app 构建
await this.matmanAppBuild(testRecord);

// 启用 xvfb
await this.startXvfb(testRecord);

// 在运行测试之前执行的钩子函数
if (typeof this.onBeforeTest === 'function') {
    await Promise.resolve(this.onBeforeTest.call(this, testRecord, runCmd));
}

// 启动测试
await this.runTest(testRecord);

// 停止 xvfb
await this.stopXvfb(testRecord);

// 处理测试覆盖率
await this.createE2ECoverage(testRecord);

// copy build to output
await this.copyBuildOutputToArchive(testRecord);
```

#### async afterRun(testRecord)

运行自动化测试之后执行，暂无。

#### async startXvfb(testRecord)

启动 xvfb，注意只有在 `process.env.USE_XVFB` 存在时才会处理

#### async stopXvfb(testRecord)

关闭 xvfb，注意只有在 `process.env.USE_XVFB` 存在时才会处理

#### async matmanAppInstall(testRecord)

启动 matman-app 的安装依赖，执行 `this.matmanAppInstallCmd` 命令

#### async matmanAppBuild(testRecord)

启动 matman-app 的构建，执行 `this.matmanAppBuildCmd` 命令

#### async runTest(testRecord)

启动测试，执行 `this.testCmd` 命令

#### async createE2ECoverage(testRecord)

分析并生成测试覆盖率数据

#### async copyBuildOutputToArchive(testRecord)

将端对端测试运行结果拷贝到归档目录中


### PluginArchive

归档项目插件。

#### constructor(name, opts)

- `name`，`String`，插件的名字，默认值为 `pluginArchive`
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.getPlugins`，`Function`，获取插件，接受 `testRecord` 参数, 返回 `{ pluginE2ETest: PluginE2ETest, pluginUnitTest: PluginUnitTest, pluginWhistle: PluginWhistle}`
  

其他的属性：

- `this.rootPath`，`String`，归档文件夹路径，值为 `testRecord.outputPath`
- `this.outputZipPath`，`String`，归档文件夹路径，值为 `path.join(this.rootPath, 'output.zip')`
- `this.indexHtmlPath`，`String`，归档文件夹路径，值为 `path.join(this.rootPath, 'index.html')`
- `this.indexHtmlDataPath`，`String`，归档文件夹路径，值为 `path.join(this.rootPath, 'index-html.json')`
- `this.testRecordPath`，`String`，归档文件夹路径，值为 `path.join(this.rootPath, 'test-record.json')`

#### async init(testRecord)

初始化插件，需要处理的事情包括：

- 将 `rootPath` 修改为绝对路径
- 将 `outputZipPath` 修改为绝对路径
- 将 `indexHtmlPath` 修改为绝对路径
- 将 `indexHtmlDataPath` 修改为绝对路径
- 将 `testRecordPath` 修改为绝对路径

#### async beforeRun(testRecord)

运行自动化测试之前执行：
           
```
await this.clean(testRecord);
```

#### async run(testRecord)

运行自动化测试，需要处理的事情包括：

```
// 保存自定义报告入口文件
this.saveOutputIndexHtml(testRecord, pluginMap);

// 保存 testRecord 内容
this.saveTestRecordContent(testRecord);

// 压缩下 output 目录
await this.compressDir(testRecord);
```

#### async afterRun(testRecord)

运行自动化测试之后执行：
           
```
await this.clean(testRecord);
```

#### async clean(testRecord)

清理，需要处理的事情包括：

- 删除上次缓存的文件内容，即清空 `this.rootPath` 目录


#### getE2ETestReport(testRecord, pluginE2ETest)

获得端对端测试报告

#### getUnitTestReport(testRecord, pluginUnitTest)

获得单元测试报告

#### saveOutputIndexHtml(testRecord, pluginMap) 

保存自定义报告入口文件


#### async saveTestRecordContent(testRecord)

保存 testRecord 内容

#### async compressDir(testRecord)

压缩保存测试输出文件



### PluginCustom

自定义插件。

#### constructor(name, opts)

- `name`，`String`，插件的名字，默认值为 `pluginCustom`
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.onInit`，`Function`，`init` 方法中的钩子函数，接受 `testRecord` 参数
  - `opts.onBeforeRun`，`Function`，`beforeRun` 方法中的钩子函数，接受 `testRecord` 参数
  - `opts.onRun`，`Function`，`run` 方法中的钩子函数，接受 `testRecord` 参数
  - `opts.onAfterRun`，`Function`，`afterRun` 方法中的钩子函数，接受 `testRecord` 参数

#### async init(testRecord)

初始化插件，调用 `this.onInit`

#### async beforeRun(testRecord)

运行自动化测试之前执行，调用 `this.onBeforeRun`

#### async run(testRecord)

运行自动化测试，调用 `this.onRun`

#### async afterRun(testRecord)

运行自动化测试之后执行，调用 `this.onAfterRun`