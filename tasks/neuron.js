/*
 * grunt-neuron
 * https://github.com/Kael/grunt-neuron
 *
 * Copyright (c) 2013 Kael
 * Licensed under the MIT license.
 */

'use strict';


var checker = require('../lib/check-wrapper');
var uglifyjs = require('uglify-js');
var wrapper = require('../lib/wrapper');
var node_path = require('path');
var node_fs = require('fs');
var lang = require('../lib/lang');


var ERROR_MESSAGE = {
    USE_PARENT_DIRECTORY: 'Modules "{mod}" outside the folder of main entrance may cause serious further problems.',
    NO_VERSION: 'Version of dependency "{mod}" has not defined in source file "{path}"',
    SYNTAX_PARSE_ERROR:  'Source file "{path}" syntax parse error: "{err}"',
    NOT_FOUND: 'Source file "{path}" not found',
    ALREADY_WRAPPED: 'Source file "{path}" already has module wrapping, which will cause further problems',
    WRONG_USE_REQUIRE: 'Source file "{path}": `require` should have one and only one string as an argument'
};

var REGEX_ENDS_WITH_JS = /\.js$/;

var ENSURE_PROPERTY = {
    name: {
        err: 'package.name must be defined'
    },

    version: {
        err: 'package.version must be defined'
    }
};

function check_package(pkg, on_error){
    var pass = true;

    Object.keys(ENSURE_PROPERTY).forEach(function(key, config) {
        if(!pkg[key]){
            pass = false;
            on_error(config.err);
        }

    });

    return pass;
}


function is_relative_path(str){
    return str.indexOf('../') === 0 || str.indexOf('./') === 0;
}


module.exports = function(grunt) {

    function fail(template, obj){
        grunt.fail.fatal(lang.template(template, obj));
    };

    function warn(template, obj){
        grunt.log.warn(lang.template(template, obj));
    };

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('neuron', 'Grunt-task: grunt-neuron', function() {
        // var done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            versionSeparator: '@',
            define: 'define',
            mainFile: 'index.js'
        });

        var separator = options.versionSeparator;
        var pkg = options.pkg || grunt.file.readJSON( node_path.join(process.cwd(), './package.json') );

// main entrance:
// {
//      main: 'test/fixtures/main.js',
//      name: 'module'
//      version: '0.0.1'
// }
// 
// expected
//      src: ''
//
// unexpected:
//      src: 'test/folder/module.js'    -> ../folder/module.js
//      src: 'folder/folder/module.js'  -> ../../folder/folder/module.js


        if(
            !check_package(pkg, function(err) {
                grunt.fail.fatal('Package.json: ' + err);
            })
        ){
            return;
        }

        var dependencies = pkg.cortexExactDependencies;

        // -> 'module@0.0.1'
        var main_id = pkg.name + separator + pkg.version;

        // -> 'module@0.0.1/'
        var main_id_dir = main_id;
        var main_path = pkg.main;
        var main_path_dir = node_path.dirname(main_path);

        if(!REGEX_ENDS_WITH_JS.test(main_path)){
            main_path += '.js';
        }

        // Iterate over all specified file groups.
        this.files.forEach(function(f) {

            // Concat specified files.
            // if `expaned`, `f.src` will be an array containing one item
            var file_path = f.src[0];
            var id;
            var relative_path;
            var relative_id;
            var relative_id_dir;

            // test/fixtures/build/index.js
            var dest = node_path.join(node_path.dirname(f.dest), options.mainFile);

            if(file_path === main_path){
                id = main_id;
                relative_id_dir = './';
            
            }else{

                // file_path: 'test/fixtures/folder/foo.js'
                // -> 'folder/foo.js'
                relative_path = node_path.relative(main_path_dir, file_path);

                if(relative_path.indexOf('../') === 0){
                    fail(ERROR_MESSAGE.USE_PARENT_DIRECTORY, {mod: file_path});
                    return;
                }

                // -> 'folder/foo'
                relative_id = relative_path.replace(REGEX_ENDS_WITH_JS, '');

                // -> 'folder'
                relative_id_dir = node_path.dirname(relative_id);

                // -> 'module@0.0.1/folder/foo'
                id = node_path.join(main_id_dir, relative_id);
            }

            // Warn on and remove invalid source files (if nonull was set).
            if (!grunt.file.exists(file_path)) {
                warn(ERROR_MESSAGE.NOT_FOUND, {path: file_path});
                return;
            }

            // read file
            var content = grunt.file.read(file_path);
            var ast;

            // syntax parse may cause a javascript error
            try{
                ast = uglifyjs.parse(content);
            }catch(e){
                fail(ERROR_MESSAGE.SYNTAX_PARSE_ERROR, {path: file_path, err: e.toString()});
                return;
            }

            if(!checker.check(ast)){
                warn(ERROR_MESSAGE.ALREADY_WRAPPED, {path: file_path});
                return;
            }

            var deps = [];

            // use syntax analytics
            var walker = new uglifyjs.TreeWalker(function(node) {

                if(node.CTOR === uglifyjs.AST_Call){
                    var expression = node.expression;
                    var args = node.args;

                    if(expression.CTOR === uglifyjs.AST_SymbolRef && expression.name === 'require'){
                        var dep = args[0];

                        if(args.length === 1 && dep.CTOR === uglifyjs.AST_String){
                            
                            deps.push(dep.value);
                            
                        }else{
                            fail(ERROR_MESSAGE.WRONG_USE_REQUIRE, {path: file_path});
                        }
                    }
                }
            });

            ast.walk(walker);

            // suppose: 
            //      ['./a', '../../b']
            // `deps` may have relative items, normalize them
            deps = deps.map(function(dep){
                
                if(is_relative_path(dep)){

                    // ./a -> folder/a
                    // ../../b -> ../b
                    var relative_dep_id = node_path.normalize( node_path.join(relative_id_dir, dep) );

                    if(relative_dep_id.indexOf('../') === 0){
                        fail(ERROR_MESSAGE.USE_PARENT_DIRECTORY, {mod: dep})
                    }

                    // -> module@0.0.1/folder/a
                    // maintain './a' if relative dependency
                    // dep

                }else{
                    var version = dependencies[dep];

                    // TODO: 
                    // check if absolute version
                    if(!version){
                        fail(ERROR_MESSAGE.NO_VERSION, {mod: dep, path: file_path});
                    }

                    dep += separator + version;
                }

                return dep;
            });

            var wrapped = wrapper({
                define  : options.define,
                code    : content,
                deps    : deps,
                id      : id

            }, grunt);

            if(wrapped){
                var dir = node_path.dirname(dest);

                if(!grunt.file.exists(dir)){
                    grunt.file.mkdir(dir);
                }

                node_fs.writeFileSync(dest, wrapped + '\n\n', {
                    flag: 'a+'
                });

                // Print a success message.
                grunt.log.writeln('Append wrapped "' + file_path + '" to file "' + dest + '"');
            }
        });
    });

};
