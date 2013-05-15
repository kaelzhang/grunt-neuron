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
// var async = require('async');


module.exports = function(grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('neuron', 'Grunt-task: grunt-neuron', function() {
        // var done = this.async();

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            versionSeparator: '@'
        });

        // Iterate over all specified file groups.
        this.files.forEach(function(f) {

            // Concat specified files.
            // if `expaned`, `f.src` will be an array containing one item
            var filepath = f.src[0];

            var STR_FILE_PATH = 'Source file "' + filepath + '": ';

            // Warn on and remove invalid source files (if nonull was set).
            if (!grunt.file.exists(filepath)) {
                grunt.log.warn(STR_FILE_PATH + 'not found.');
                return;
            }

            // read file
            var content = grunt.file.read(filepath);
            var ast;

            // syntax parse may cause a javascript error
            try{
                ast = uglifyjs.parse(content);
            }catch(e){
                grunt.log.error(STR_FILE_PATH + 'syntax parse error: ' + e.toString());
                return;
            }

            if(!checker.check(ast)){
                grunt.log.warn(STR_FILE_PATH + 'already has module wrapping, which will cause further problems');
                return;
            }

            var deps = [];
            var walker = new uglifyjs.TreeWalker(function(node) {

                if(node.CTOR === uglifyjs.AST_Call){
                    var expression = node.expression;
                    var args = node.args;

                    if(expression.CTOR === uglifyjs.AST_SymbolRef && expression.name === 'require'){
                        var dep = args[0];

                        if(args.length === 1 && dep.CTOR === uglifyjs.AST_String){
                            
                            deps.push(dep.value);
                            
                        }else{
                            grunt.log.error(
                                STR_FILE_PATH + 
                                '`require` should have one and only one string as an argument'
                            );
                        }
                    }
                }
            });

            ast.walk(walker);

            console.log('deps', deps, options.pkg, grunt.pkg);

            var wrapped = wrapper(content, deps, options.pkg, options.versionSeparator, grunt);

            if(wrapped){
                grunt.file.write(f.dest, wrapped);
            }

            // Print a success message.
            grunt.log.writeln('File "' + f.dest + '" created.');
        });
    });

};
