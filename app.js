var express = require('express');
var async = require('async');
var https = require('https');

var port = 8001;

var user = {
	user : 'username',
	password : 'password'
};
var bcconfig = {
	protocol : 'https',
	project : 12345, //2280704
	path : 'api/v1',
	host : 'basecamp.com'
};
var employees = {
	sam : {
		id : 4712810
	},
	roger : {
		id : 4859022
	},
	jobey : {
		id : 6825815
	}
};

var server = express();
server.use(express.static(__dirname + '/public'));
server.use(express.bodyParser());

server.get('/todosopen', function(req, res) {
	var obj = {};
    var graph = {};

    graph.title = 'Open by Project';
    graph.type = 'bar';
    graph.datasequences = [];
    graph.datasequences[0] = {};
    var seq = {
        title : 'Todos',
        // refreshEveryNSeconds : 20,
        color : 'blue',
        datapoints : []
    }
    graph.datasequences[0] = seq;

    // GET and parse data
	async.waterfall([
		function(callback) {
			getURL('projects.json', [], callback);
		},
		function(arg1, callback) {
			var projids = [];
			async.each(arg1, function(proj, callback) {
				projids.push({
					id : proj.id,
					name : proj.name
				});
			});
			callback(null, projids);
		},
		function(arg1, callback) {
			var todolists = [];
			async.each(arg1, function(projid, ecallback) {
				async.waterfall([
					function(callback) {
						var todourl = 'projects/' + projid.id + '/todolists.json';
						getURL(todourl, [], callback); ///projects/1/todolists.json
					},
					function(arg1, callback) {
						todolists.push({
							obj : arg1,
							name : projid.name
						});
						ecallback();
					}
				]);
			}, function(err) {
				if (err) console.log('err!');
				var count = 0;
				async.each(todolists, function(list, acallback) {
					async.each(list.obj, function(lst, bcallback) {
						// var nm = (list.name.length > 18) ? list.name.substring(0, 15) + '...' : list.name;
						var nm = list.name;
						var rem = lst.remaining_count;
				        graph.datasequences[0].datapoints[count] = {
				            title : nm,
				            value : rem
				        };
				        count += 1;
						bcallback();
					}, function(err) {
						acallback();
					});
				}, function(err) {
					obj.graph = graph;
    				res.send(JSON.stringify(obj));
    				res.end();
				});
			});
		}
	]);
});

server.get('/todosperson', function(req, res) {
	var name = req.query.person.toLowerCase();
	var id = employees[name].id;
	async.waterfall([
		function(callback) {
			getURL('people/' + id + '/assigned_todos.json', [], callback);
		},
		function(arg1, callback) {
			var todos = [];
			async.each(arg1, function(todo, acallback) {
				async.each(todo.assigned_todos, function(assgn, bcallback) {
					todos.push({
						title : assgn.content
					});
					bcallback();
				}, function(err) {
					acallback();
				});
			});
			var resp = {
				name : name,
				todos : todos
			};
			res.send(resp);
			res.end();
		}
	]);
});

server.get('/calendar', function(req, res) {
	async.waterfall([
		function(callback) {
			getURL('projects.json', [], callback);
		},
		function(arg1, callback) {

			res.send(200);
			res.end();
		}
	]);
});

server.get('/events', function(req, res) {
	async.waterfall([
		function(callback) {
			getURL('events.json', [], callback);
		},
		function(arg1, callback) {
			var events = [];
			async.each(arg1, function(evt, callback) {
				events.push({
					name : evt.creator.name,
					summary : evt.summary,
					excerpt : evt.excerpt,
					avatar_url : evt.creator.avatar_url,
					html_url : evt.html_url
				});
				callback();
			}, function(err) {
				if (err) console.log('Error: ' + err);
				res.send(JSON.stringify(events));
				res.end();
			});
		}
	]);
});

function getURL(path, parms, callback) {
	var body = '';
	var options = getReqOptions(path, parms);
	var request = https.request(options, function(resp) {
		resp.setEncoding('utf8');
		resp.on('data', function (chunk) {
			body += chunk;
		});
		resp.on('end', function () {
			result = JSON.parse(body);
			callback(null, result);
		});
	}).on('error', function(err) {
		console.log('Error: ' + err);
	});

	request.end();
}

function getReqOptions(path, parmarr) {
	var parms = '';
	async.each(parmarr, function(parm, callback) {
		parms += parm.name;
		parms += '=';
		parms += parm.value;
		parms += '&';
	})
	return {
		host : bcconfig.host,
		path : '/' + bcconfig.project + '/' + bcconfig.path + '/' + path + '?' + parms,
		method : 'GET',
		auth : user.user + ':' + user.password,
		headers : {
			'User-Agent:' : 'Node.JS'
		}
	};
}

server.listen(port);
