#! /usr/bin/env node
// -*- js -*-

"use strict";

// workaround for tty output truncation upon process.exit()
[process.stdout, process.stderr].forEach(function(stream){
    if (stream._handle && stream._handle.setBlocking)
        stream._handle.setBlocking(true);
});

var fs = require("fs");
var info = require("../package.json");
var path = require("path");
var program = require("commander");
var UglifyJS = require("../tools/node");

var skip_keys = [ "cname", "enclosed", "inlined", "parent_scope", "scope", "thedef", "uses_eval", "uses_with" ];
var files = {};
var options = {
    compress: false,
    mangle: false
};
program.version(info.name + " " + info.version);
program.parseArgv = program.parse;
program.parse = undefined;
if (process.argv.indexOf("ast") >= 0) program.helpInformation = UglifyJS.describe_ast;
else if (process.argv.indexOf("options") >= 0) program.helpInformation = function() {
    var text = [];
    var options = UglifyJS.default_options();
    for (var option in options) {
        text.push("--" + (option == "output" ? "beautify" : option == "sourceMap" ? "source-map" : option) + " options:");
        text.push(format_object(options[option]));
        text.push("");
    }
    return text.join("\n");
};
program.option("-c, --compress [options]", "Enable compressor/specify compressor options.", parse_js());
program.option("-m, --mangle [options]", "Mangle names/specify mangler options.", parse_js());
program.option("--mangle-props [options]", "Mangle properties/specify mangler options.", parse_js());
program.option("-b, --beautify [options]", "Beautify output/specify output options.", parse_js());
program.option("-o, --output <file>", "Output file (default STDOUT).");
program.option("--toplevel", "Compress and/or mangle variables in toplevel scope.");
program.arguments("[files...]").parseArgv(process.argv);
if (program.configFile) {
    options = JSON.parse(read_file(program.configFile));
}
if (!program.output && program.sourceMap && program.sourceMap.url != "inline") {
    fatal("ERROR: cannot write source map to STDOUT");
}

// 将参数添加到options里
[
    "compress",
    "ie8",
    "mangle",
    "rename",
    "sourceMap",
    "toplevel",
    "wrap"
].forEach(function(name) {
    if (name in program) {
        if (name == "rename" && program[name]) return;
        options[name] = program[name];
    }
});
if (program.beautify) {
    options.output = typeof program.beautify == "object" ? program.beautify : {};
    if (!("beautify" in options.output)) {
        options.output.beautify = true;
    }
}
if (program.comments) {
    if (typeof options.output != "object") options.output = {};
    options.output.comments = typeof program.comments == "string" ? program.comments : "some";
}
if (program.define) {
    if (typeof options.compress != "object") options.compress = {};
    if (typeof options.compress.global_defs != "object") options.compress.global_defs = {};
    for (var expr in program.define) {
        options.compress.global_defs[expr] = program.define[expr];
    }
}
if (program.keepFnames) {
    options.keep_fnames = true;
}
//混淆属性前进行的特殊处理
if (program.mangleProps) {
    //domprops为不混淆的变量名
    if (program.mangleProps.domprops) {
        delete program.mangleProps.domprops;
    } else {
        if (typeof program.mangleProps != "object") program.mangleProps = {};
        if (!Array.isArray(program.mangleProps.reserved)) program.mangleProps.reserved = [];
        //不进行混淆的变量，常见的都存在tools/domprops.json里
        require("../tools/domprops").forEach(function(name) {
            UglifyJS._push_uniq(program.mangleProps.reserved, name);
        });
    }
    if (typeof options.mangle != "object") options.mangle = {};
    options.mangle.properties = program.mangleProps;
}
if (program.nameCache) {
    options.nameCache = JSON.parse(read_file(program.nameCache, "{}"));
}
if (program.output == "ast") {
    options.output = {
        ast: true,
        code: false
    };
}
if (program.parse) {
    if (!program.parse.acorn && !program.parse.spidermonkey) {
        options.parse = program.parse;
    } else if (program.sourceMap && program.sourceMap.content == "inline") {
        fatal("ERROR: inline source map only works with built-in parser");
    }
}
//路径处理，可以在这里加基础uri
var convert_path = function(name) {
    return name;
};
if (typeof program.sourceMap == "object" && "base" in program.sourceMap) {
    convert_path = function() {
        var base = program.sourceMap.base;
        delete options.sourceMap.base;
        return function(name) {
            return path.relative(base, name);
        };
    }();
}
//--verbose -v 参数  详细信息
if (program.verbose) {
    options.warnings = "verbose";
} else if (program.warn) {
    options.warnings = true;
}
if (program.self) {
    //self?，没看到进到这个if中的情况
    if (program.args.length) {
        print_error("WARN: Ignoring input files since --self was passed");
    }
    if (!options.wrap) options.wrap = "UglifyJS";
    simple_glob(UglifyJS.FILES).forEach(function(name) {
        files[convert_path(name)] = read_file(name);
    });
    run();
} else if (program.args.length) {
    //命令行参数，混淆时为需要混淆的文件名，空格分隔，可以有多个文件
    simple_glob(program.args).forEach(function(name) {
        files[convert_path(name)] = read_file(name);
    });
    run();
} else {
    var chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", function(chunk) {
        chunks.push(chunk);
    }).on("end", function() {
        files = [ chunks.join("") ];
        run();
    });
    process.stdin.resume();
}

function convert_ast(fn) {
    return UglifyJS.AST_Node.from_mozilla_ast(Object.keys(files).reduce(fn, null));
}

//混淆入口
function run() {
    UglifyJS.AST_Node.warn_function = function(msg) {
        print_error("WARN: " + msg);
    };
    if (program.timings) options.timings = true;
    try {
        if (program.parse) {
            if (program.parse.acorn) {
                files = convert_ast(function(toplevel, name) {
                    return require("acorn").parse(files[name], {
                        locations: true,
                        program: toplevel,
                        sourceFile: name
                    });
                });
            } else if (program.parse.spidermonkey) {
                files = convert_ast(function(toplevel, name) {
                    var obj = JSON.parse(files[name]);
                    if (!toplevel) return obj;
                    toplevel.body = toplevel.body.concat(obj.body);
                    return toplevel;
                });
            }
        }
    } catch (ex) {
        fatal(ex);
    }
/*    console.log('files=============');
    console.log(files);
    console.log('==================');
    console.log('options===============');
    console.log(options);
    console.log('=======================');*/
    //files为读取出的文件，json格式，文件名:文件内容
    // options 为参数{ compress: true,   mangle: { toplevel: true, eval: true, properties: { reserved: [Array] } } }
    var result = UglifyJS.minify(files, options);
    //result 为json格式  code:具体代码形式
    console.log('result=====================================');
    console.log(result);
    console.log('/result=====================================');
    if (result.error) {
        //如果报错
        var ex = result.error;
        if (ex.name == "SyntaxError") {
            print_error("Parse error at " + ex.filename + ":" + ex.line + "," + ex.col);
            var col = ex.col;
            var lines = files[ex.filename].split(/\r?\n/);
            var line = lines[ex.line - 1];
            if (!line && !col) {
                line = lines[ex.line - 2];
                col = line.length;
            }
            if (line) {
                var limit = 70;
                if (col > limit) {
                    line = line.slice(col - limit);
                    col = limit;
                }
                print_error(line.slice(0, 80));
                print_error(line.slice(0, col).replace(/\S/g, " ") + "^");
            }
        }
        if (ex.defs) {
            print_error("Supported options:");
            print_error(format_object(ex.defs));
        }
        fatal(ex);
    } else if (program.output == "ast") {
        //如果输出格式为ast
        print(JSON.stringify(result.ast, function(key, value) {
            if (skip_key(key)) return;
            if (value instanceof UglifyJS.AST_Token) return;
            if (value instanceof UglifyJS.Dictionary) return;
            if (value instanceof UglifyJS.AST_Node) {
                var result = {
                    _class: "AST_" + value.TYPE
                };
                value.CTOR.PROPS.forEach(function(prop) {
                    result[prop] = value[prop];
                });
                return result;
            }
            return value;
        }, 2));
    } else if (program.output == "spidermonkey") {
        //如果输出格式为 spidermonkey，也是一种ast的json格式
        print(JSON.stringify(UglifyJS.minify(result.code, {
            compress: false,
            mangle: false,
            output: {
                ast: true,
                code: false
            }
        }).ast.to_mozilla_ast(), null, 2));
    } else if (program.output) {
        fs.writeFileSync(program.output, result.code);
        if (result.map) {
            fs.writeFileSync(program.output + ".map", result.map);
        }
    } else {
        print(result.code);
    }
    if (program.nameCache) {
        fs.writeFileSync(program.nameCache, JSON.stringify(options.nameCache));
    }
    if (result.timings) for (var phase in result.timings) {
        print_error("- " + phase + ": " + result.timings[phase].toFixed(3) + "s");
    }
}

/**
 * 展示错误信息
 * @param message
 */
function fatal(message) {
    if (message instanceof Error) message = message.stack.replace(/^\S*?Error:/, "ERROR:");
    print_error(message);
    process.exit(1);
}

// A file glob function that only supports "*" and "?" wildcards in the basename.
// Example: "foo/bar/*baz??.*.js"
// Argument `glob` may be a string or an array of strings.
// Returns an array of strings. Garbage in, garbage out.
/**
 * 获取文件内容
 * 可以以*或?作为通配符混淆整个目录,返回{"index.js":"","index2.js":""}形式
 * @param glob
 * @returns {*}
 */
function simple_glob(glob) {
    if (Array.isArray(glob)) {
        return [].concat.apply([], glob.map(simple_glob));
    }
    if (glob.match(/\*|\?/)) {
        var dir = path.dirname(glob);
        try {
            var entries = fs.readdirSync(dir);
        } catch (ex) {}
        if (entries) {
            var pattern = "^" + path.basename(glob)
                .replace(/[.+^$[\]\\(){}]/g, "\\$&")
                .replace(/\*/g, "[^/\\\\]*")
                .replace(/\?/g, "[^/\\\\]") + "$";
            var mod = process.platform === "win32" ? "i" : "";
            var rx = new RegExp(pattern, mod);
            var results = entries.filter(function(name) {
                return rx.test(name);
            }).map(function(name) {
                return path.join(dir, name);
            });
            if (results.length) return results;
        }
    }
    return [ glob ];
}

/**
 * 读取文件
 * @param path
 * @param default_value
 * @returns {*}
 */
function read_file(path, default_value) {
    try {
        return fs.readFileSync(path, "utf8");
    } catch (ex) {
        if (ex.code == "ENOENT" && default_value != null) return default_value;
        fatal(ex);
    }
}

/**
 * 参数预处理，提取-m 后面的 toplevel等参数
 * @param flag
 * @returns {Function}
 */
function parse_js(flag) {
    return function(value, options) {
        options = options || {};
        try {
            //uglify具体处理函数，会根据参数进行具体处理,minify返回ast格式的json
            UglifyJS.minify(value, {
                parse: {
                    expression: true
                },
                compress: false,
                mangle: false,
                output: {
                    ast: true,
                    code: false
                }
            }).ast.walk(new UglifyJS.TreeWalker(function(node) {
                if (node instanceof UglifyJS.AST_Assign) {
                    var name = node.left.print_to_string();
                    var value = node.right;
                    if (flag) {
                        options[name] = value;
                    } else if (value instanceof UglifyJS.AST_Array) {
                        options[name] = value.elements.map(to_string);
                    } else {
                        options[name] = to_string(value);
                    }
                    return true;
                }
                if (node instanceof UglifyJS.AST_Symbol || node instanceof UglifyJS.AST_PropAccess) {
                    var name = node.print_to_string();
                    options[name] = true;
                    return true;
                }
                if (!(node instanceof UglifyJS.AST_Sequence)) throw node;

                function to_string(value) {
                    return value instanceof UglifyJS.AST_Constant ? value.getValue() : value.print_to_string({
                        quote_keys: true
                    });
                }
            }));
        } catch(ex) {
            if (flag) {
                fatal("Error parsing arguments for '" + flag + "': " + value);
            } else {
                options[value] = null;
            }
        }
        return options;
    }
}

function parse_source_map() {
    var parse = parse_js();
    return function(value, options) {
        var hasContent = options && "content" in options;
        var settings = parse(value, options);
        if (!hasContent && settings.content && settings.content != "inline") {
            print_error("INFO: Using input source map: " + settings.content);
            settings.content = read_file(settings.content, settings.content);
        }
        return settings;
    }
}

function skip_key(key) {
    return skip_keys.indexOf(key) >= 0;
}

function format_object(obj) {
    var lines = [];
    var padding = "";
    Object.keys(obj).map(function(name) {
        if (padding.length < name.length) padding = Array(name.length + 1).join(" ");
        return [ name, JSON.stringify(obj[name]) ];
    }).forEach(function(tokens) {
        lines.push("  " + tokens[0] + padding.slice(tokens[0].length - 2) + tokens[1]);
    });
    return lines.join("\n");
}

/**
 * 输出错误信息
 * @param msg
 */
function print_error(msg) {
    process.stderr.write(msg);
    process.stderr.write("\n");
}

/**
 * 输出信息
 * @param txt
 */
function print(txt) {
    process.stdout.write(txt);
    process.stdout.write("\n");
}
