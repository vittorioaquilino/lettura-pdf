var request = require('request')
var assign = Object.assign || require('object-assign');
var memoize = require('memoizee');

var authHeaders = { 'X-Parse-Application-Id': process.env.PARSE_APPLICATION_ID, 'X-Parse-REST-API-Key' : process.env.PARSE_REST_API_KEY };
var masterHeaders = { 'X-Parse-Application-Id': process.env.PARSE_APPLICATION_ID, 'X-Parse-Master-Key' : process.env.PARSE_MASTER_KEY }
console.log(authHeaders);

if (process.env.PARSE_REST_API_KEY === undefined) throw new Error('No parse key');

var handler = function(cb, err, response, body) {
    if (err) return cb(err);
    if (!(response.statusCode && response.statusCode.toString().length === 3 && response.statusCode.toString()[0] === '2')) return (cb(body));
    if (body && body.results) return cb(null, body.results);
    return cb(null, body);
}

module.exports.add = function(table, user, cb) {
  var options = {method: 'POST', uri: 'https://api.parse.com/1/users', json: true, body: user, headers : authHeaders};
  request(options, handler.bind(this, cb));
}

module.exports.all = function(cb) {
  var options = {method: 'GET', uri: 'https://api.parse.com/1/users', json: true, headers : masterHeaders};
  request(options, handler.bind(this, cb));
}

module.exports.get = function(username, cb) {
  var options = {method: 'GET', uri: 'https://api.parse.com/1/users', json: true, headers : masterHeaders,
                 qs: {'where' : JSON.stringify({username:username}) }};
  request(options, handler.bind(this, function(err, res) { if (err) return cb(err); return cb(null, res[0]);}))
}

module.exports.find = function(where, cb) {
  var options = {method: 'GET', uri: 'https://api.parse.com/1/users', json: true, headers : masterHeaders,
                 qs: {'where' : JSON.stringify(where) }};
  request(options, handler.bind(this, function(err, res) { if (err) return cb(err); return cb(null, res[0]);}))
}

module.exports.login = function(username, password, cb) {
  var options = {method: 'GET', uri: 'https://api.parse.com/1/login', json: true, headers : masterHeaders,
                 qs: {username:username, password:password} };
  request(options, handler.bind(this, cb));
}

module.exports.update = function(id, updates, cb) {
  var options = {method: 'PUT', uri: 'https://api.parse.com/1/users/'+id, json: true, headers : masterHeaders, body:updates};
  request(options, handler.bind(this, cb));
}

module.exports.checkToken = function(token, cb) {
  var options = {method : 'GET', headers: assign({'X-Parse-Session-Token': token}, authHeaders),
    uri : 'https://api.parse.com/1/users/me', json: true };
  var callback = function(err, resp) {
    if (err) return cb(null);
    cb(null, resp);
  };
  request(options, handler.bind(this, callback));
}

var fast = {};
Object.keys(module.exports).map(function(fname) {
  fast[fname] = memoize(module.exports[fname], { async: true, maxAge: 1000*3600 });
  module.exports.fast = fast;
})

module.exports.auth = function (req, res, next) {
  var cb = function(err, user) {
    console.log(err, user);
    if (err || !user) {
      res.status(403);
      res.json({});
      return;
    } else {
      req.username = user.username;
      req.user = user;
      req.userId = user.objectId;
      return next();
    }
  }
  var token = req.query.token || req.body.token;
  console.log(token);
  if (token) {
    module.exports.checkToken(token, cb);
  } else {
    res.status(403);
    res.json({ status : 403 });
  }
}
