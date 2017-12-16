# uglifyjs混淆和压缩相关源码分析、部分重构，并封装成命令行程序
# 需要安装的模块
- commander，命令行相关
- source-map， 压缩后source-map相关

# 数据类型
## 经过parse解析后的AST
```javascript
AST_Node {
  end: 
  //结束
   AST_Token {
     raw: undefined,
     file: 'H:\\4up\\biSheCode\\input\\input.js',
     comments_before: [],
     nlb: true,
     endpos: 394,
     endcol: 1,
     endline: 22,
     pos: 393,
     col: 0,
     line: 22,
     value: '}',
     type: 'punc' },
  start: 
  //起始
   AST_Token {
     raw: '"use strict"',
     file: 'H:\\4up\\biSheCode\\input\\input.js',
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
  body:
  //body里面才是具体代码 
   [ AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       quote: '"',
       value: 'use strict' },
     AST_Node { end: [AST_Token], start: [AST_Token], definitions: [Array] },
     AST_Node { end: [AST_Token], start: [AST_Token], definitions: [Array] },
     AST_Node { end: [AST_Token], start: [AST_Token], definitions: [Array] },
     AST_Node { end: [AST_Token], start: [AST_Token], body: [AST_Node] },
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       body: [AST_Node],
       alternative: null,
       condition: [AST_Node] },
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       body: [AST_Node],
       step: [AST_Node],
       condition: [AST_Node],
       init: [AST_Node] },
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       body: [Array],
       expression: [AST_Node] } ],
  cname: undefined,
  enclosed: undefined,
  parent_scope: undefined,
  uses_eval: undefined,
  uses_with: undefined,
  functions: undefined,
  variables: undefined,
  globals: undefined }
```
### ast中的body
- body中start，end一定有。end基本是;和} 的token
- use strice语句有quote，value
```javascript
AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
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
       file: 'H:\\4up\\biSheCode\\input\\input.js',
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
    value: 'use strict' }
```
  
- 声明语句有
```javascript
AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
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
       file: 'H:\\4up\\biSheCode\\input\\input.js',
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
    definitions: [ [AST_Node] ] }
```

- console语句
```javascript
  AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
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
       file: 'H:\\4up\\biSheCode\\input\\input.js',
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
       expression: [AST_Node] } }
```

- if语句有
```javascript
  AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [],
       nlb: true,
       endpos: 134,
       endcol: 1,
       endline: 9,
       pos: 133,
       col: 0,
       line: 9,
       value: '}',
       type: 'punc' },
    start: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [Array],
       nlb: true,
       endpos: 97,
       endcol: 2,
       endline: 7,
       pos: 95,
       col: 0,
       line: 7,
       value: 'if',
       type: 'keyword' },
    body: AST_Node { end: [AST_Token], start: [AST_Token], body: [Array] },
    alternative: null,
    condition: 
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       right: [AST_Node],
       left: [AST_Node],
       operator: '>' } }
```

- for 语句有
```javascript
  AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [],
       nlb: true,
       endpos: 198,
       endcol: 1,
       endline: 13,
       pos: 197,
       col: 0,
       line: 13,
       value: '}',
       type: 'punc' },
    start: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [Array],
       nlb: true,
       endpos: 148,
       endcol: 3,
       endline: 11,
       pos: 145,
       col: 0,
       line: 11,
       value: 'for',
       type: 'keyword' },
    body: AST_Node { end: [AST_Token], start: [AST_Token], body: [Array] },
    step: 
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       expression: [AST_Node],
       operator: '++' },
    condition: 
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       right: [AST_Node],
       left: [AST_Node],
       operator: '<' },
    init: AST_Node { end: [AST_Token], start: [AST_Token], definitions: [Array] } }
```
  
- switch语句有
```javascript
  AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [],
       nlb: true,
       endpos: 420,
       endcol: 1,
       endline: 25,
       pos: 419,
       col: 0,
       line: 25,
       value: '}',
       type: 'punc' },
    start: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [Array],
       nlb: true,
       endpos: 217,
       endcol: 6,
       endline: 15,
       pos: 211,
       col: 0,
       line: 15,
       value: 'switch',
       type: 'keyword' },
    body: [ [AST_Node], [AST_Node], [AST_Node] ],
    expression: 
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       thedef: undefined,
       name: 'sum',
       scope: undefined } }
```
  
- while语句有
```javascript
  AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [],
       nlb: true,
       endpos: 474,
       endcol: 1,
       endline: 29,
       pos: 473,
       col: 0,
       line: 29,
       value: '}',
       type: 'punc' },
    start: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [Array],
       nlb: true,
       endpos: 436,
       endcol: 5,
       endline: 27,
       pos: 431,
       col: 0,
       line: 27,
       value: 'while',
       type: 'keyword' },
    body: AST_Node { end: [AST_Token], start: [AST_Token], body: [Array] },
    condition: 
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       right: [AST_Node],
       left: [AST_Node],
       operator: '>' } }
```

- do-while 语句有
```javascript
  AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [],
       nlb: false,
       endpos: 535,
       endcol: 18,
       endline: 33,
       pos: 534,
       col: 17,
       line: 33,
       value: ';',
       type: 'punc' },
    start: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [Array],
       nlb: true,
       endpos: 490,
       endcol: 2,
       endline: 31,
       pos: 488,
       col: 0,
       line: 31,
       value: 'do',
       type: 'keyword' },
    body: AST_Node { end: [AST_Token], start: [AST_Token], body: [Array] },
    condition: 
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       right: [AST_Node],
       left: [AST_Node],
       operator: '>' } }
```
- function语句有
```javascript
  AST_Node {
    end: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [],
       nlb: true,
       endpos: 604,
       endcol: 1,
       endline: 37,
       pos: 603,
       col: 0,
       line: 37,
       value: '}',
       type: 'punc' },
    start: 
     AST_Token {
       raw: undefined,
       file: 'H:\\4up\\biSheCode\\input\\input.js',
       comments_before: [],
       nlb: true,
       endpos: 547,
       endcol: 8,
       endline: 35,
       pos: 539,
       col: 0,
       line: 35,
       value: 'function',
       type: 'keyword' },
    body: [ [AST_Node] ],
    cname: undefined,
    enclosed: undefined,
    parent_scope: undefined,
    uses_eval: undefined,
    uses_with: undefined,
    functions: undefined,
    variables: undefined,
    uses_arguments: undefined,
    argnames: [ [AST_Node], [AST_Node] ],
    name: 
     AST_Node {
       end: [AST_Token],
       start: [AST_Token],
       thedef: undefined,
       name: 'reduce',
       scope: undefined,
       init: undefined },
    inlined: undefined }
```
# 压缩相关
## 压缩