var program = require('commander');
var async = require('async');
var config = require('../config');
var path = require('path');
var gaikan = require('gaikan');
var fs = require('fs');

var data = {
	taracot_port : config.port,
	taracot_ip   : '127.0.0.1',
	dir 		 : path.join(__dirname, '..').replace(/\\/g, '/'),
	listen_ip    : '127.0.0.1',
	listen_port  : '80',
	servername   : '',
	pname		 : ''
};

program
  .version(config.taracotjs)
  .parse(process.argv);

async.series([
		function (callback) {
			console.log("This script will generate NGINX server config and init.d/monit scripts for you.\n");
			program.confirm('Continue? ', function(ok){
				if (ok) {
					callback();
				} else {
					console.log("\n\nAborted");
					process.exit(code = 0);
				}
			});
		},
		function (callback) {
			program.prompt('\nAn IP address NGINX will listen to: ', function(_ip){
			  	if (!_ip) {
			  		return callback("You have to set the listen IP.");
			  	}
			  	data.listen_ip = _ip;
			  	console.log('* NGINX will listen to IP address: ' + data.listen_ip);
			  	callback();
			});
		},
		function (callback) {
			program.prompt('\nA port NGINX will listen to [80]: ', function(_port){
			  	if (_port) data.listen_port = _port;
			  	console.log('* NGINX will listen to port: ' + data.listen_port);
			  	callback();
			});
		},
		function (callback) {
			program.prompt('\nServer name(s), separated by space: ', function(_servername){
			  	if (!_servername) {
			  		return callback("You have to set the server name(s).");
			  	}
			  	data.servername = _servername;
			  	console.log('* Server name(s) set to: ' + data.servername);
			  	var fns = data.servername.split(' ');
				data.pname = fns[0].replace(/\./g, '_').replace(/\-/g, '_');
			  	callback();
			});
		},
		function (callback) {
			console.log("\nGenerating NGINX configuration file...");
			var nginx_render = gaikan.compileFromFile('nginx.template');
			var nginx = nginx_render(gaikan, data, undefined);
			fs.writeFile("./nginx/" + data.pname + '.conf', nginx, function(err) {
			    if(err) {
			        return callback(err);
			    } else {
			        console.log("\nThe file " + data.pname + ".conf was saved!");
			        callback();
			    }
			});
		},
		function (callback) {
			console.log("\nGenerating init.d script...");
			var initd_render = gaikan.compileFromFile('initd.template');
			var initd = initd_render(gaikan, data, undefined);
			var filename = data.pname.replace(/\./g, '_');
			fs.writeFile("./init.d/taracot-" + filename, initd, function(err) {
			    if(err) {
			        return callback(err);
			    } else {
			        console.log("\nThe file " + filename + " was saved!");
			        callback();
			    }
			});
		},
		function (callback) {
			console.log("\nGenerating monit script...");
			var monit_render = gaikan.compileFromFile('monit.template');
			var monit = monit_render(gaikan, data, undefined);
			var filename = data.pname.replace(/\./g, '_');
			fs.writeFile("./monit/" + filename + '.monit', monit, function(err) {
			    if(err) {
			        return callback(err);
			    } else {
			        console.log("\nThe file " + filename + ".monit was saved!");
			        callback();
			    }
			});
		}
	],
	function (err) {
		if (err) {
			console.log("\nScript failed");
			console.log(err);
			process.exit(1);
		}
		console.log("\nFinished");
		process.exit(code = 0);
	}
);