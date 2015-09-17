var postcss = require('postcss');
var url = require('postcss-url');
var cssnano = require('cssnano');

// it's bad to do this in general, as code is now heavily environment specific
var fs = System._nodeRequire('fs');
var path = System._nodeRequire('path');

function escape(source) {
  return source
    .replace(/(["\\])/g, '\\$1')
    .replace(/[\f]/g, "\\f")
    .replace(/[\b]/g, "\\b")
    .replace(/[\n]/g, "\\n")
    .replace(/[\t]/g, "\\t")
    .replace(/[\r]/g, "\\r")
    .replace(/[\u2028]/g, "\\u2028")
    .replace(/[\u2029]/g, "\\u2029");
}

var isWin = process.platform.match(/^win/);

function fromFileURL(address) {
  address = address.replace(/^file:(\/+)?/i, '');

  if (!isWin)
    address = '/' + address;
  else
    address = address.replace(/\//g, '\\');

  return address;
}

var cssInject = "(function(c){if (typeof document == 'undefined') return; var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})";

module.exports = function bundle(loads, opts) {

  var loader = this;

  var stubDefines = loads.map(function(load) {
    return "System\.register('" + load.name + "', [], false, function() {});";
  }).join('\n');

  var rootURL = loader.rootURL || fromFileURL(loader.baseURL);

  var outFile = loader.separateCSS ? opts.outFile.replace(/\.js$/, '.css') : rootURL;
  
  var postCSS = postcss([url({url: "copy"}), cssnano()]);
  
  var cssOutput = loads.reduce(function(content, load) {
    var fromFile = fromFileURL(load.address);
    var css = fs.readFileSync(fromFile);
     
     content += postCSS.process(css, {
       from: fromFile,
       to: outFile
     }).css;
     
    return content;  
  }, '');
  
  // write a separate CSS file if necessary
  if (loader.separateCSS) {
    

    fs.appendFileSync(outFile, cssOutput);

    return stubDefines;
  }

  return [stubDefines, cssInject, '("' + escape(cssOutput) + '");'].join('\n');
};
