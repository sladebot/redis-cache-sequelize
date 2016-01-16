Promise = require('bluebird');
var redis = Promise.promisifyAll(require("redis"));
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
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
    var redisClient = redis.createClient(redisPort, redisHost);
    db = new Sequelize(opts.database, opts.username, opts.password, opts);
    cacheStore = initCacheStore(redisClient, {cacheKey: 'DARTH'});
    
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
  
  afterEach(function(done) {
    User.truncate({
      cascaded: true
    });
    done();
  });
  
  describe("#searchOne", function() {
    it("Should not hit cache when data not present with the cacheKey with searchOne", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.searchOne({id: 1})
        .then(function(res) {  
          should.not.exist(res);        
          return done();
        })
        .catch(function(err) {
          return done(err);
        });

    });
    
    it("Should write to cache when called with proper key with searchOne", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
                        
      return userCache.searchOne({id: 1, action: 'current'})
        .then(function(res) {
          return res;
        })           
        .then(function(res) {
          if(res) {
            return res;
            done();
          } else {
          return User.create({
            name: 'SearchOneTestUser'
          }); 
          }
        })
        .then(function(_user) {
          should.exist(_user);
          return _user;
        })           
        .then(function(_user) {
          var cached = userCache.setCache(_user);
          should.exist(cached);
          done()
        })
        .catch(function(err) {
          done(err);
        })
        
    });
    
    it("Should hit cache when data present with the cacheKey with searchOne", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.searchOne({id: 1, action: 'current'})
        .then(function(res) {  
          should.exist(res);        
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
  });
  
  describe("#searchScoped", function() {
    it("Should not hit cache when data is not present with searchScoped", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.searchScoped({action: 'active'})
        .then(function(res) {
          should.not.exist(res);        
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("should write to cache if key is not present and called with proper actions", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
                        
      return userCache.searchScoped({action: 'all'})
        .then(function(res) {
          return res;
        })           
        .then(function(res) {
          if(res) {
            return res;
            done();
          } else {
          return User.create({
            name: 'ScopedTestUser'
          }); 
          }
        })
        .then(function(_user) {
          should.exist(_user);
          return _user;
        })           
        .then(function(_user) {
          var cached = userCache.setCache(_user);
          should.exist(cached);
          done()
        })
        .catch(function(err) {
          done(err);
        })
    });
    
    it("Should hit cache when data present with the cacheKey with searchScoped", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.searchScoped({action: 'all'})
        .then(function(res) {  
          should.exist(res);        
          return done();
        })  
        .catch(function(err) {
          return done(err);
        });
    });
    
  });
  
  describe("#searchPattern", function() {
    it("should not hit cache if it cannot find a pattern", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.searchPattern({pattern: "1232all*"})
        .then(function(res) {  
          res.length.should.equal(0);        
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("Should hit cache when data present with the cacheKey with searchScoped", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.searchPattern({pattern: "*"})
        .then(function(_users) {  
          should.exist(_users);
          done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
  });
  
  
  describe("#expireOne", function() {
    it("Should expire one particular key", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.expireOne("DARTH::::User::1.current")
        .then(function(_status) {  
          _status.should.be.true
          done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("Should not expire anything if key doesn't match", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
      return userCache.expireOne("DARTH::SampleWrongKey")
        .then(function(_status) {  
          _status.should.be.false
          done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
  });
  
  describe("#expirePattern", function() {
    it("Should expire all keys matching the pattern", function(done) {
      var userCache = cacheStore(User)
                        .ttl(100);
             
      return userCache.expirePattern("DARTH*")
        .then(function(_status) {
          _status.should.be.an.Array;
          _status.should.containEql(1);     
          done()
        })
        .catch(function(err) {
          done(err);
        })
    })
  })
  
  
  
});
