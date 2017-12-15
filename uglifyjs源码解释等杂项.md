<!-- TOC -->

- [环境安装](#%E7%8E%AF%E5%A2%83%E5%AE%89%E8%A3%85)
- [命令](#%E5%91%BD%E4%BB%A4)
- [文件](#%E6%96%87%E4%BB%B6)
- [命令行流程](#%E5%91%BD%E4%BB%A4%E8%A1%8C%E6%B5%81%E7%A8%8B)
- [commander模块进行命令行功能](#commander%E6%A8%A1%E5%9D%97%E8%BF%9B%E8%A1%8C%E5%91%BD%E4%BB%A4%E8%A1%8C%E5%8A%9F%E8%83%BD)
- [js语法解析为AST抽象语法树(Uglifyjs使用了自己格式的AST抽象语法树)](#js%E8%AF%AD%E6%B3%95%E8%A7%A3%E6%9E%90%E4%B8%BAast%E6%8A%BD%E8%B1%A1%E8%AF%AD%E6%B3%95%E6%A0%91uglifyjs%E4%BD%BF%E7%94%A8%E4%BA%86%E8%87%AA%E5%B7%B1%E6%A0%BC%E5%BC%8F%E7%9A%84ast%E6%8A%BD%E8%B1%A1%E8%AF%AD%E6%B3%95%E6%A0%91)
    - [AST_TOKEN](#asttoken)
    - [token 和ast的关系](#token-%E5%92%8Cast%E7%9A%84%E5%85%B3%E7%B3%BB)
- [流程](#%E6%B5%81%E7%A8%8B)
    - [注1](#%E6%B3%A81)
- [混淆](#%E6%B7%B7%E6%B7%86)
- [JS知识点](#js%E7%9F%A5%E8%AF%86%E7%82%B9)
    - [initialize](#initialize)
    - [arguments](#arguments)
    - [apply](#apply)
    - [call](#call)
    - [函数调用时加括号与不加括号的区别](#%E5%87%BD%E6%95%B0%E8%B0%83%E7%94%A8%E6%97%B6%E5%8A%A0%E6%8B%AC%E5%8F%B7%E4%B8%8E%E4%B8%8D%E5%8A%A0%E6%8B%AC%E5%8F%B7%E7%9A%84%E5%8C%BA%E5%88%AB)
    - [node的回调大坑](#node%E7%9A%84%E5%9B%9E%E8%B0%83%E5%A4%A7%E5%9D%91)

<!-- /TOC -->
# 环境安装
- 安装node
- 安装uglifyjs`npm install uglify-js`
- 进入`/node_modules/uglify-js/bin`
- 通过命令行 `node uglify --help` 测试是否安装成功

# 命令
```bash
node commander.js index.js --mangle-props --reserved-domprops -m toplevel,eval -c
或 
node commander.js input.js --mangle-props --reserved-domprops -m toplevel,eval -c
```



# 文件
- 遍历AST生成作用域信息在`lib/scope.js`的 `AST_Toplevel.DEFMETHOD("figure_out_scope", function(options){})中`

# 命令行流程
- bin/uglifyjs进入脚本
- 真正执行混淆以及生成AST的步骤在/lib/minify.js中
- 多处调用paser_js()，paser_js中调用minify.js，所以minify函数中的files和options参数可能是文件，也可能是其他内容。

# commander模块进行命令行功能
- 会自动将命令添加到progeam.下

# js语法解析为AST抽象语法树(Uglifyjs使用了自己格式的AST抽象语法树)
- `lib/ast.js`
## AST_TOKEN
- 含有属性 type value line col pos endline endcol endpos nlb comments_before file raw
- 没有方法
- 没有基类
- parse中的一个ret包含的内容
```javascript
{ 
    type: 'keyword',
    value: 'return',
    line: 54,
    col: 8,
    pos: 1911,
    endline: 54,
    endcol: 14,
    endpos: 1917,
    nlb: true,
    file: 'index.js',
    comments_before: [] 
}
{
    type: 'punc',
    value: '}',
    line: 55,
    col: 4,
    pos: 1930,
    endline: 55,
    endcol: 5,
    endpos: 1931,
    nlb: true,
    file: 'index.js',
    comments_before: []
}
{ 
    type: 'string',
    value: '快递单号格式错误',
    line: 53,
    col: 14,
    pos: 1889,
    endline: 53,
    endcol: 24,
    endpos: 1899,
    nlb: false,
    file: 'index.js',
    raw: '\'快递单号格式错误\'',
    comments_before: [] 
}
```

## token 和ast的关系
- token是源代码中的一个关键词(变量名，变量值，if，while，var)
- ast里面有AST_Node数组，start，end 是token


# 流程
```mermaid
graph TB

    subgraph /lib/ast.js
    e1("Function TreeWalker() AST遍历器，是个类")-->e11["定义好类后，为类增加prototype"]

    subgraph /lib/scope.js
    d1("确定作用域相关代码")-->d2["为AST_Toplevel增加figure_out_scope方法"]
    end

    subgraph /lib/parse.js
    c1["Function parse()"]-->c11["通过最后的return一个匿名函数进行执行,返回一个toplevel对象，含有start，body，end三个属性，start，end的值为token对象，body的值为AST_Nodes数组(注1)"]
    c11-->c13["通过statement()对每个token进行处理"]
    c13-->c14["statement向embed_tokens()传递了一个匿名函数"]
    c14-->c15["匿名函数功能为每条语句的具体处理逻辑"]
    c15-->c16["匿名函数在embed_tokens()函数中才执行，并解析为AST格式，进行返回"]
    c2["Function tokenizer()将源码解析为token,token是每一条语句中的关键点，如 var a= 1 token 为var 类型为keyword, =类型为operator......"]-->c22["parse()中S.input对应tokenizer函数，每次获取一个token"]
    end

    subgraph /lib/minify.js
    b1["Function minify()"]-.->b2["进入到了options.rename的if中,figure_out_scope()和expand_names()"]
    b2-.->b21["figure_out_scope()确定作用域"]
    b2-.->b22["expand_names()确定作用域"]
    b2-->b3["执行压缩相关操作"]
    b3-->b4["执行混淆相关操作"]
    b4-.->b21
    end
    
    subgraph /bin/uglifyjs
    a1("/bin/uglifyjs")-->a2["parse_js初步解析参数"]
    end
    
    a2-->b1
    b1-->c1
    c1-->b2
    b21-->d1

```

## 注1
- 源代码为
```javascript
"use strict";
var a = 4,d=123,f='aaa';
var b = 2;
var sum =a/b+3;
console.log(sum);
```
- parse处理后的body
```javascript
[ AST_Node {
    end:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: false,
       endpos: 13,
       endcol: 13,
       endline: 1,
       pos: 12,
       col: 12,
       line: 1,
       value: ';',
       type: 'punc' },
    start:
     AST_Token {
       raw: '"use strict"',
       file: 'input.js',
       comments_before: [],
       nlb: false,
       endpos: 12,
       endcol: 12,
       endline: 1,
       pos: 0,
       col: 0,
       line: 1,
       value: 'use strict',
       type: 'string',
       quote: '"' },
    quote: '"',
    value: 'use strict' },
  AST_Node {
    end:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: false,
       endpos: 39,
       endcol: 24,
       endline: 2,
       pos: 38,
       col: 23,
       line: 2,
       value: ';',
       type: 'punc' },
    start:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: true,
       endpos: 18,
       endcol: 3,
       endline: 2,
       pos: 15,
       col: 0,
       line: 2,
       value: 'var',
       type: 'keyword' },
    definitions: [ [AST_Node], [AST_Node], [AST_Node] ] },
  AST_Node {
    end:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: false,
       endpos: 51,
       endcol: 10,
       endline: 3,
       pos: 50,
       col: 9,
       line: 3,
       value: ';',
       type: 'punc' },
    start:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: true,
       endpos: 44,
       endcol: 3,
       endline: 3,
       pos: 41,
       col: 0,
       line: 3,
       value: 'var',
       type: 'keyword' },
    definitions: [ [AST_Node] ] },
  AST_Node {
    end:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: false,
       endpos: 68,
       endcol: 15,
       endline: 4,
       pos: 67,
       col: 14,
       line: 4,
       value: ';',
       type: 'punc' },
    start:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: true,
       endpos: 56,
       endcol: 3,
       endline: 4,
       pos: 53,
       col: 0,
       line: 4,
       value: 'var',
       type: 'keyword' },
    definitions: [ [AST_Node] ] },
  AST_Node {
    end:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: false,
       endpos: 87,
       endcol: 17,
       endline: 5,
       pos: 86,
       col: 16,
       line: 5,
       value: ';',
       type: 'punc' },
    start:
     AST_Token {
       raw: undefined,
       file: 'input.js',
       comments_before: [],
       nlb: true,
       endpos: 77,
       endcol: 7,
       endline: 5,
       pos: 70,
       col: 0,
       line: 5,
       value: 'console',
       type: 'name' },
    body:
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       args: [Array],
       expression: [AST_Node] } } ]
```

# 混淆
- 遍历AST设置作用域
- 遍历AST混淆变量名
- 压缩代码

# JS知识点
## initialize
- 并不是语言中的保留字符，而是在类声明时赋值为一个函数
- 可能会有`this.initialize.apply(this , arguments);`，调用的情况，即在实例化对象后调用类中的initialize函数，
## arguments
- 调用函数的参数[数组形式]，可以不再函数生命中写形参
## apply
- 同call，只有两个参数，第二个参数为数组
## call
- 使this对象可以使用某个方法，第二个之后的参数为具体参数

## 函数调用时加括号与不加括号的区别
- 加括号代表直接执行
- 不加括号代表把函数赋值给变量，函数未执行
- 特例，forEach里函数不加括号，但已经执行了

## node的回调大坑
- 回调是因为js的函数时异步执行的，无法形成函数的线性调用链，即一个函数的结果作为另一个函数的输入。
- 使用Promis模块来解决回调难阅读，难调试的问题
- 