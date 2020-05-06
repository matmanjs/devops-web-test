# devops-web-test

web自动化测试流水线工具。

## 推荐的目录结构

组件是按照如下目录结构来设置默认值的，也是我们推荐的目录结构。

- project_path
  - DevOps
    - devops-app （用于蓝盾系统中的 web 自动化测试脚本）
    - matman-app （端对端测试）
    - mockstar-app （数据打桩）
    - README.md
  - src (项目源码)
  - test (单元测试)
  - package.json


## 接口文档

- start
- runCmd
- PluginProject
- PluginMockstar
- PluginWhistle
- PluginUnitTest
- PluginE2ETest
- PluginArchive
- PluginCustom
- BasePlugin