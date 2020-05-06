<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>web自动化测试结果报告</title>
</head>
<body>
<h1>web自动化测试结果报告</h1>
web自动化测试结果报告，生成时间：<code><%=new Date()%></code> ，累计耗时： <%= totalCost %>。</p>

<h2>1. 基本信息</h2>

<ul>
    <li>触发人：<%=testRecord.curDevopsAppInputParams['pipeline.start.user.name']%></li>
    <li>触发方式: <%=testRecord.curDevopsAppInputParams['pipeline.start.type']%></li>
    <li>触发分支: <%=testRecord.curDevopsAppInputParams['BK_CI_REPO_GIT_WEBHOOK_BRANCH']%></li>
</ul>

<h2>2. web自动化测试结果</h2>

<h3>2.1 单元测试</h3>
<%=unitTest.msg%>

<% if(unitTest.shouldTest){ %>
<p><a href="<%=unitTest.outputUrl%>" target="_blank">单元测试详细报告</a></p>
<% } %>

<% if(unitTestCoverage.shouldRun){ %>
<p><a href="<%=unitTestCoverage.outputUrl%>" target="_blank">单元测试覆盖率报告</a></p>
<%- unitTestCoverage.resultMsg %>
<% } %>


<h3>2.2 端对端测试</h3>

<%=e2eTest.msg%>

<% if(e2eTest.shouldTest){ %>
<p><a href="<%=e2eTest.outputUrl%>" target="_blank">端对端测试详细报告</a></p>
<% } %>

<% if(e2eTestCoverage.shouldRun){ %>
<p><a href="<%=e2eTestCoverage.outputUrl%>" target="_blank">端对端测试覆盖率报告</a></p>
<%- e2eTestCoverage.resultMsg %>
<% } %>

<h3>2.3 其他</h3>

<ul>
<% for(var i=0; i < list2.length; i++){ %>
<% if(list2[i].url){ %>
    <li><a href="<%=list2[i].url%>" target="_blank"><%=list2[i].msg%></a></li>
<% }else{ %>
   <li><%=list2[i].msg%></li>
<% } %>
<% } %>
</ul>

<h2>3. 额外说明</h2>

<p>本报告涉及的web自动化测试方案，详见 <a href="https://matmanjs.github.io/matman/" target="_blank">https://matmanjs.github.io/matman/</a> ，有任何讨论欢迎 <a href="https://github.com/matmanjs/devops-web-test/issues" target="_blank">提issue</a> 。</p>
<p><a href="https://npmjs.com/package/<%=pkg.name%>" target="_blank"><%=pkg.name%></a> v<%=pkg.version%> <p/>

</body>
</html>