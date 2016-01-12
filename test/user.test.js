var redis = require('redis');
var Sequelize = require('sequelize');
var should = require('should');
var expect = require('expect');
var initCacheStore = require("../lib");

var redisPort = process.env.REDIS_PORT || 6379;
var redisHost = process.env.REDIS_HOST;
var opts = {};

opts.database = process.env.DB_NAME || 'redis_cache_sequelize_test';
opts.username = process.env.DB_USER || 'postgres';
opts.password = process.env.DB_PASS;
opts.dialect = process.env.DB_DIALECT || 'postgres';
opts.logging = process.env.DB_LOG ? console.log : false;



/*global describe*/
/*global it*/
/*global before*/
/*global after*/

function onErr(err) {
  throw err;
}


describe("Reading current user from cache or writing it to cache if not present", function() {
  var db;
  var User;
  var instance;
  var cacheStore;
  
  // Create a user
  before(function(done) {
    redis = redis.createClient(redisPort, redisHost);
    db = new Sequelize(opts.database, opts.username, opts.password, opts);
    cacheStore = initCacheStore(redis, {cacheKey: 'DARTH'});
    
    User = db.define('User', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      }, 
      name: {
        type: Sequelize.STRING(255)
      }
    });
    
    User.sync({force: true})
      .then(function() {
        return done();
      })
      .catch(onErr);
  });
  
  it("Should not hit cache when data not present with the cacheKey", function(done) {
    var userCache = cacheStore(User)
                      .ttl(100);
    return userCache.searchOne({id: 1})
              .then(function(res) {  
                console.log(res);  
                should.not.exist(res);        
                return done();
              })
              .catch(function(err) {
                return done(err);
              });

  });
  
  
  
  
  
});
