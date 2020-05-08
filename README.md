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

### start(basePath, config, nodejsAtomSdk)

启动自动化测试。

- `basePath`，`String`，执行自动化测试和输出测试产物的路径，如果插件传入了相对路径，则是相对于该路径而言
- `config`，`Object`，配置参数
  - `config.workspacePath`，`String`，工作区间的路径，即项目的根目录，如果是 git 项目，则是 git 仓库的根目录
  - `config.outputPath`，`String`，测试产物输出目录，默认为 `path.join(basePath,'output')`
  - `config.plugins`，`Array`，插件列表，启动测试之后，会依次执行插件的生命周期事件(`init` - > `beforeRun` - > `run` - > `afterRun`)

### BasePlugin

#### constructor(name, opts)

- `name`，`String`，插件的名字
- `shouldSkip`，`Boolean|Function`，是否应该跳过执行，当为函数时，接受 `testRecord` 参数

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






- runCmd
- PluginProject
- PluginMockstar
- PluginWhistle
- PluginUnitTest
- PluginE2ETest
- PluginArchive
- PluginCustom
- BasePlugin