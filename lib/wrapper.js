#!/usr/bin/env node
'use strict';


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


// @param {string} code
// @param {Array.<string>} deps
// @param {Object} pacakge package.json object
// @param {string} separator
module.exports = function(code, deps, pkg, separator, grunt) {
    if(
        !check_package(pkg, function(err) {
            grunt.log.error(err);
        })
    ){ 
        return;
    }

    var module_identifier = pkg.name + separator + pkg.version;

    var dependencies = pkg.dependencies;
    var deps_with_version = deps.map(function(dep) {
        if( !(dep in dependencies) ){
            grunt.log.error('Version of the dependency "' + dep + '" is not defined in package.json');
        }

        return dep + separator + ( dependencies[dep] || 'latest' );
    });

    return 'NR.define(\'' + module_identifier + '\', [\'' + deps_with_version.join('\', \'') + '\'], function(require, exports, module) {\n\n' + 
        code.replace(/\r|\n/g, '\n') + 
        '\n\n});';

};





