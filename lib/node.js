/**
 *  uglifyjs的主入口，负责引用uglify相关的文件
 */

var fs = require("fs");

var UglifyJS = exports;
var FILES = UglifyJS.FILES = [
    "./utils.js",
    "./ast.js",
    "./parse.js",
    "./transform.js",
    "./scope.js",
    "./output.js",
    "./compress.js",
    "./sourcemap.js",
    "./mozilla-ast.js",
    "./propmangle.js",
    "./minify.js",
    "./exports.js"
].map(function(file){
    //检查文件是否存在，并拼接好绝对路径，resolve负责将相对文件路径转为绝对路径
    return require.resolve(file);
});

new Function("MOZ_SourceMap", "exports", function() {
    var code = FILES.map(function(file) {
        return fs.readFileSync(file, "utf8");
    });
    code.push("exports.describe_ast = " + describe_ast.toString());
    return code.join("\n\n");
}())(
    //调用new Function
    require("source-map"),
    UglifyJS
);

function describe_ast() {
    var out = OutputStream({ beautify: true });
    function doitem(ctor) {
        out.print("AST_" + ctor.TYPE);
        var props = ctor.SELF_PROPS.filter(function(prop){
            return !/^\$/.test(prop);
        });
        if (props.length > 0) {
            out.space();
            out.with_parens(function(){
                props.forEach(function(prop, i){
                    if (i) out.space();
                    out.print(prop);
                });
            });
        }
        if (ctor.documentation) {
            out.space();
            out.print_string(ctor.documentation);
        }
        if (ctor.SUBCLASSES.length > 0) {
            out.space();
            out.with_block(function(){
                ctor.SUBCLASSES.forEach(function(ctor, i){
                    out.indent();
                    doitem(ctor);
                    out.newline();
                });
            });
        }
    };
    doitem(AST_Node);
    return out + "\n";
}

function infer_options(options) {
    var result = UglifyJS.minify("", options);
    return result.error && result.error.defs;
}

UglifyJS.default_options = function() {
    var defs = {};
    Object.keys(infer_options({ 0: 0 })).forEach(function(component) {
        var options = {};
        options[component] = { 0: 0 };
        if (options = infer_options(options)) {
            defs[component] = options;
        }
    });
    return defs;
};
