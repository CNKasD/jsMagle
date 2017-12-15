# 通过命令行调用uglifyjs的流程过于复杂，回调函数过多,且多次重复调用。编写自己的命令行脚本调用uglifyjs的API进行混淆与压缩，
# 搭建自己的node npm包
- 进入一个空文件夹，`npm init`，根据命令行反馈输入具体配置信息

# 文件路径
- uglifyjs的package.json里面
    - main为tools/node.js，这是uglify的模块
    - bin 为 bin/uglifyjs  ，这是cli的入口，在这里调用了node.js以及其他操作
# 调用方式
```javascript
var UglifyJS = require("../tools/node");
//返回ast
// result.ast contains native Uglify AST
var result = UglifyJS.minify(code, {
    parse: {},
    compress: false,
    mangle: false,
    output: {
        ast: true,
        code: false  // optional - faster if false
    }
});
//返回ast和code，参数为ast
// result.ast contains native Uglify AST
// result.code contains the minified code in string form.
var result = UglifyJS.minify(ast, {
    compress: {},
    mangle: {},
    output: {
        ast: true,
        code: true  // optional - faster if false
    }
});
```