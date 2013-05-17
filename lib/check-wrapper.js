#!/usr/bin/env node

var uglifyjs = require('uglify-js');


// check if the code content already has module wrapper

// @param {function()} 
exports.check = function(ast, callback) {

    var err;


    var walker = uglifyjs.TreeWalker(function(node) {

        if( !err && node.CTOR === uglifyjs.AST_SymbolRef && node.name === 'require' && !node.undeclared() ){
            err = true;
        }
            
    });


    return !err;

};