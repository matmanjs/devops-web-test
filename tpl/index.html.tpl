<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>web自动化测试结果报告</title>
</head>
<body>
<h1>web自动化测试结果报告</h1>
<p>web自动化测试结果报告，生成时间：<code><%=new Date()%></code> ，累计耗时： <%= totalCost %>。</p>

<h2>1. web自动化测试结果</h2>

<h3>1.1 单元测试</h3>
<%=unitTest.msg%>

<% if(unitTest.testOutputUrl){ %>
<p><a href="<%=unitTest.testOutputUrl%>" target="_blank">单元测试详细报告</a></p>
<% } %>

<% if(unitTest.coverageOutputUrl){ %>
<p><a href="<%=unitTest.coverageOutputUrl%>" target="_blank">单元测试覆盖率报告</a></p>
<%- unitTest.coverageMsg %>
<% } %>


<h3>1.2 端对端测试</h3>

<%=e2eTest.msg%>

<% if(e2eTest.testOutputUrl){ %>
<p><a href="<%=e2eTest.testOutputUrl%>" target="_blank">端对端测试详细报告</a></p>
<% } %>

<% if(e2eTest.coverageOutputUrl){ %>
<p><a href="<%=e2eTest.coverageOutputUrl%>" target="_blank">端对端测试覆盖率报告</a></p>
<%- e2eTest.coverageMsg %>
<% } %>

<h3>1.3 其他</h3>

<ul>
<% for(var i=0; i < moreLinks.length; i++){ %>
<% if(moreLinks[i].url){ %>
    <li><a href="<%=moreLinks[i].url%>" target="_blank"><%=moreLinks[i].msg%></a></li>
<% }else{ %>
   <li><%=moreLinks[i].msg%></li>
<% } %>
<% } %>
</ul>

<h2>2. 额外说明</h2>

<p>本报告涉及的web自动化测试方案，详见 <a href="https://matmanjs.github.io/matman/" target="_blank">https://matmanjs.github.io/matman/</a> ，有任何讨论欢迎 <a href="https://github.com/matmanjs/devops-web-test/issues" target="_blank">提issue</a> 。</p>
<p>Power by <a href="https://npmjs.com/package/<%=pkg.name%>" target="_blank"><%=pkg.name%></a> v<%=pkg.version%> <p/>

</body>
</html>