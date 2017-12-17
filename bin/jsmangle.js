#!/usr/bin/env node
var Handle = require('../index.js');
var program = require('commander');

program.version('V' + require('../package.json').version)
    .description('JS动态混淆系统');
program.option("-f --file <value>", "要混淆的文件绝对路径");
program.option("-i --ip [options]", "ip地址，用于生产冗余数据", '127.0.0.1');
program.parse(process.argv);

if (program.file) {
    Handle(program.ip, program.file);
} else {
    console.log('-f 参数必须填写');
}
