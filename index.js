/**
 *  JS动态混淆--混淆器入口
 */

//引用其他模块
var fs = require("fs");
var jsMangle = require("./lib/node");

var ip = '192.168.0.1';
var inputFiles = 'H:\\4up\\biSheCode\\input\\index.js';
//执行函数,调试用，真正调用时不能执行，否则会执行两遍
jsMangleMain(ip, inputFiles);


/**
 * 执行混淆的函数
 * @param ip
 * @param inputFiles
 */
function jsMangleMain(ip, inputFile) {
    //用于插入冗余代码的文件
    var redundancyFile = [
        './input/redundancyCode.js'
    ].map(function(file){
        //fs模块需要读取绝对路径，利用resolve将相对路径转为绝对路径
        return require.resolve(file);
    });
    var redundancyCode = jsMangle.minify(fs.readFileSync(redundancyFile[0], "utf8"), {
        parse: {},
        compress: {},
        mangle: false,
        output: {
            ast: true,
            code: false // optional - faster if false
        }
    });

    /**
     * 开始混淆
     */

    //各个模块所需要的参数
    compressOptions = {}; //压缩参数，默认就够用
    mangleOptions = {toplevel:true}; //混淆参数，需要toplevel和reserved=[]，要从json文件中读取
    outputOptions = {}; //输出参数，默认为输出js代码

    //之后的操作都基于toplevel
    var toplevel = null;

    //解析为AST
    var code = fs.readFileSync(inputFile, "utf8");
    toplevel = jsMangle.parse(code, {
        filename: inputFile,
        toplevel: toplevel
    });
    
/**********************************************************修改语法******************************************************/
    toplevel.figure_out_scope(mangleOptions);
    toplevel = new jsMangle.Compressor(compressOptions).compress(toplevel);
/**********************************************************插入冗余代码**************************************************/
    //根据时间戳选择使用哪些冗余数据
    var findWhere = structureFindWhere(redundancyCode.ast.body.length);
    //根据ip地址选择冗余数据插在原代码中的哪个位置
    var insertWhere = structureInsertWhere(ip, findWhere.length, toplevel.body.length);
    toplevel.body = addRedundancyCode(toplevel.body, redundancyCode.ast.body, findWhere, insertWhere);
/***********************************************************修改变量名***************************************************/
    toplevel.figure_out_scope(mangleOptions);
    //重置新的变量名数组
    jsMangle.base54.reset();
    //统计每个字符出现的次数，以供混淆名称候选字符重新排序，使用频率大的在前面，为了HTTPgzip压缩后代码更小
    toplevel.compute_char_frequency(mangleOptions);
    toplevel.mangle_names(mangleOptions);

/***********************************************************输出代码*****************************************************/
    var stream = jsMangle.OutputStream(outputOptions);
    toplevel.print(stream);
    code = stream.get();
    print(code);

/***********************************************************各种辅助函数*************************************************/
    /**
     * 插入冗余代码
     * @param originCode  原代码,AST结构
     * @param redundancyCode 冗余代码，AST结构
     * @param findWhere  array   读取冗余代码中的哪几个元素[1,12,33,41]
     * @param insertWhere  array 插入到原代码ast中第几个位置[1,23,45],数组中可能有多个0
     */
    function addRedundancyCode(originCode, redundancyCode, findWhere, insertWhere){
        var res = [];
        //随机选择的冗余代码
        var redundancy = [];

        //读取冗余代码
        for (var num in findWhere) {
            redundancy.push(redundancyCode[findWhere[num]]);
        }
        //将冗余代码和原代码混合
        var resLength = 0;
        //两份代码任意一个有未插入的，则进入循环内
        while (originCode.length > 0 || redundancy.length > 0) {
            if (redundancy.length > 0) {
                //冗余数据没有插入结束
                if (resLength === insertWhere[0] || insertWhere[0] === 0) {
                    //如果这个位置应该插入冗余代码，或insertWhere指定要插在首位
                    insertWhere.shift();
                    res.push(redundancy.shift());
                } else {
                    res.push(originCode.shift());
                }
            } else if (originCode.length > 0 ) {
                //原始代码没有插入结束
                res.push(originCode.shift());
            }
            resLength++;
        }

        return res;
    }

    /**
     * 将数组中每个元素修改为与前一个元素的和，斐波那契数列
     * @param arr
     * @param maxNum int 数组中元素不能超过的最大值
     * @param find
     * @return array
     */
    function arrSum(arr, maxNum){
        var res = arr.map(function(item, key, arrSelf){
            arrSelf[key] = key ===0 ? parseInt(item): parseInt(arrSelf[key-1])+parseInt(item);
            return  arrSelf[key] >maxNum? arrSelf[key]%maxNum: arrSelf[key];
        });
        return res;
    }

    /**
     * 去除insertWhere数组中重复的元素
     * 若重复，则原数+1，数组中靠后的元素可能会被顶替并后移N位
     * insertWhere中的数组
     * @param arr
     * @param originCodeLength
     * @returns {Array}
     */
    function insertWhereUnique(arr, originCodeLength) {
        var res = [];
        for (var step=0; step<arr.length; step++) {
            if (res.indexOf(arr[step]) !== -1) {
                //数组中已存在
                var start = arr[step];
                while (1) {
                    //每次+1.直到数组中不存在这个数
                    if (res.indexOf(++start) === -1) {
                        if (start >= originCodeLength) {
                            res.push(0);
                        } else {
                            res.push(start);
                        }
                        break;
                    }
                }
            } else {
                //数组中不存在，直接push
                if (arr[step] >= originCodeLength) {
                    res.push(0);
                } else {
                    res.push(arr[step]);
                }
            }
        }
        return res;
    }

    /**
     * 将ip地址转为insertWhere,数组中可能有多个0
     * ip地址转为数字后，最大4294967295，还是会有三位随机产生的数,所以一个ip，同一时刻，还是会有不同的冗余数据插入
     * @param ip
     * @param findWhereLength int insertWhere的长度要等于findWhere
     * @returns {number} 排序有小到大
     */
    function structureInsertWhere(ip, findWhereLength, originCodeLength)
    {
        var num = 0;
        ip = ip.split(".");
        num = Number(ip[0]) * 256 * 256 * 256 + Number(ip[1]) * 256 * 256 + Number(ip[2]) * 256 + Number(ip[3]);
        num = num >>> 0;

        //数字转字符串
        num = num.toString();
        //字符串转数组
        num = num.split('');
        //斐波那契数组,insertWhere不需要考虑数组长度，所以maxNum写9999999
        num = arrSum(num, 9999999);
        if (num.length < findWhereLength) {
            //insertWhere元素比findWhere元素少，则在insertWhere数组中随机选元素插入在后面
            for (var moreIndex=num.length; moreIndex<findWhereLength; moreIndex++) {
                num[moreIndex] = num[Math.floor(Math.random()*num.length)];
            }
        }
        //保证insertWhere每个元素的唯一性
        num = insertWhereUnique(num, originCodeLength);
        return num.sort(numSortAsc);
    }


    /**
     * 构造findWhere
     * @param redundancyLength 冗余代码的长度
     * @returns {number}
     */
    function structureFindWhere(redundancyLength) {
        var timeStamp = new Date().getTime();
        timeStamp = timeStamp.toString();
        //时间戳转为数组，并倒序，因为时间戳第一位一定是1，变化太小
        timeStamp = timeStamp.split('').reverse();
        //斐波那契
        findWhere = arrSum(timeStamp, redundancyLength);
        //数组去重
        findWhere = findWhereUnique(findWhere, redundancyLength);
        return findWhere.sort(numSortAsc);
    }

    /**
     * findWhere数组去重
     * @param arr
     * @param maxNum
     * @returns {Array}
     */
    function findWhereUnique(arr, maxNum) {
        var res = [];
        for (var step=0; step<arr.length; step++) {
            if (res.indexOf(arr[step]) !== -1) {
                //数组中已存在
                var start = arr[step];
                while (1) {
                    //如果元素+1不在maxNum范围内，则取余
                    if (++start > maxNum) {
                        start = start%maxNum;
                    }
                    //只有当start与数组中元素不重复时，才跳出循环
                    if (res.indexOf(start) === -1) {
                        res.push(start);
                        break;
                    }
                }
            } else {
                //数组中不存在，直接push
                res.push(arr[step]);
            }
        }
        return res;
    }

    /**
     * 数字数组排序--正序
     * @param a
     * @param b
     * @returns {number}
     */
    function numSortAsc(a, b) {
        return a - b;
    }


    /**
     * 输出信息
     * @param txt
     */
    function print(txt) {
        process.stdout.write(txt);
        process.stdout.write("\n");
    }
}

//将函数暴露给其他模块使用
module.exports = jsMangleMain;






