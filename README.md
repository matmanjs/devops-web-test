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

项目插件。


### PluginProject

工程项目插件，即我们原始的工程，自动化测试时，我们可能需要安装依赖和构建等操作。

#### constructor(name, opts)

- `name`，`String`，插件的名字
- `opts`，`Object`，插件的配置，不同插件可能有不同的区别
  - `opts.shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数
  - `opts.rootPath`，`String`，项目根路径，默认值：由于我们推荐 `DWT` 路径为 `DevOps/devops-app` ，因此默认值为 `path.join(dwtPath, '../../')`
  - `opts.usePort`，`Boolean`，是否需要端口，有些开发场景时，启动项目会使用一个端口，例如 webpack 构建项目时使用热更新模式下，就需要一个端口，默认值：`false` 
  - `opts.port`，`Number`，端口号，如果设置了 `opts.usePort` 为 `true`，若没有传入，则会自动找到未被占用的端口
  - `opts.installCmd`，`String|Function`，安装依赖时执行的命令，当其为函数时，会传入参数 `testRecorder`，默认值为 `function (testRecord) { return 'npm install'; }`
  - `opts.buildCmd`，`String|Function`，构建项目时执行的命令，当其为函数时，会传入参数 `port` 和 `testRecorder`，默认值为 `function (port, testRecord) { return 'npm start'; }`
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



- PluginMockstar
- PluginWhistle
- PluginUnitTest
- PluginE2ETest
- PluginArchive
- PluginCustom
- BasePlugin