/**
 * @param {string} template template string
 * @param {Object} params
 */
exports.template = function(template, params){
    
    // suppose:
    // template = 'abc{a}\\{b}';
    // params = { a: 1, b: 2 };
    
    // returns: 'abc1{b}'
    return ('' + template).replace(/\\?\{([^{}]+)\}/g, function(match, name){ // name -> match group 1
    
        // never substitute escaped braces `\\{}`
        // '\\{b}' -> '{b}'
        return match.charAt(0) === '\\' ? match.slice(1)
            :
                // '{a}' -> '1'
                ( params[name] != null ? params[name] : '');
    });
};