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

var db;
var cacheStore;


opts.database = process.env.DB_NAME || 'redis_cache_sequelize_test';
opts.username = process.env.DB_USER || 'postgres';
opts.password = process.env.DB_PASS;
opts.dialect = process.env.DB_DIALECT || 'postgres';
opts.logging = process.env.DB_LOG ? console.log : false;

describe("Caching Disabled: ", function() {
  var User;
  var currentUser;
  
  // Create a user
  before(function(done) {
    var redisClient = redis.createClient(redisPort, redisHost);
    db = new Sequelize(opts.database, opts.username, opts.password, opts);
    cacheStore = initCacheStore(redisClient, {namespace: 'XYZ'});
    
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
    }, {
      instanceMethods: {
        toApi: function() {
          return {
            name: this.name
          }
        }.bind(this)
      }
    });
    
    User.sync({force: true})
      .then(function() {
        return createTestUser();
      })
      .catch(function(_err) {
        return done(_err);
      });
      
    function createTestUser() {
     return User.create({
        name: 'TestUser'
      })
      .then(function(_user) {
        currentUser = _user;
        return done();
      })
      .catch(function(_err) {
        return done(_err);
      }) 
    }
  });
  
  
  /**
   * Destroys all users and expires all caches
   */
  after(function(done) {
    var userCache = cacheStore(db.models.User, {ttl: 50000, enabled: false});
    debugger;
    function expireAllCache() {
      return new Promise(function promisify(resolve, reject) {
        return userCache.expire({expire_all: true})
          .then(function(_status) {
            resolve(_status);
          })
          .catch(function(_err) {
            reject(_err);
          })
      })
    }
    
    db.models.User.destroy({
      paranoid: false,
      force: true,
      reset: true,
      where: {}
    })
    .then(function(_result) {
      return expireAllCache();
    })
    .then(function(_status) {
      return done();
    })
    .catch(function(err) {
      return done(err);
    });
  });
  
  
  describe("#setCache", function() {

    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return done();
    });
    
    after(function(done) {
      userCache.expire({expire_all: true})
          .then(function(_status) {
            done();
          })
          .catch(function(_err) {
            done(_err);
          });
    })
    
    it("Should not exist in cache initially", function(done) {
      return User.findById(currentUser.id)
        .then(function(_user) {
          return userCache.search({id: _user.id})
        })
        .then(function(_cachedUser) {
          should(_cachedUser).be.null;
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        })
    })

    it("Should not set cache with just id ", function(done) {
      return User.findById(currentUser.id)
        .then(function(_user) {
          return userCache.setCache(_user, {id: _user.id}).return(_user);
        })
        .then(function(_user) {
          return userCache.search({id: _user.id});
        })
        .then(function(_cachedUser) {
          should(_cachedUser).be.null;
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    })
    
    it("Should not be able to set cache with id and action", function(done) {
      return User.findAll({})
        .then(function(_users) {
          return userCache.setCache([_users], {id: currentUser.id, action: 'all'});
        })
        .then(function(_data) {
          return userCache.search({id: currentUser.id, action: 'all'});
        })
        .then(function(_cachedUsers) {
          _cachedUsers.should.be.empty;
          return done()
        })
        .catch(function(_err) {
          return done(_err);
        })
    });
    
    it("Should not set cache if there is no id", function(done) {
      return User.findAll({})
        .then(function(_users) {
          userCache.setCache.should.throw(Error);
          return done()
        })
        .catch(function(_err) {
          return done(_err);
        })
    });
  });
  
  describe("#search with cached data", function() {
    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return User.findById(currentUser.id)
        .then(function(_user) {
          return userCache.setCache(_user, {id: currentUser.id}).return(_user);
        })
        .then(function(_user) {
          userCache.setCache([_user], {id: currentUser.id, action: 'all'});
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    });
    
    after(function(done) {
      userCache.expire({expire_all: true})
        .then(function(_status) {
          done();
        })
        .catch(function(_err) {
          done(_err);
        });
    });
    
    it("Should not fetch currentUser when searched only with id - {id: id}", function(done) {
      return userCache.search({id: currentUser.id})
        .then(function(_cachedUser) {
          should(_cachedUser).not.exist;
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("Should not fetch currentUser when searched only with id and action - {id: id, action: 'action'}", function(done) {
      return userCache.search({id: currentUser.id, action: 'all'})
        .then(function(_cachedUsers) {
          _cachedUsers.should.be.empty;
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("Should not fetch all cached users for a particular user", function(done) {
      return userCache.search({id: currentUser.id, all: true})
        .then(function(_cachedUsers) {
          _cachedUsers.should.be.empty;
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        })
    });
  });
  
  describe("Legacy - #searchOne", function() {
    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return User.findById(currentUser.id)
        .then(function(_user) {
          userCache.setCache(_user, {id: currentUser.id}).return(_user);
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    });
    
    after(function(done) {
      userCache.expire({expire_all: true})
        .then(function(_status) {
          done();
        })
        .catch(function(_err) {
          done(_err);
        });
    });
    
    it("Should not hit cache when data present with the cacheKey with searchOne", function(done) {
      var userCache = cacheStore(User, {ttl: 300, enabled: false});
      return userCache.searchOne({id: 1})
        .then(function(_cachedUser) {  
          should(_cachedUser).not.exist;        
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
  });
  
  
  describe("Legacy - #searchScoped", function() {
    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return User.findById(currentUser.id)
        .then(function(_user) {
          return userCache.setCache(_user, {id: currentUser.id}).return(_user);
        })
        .then(function(_user) {
          userCache.setCache([_user], {id: currentUser.id, action: 'all'});
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    });
    
    after(function(done) {
      userCache.expire({expire_all: true})
        .then(function(_status) {
          done();
        })
        .catch(function(_err) {
          done(_err);
        });
    });
    
    it("should write to cache if key is not present and called with proper actions", function(done) {
      var userCache = cacheStore(User, {ttl: 300, enabled: false})         
      return userCache.searchScoped({action: 'all', id: 1})
        .then(function(_cachedUser) {
          should(_cachedUser).not.exist;
          return done();
        })
        .catch(function(err) {
          done(err);
        })
    });
  });
  
  describe("Legacy - #searchPattern", function() {
    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return User.findById(currentUser.id)
        .then(function(_user) {
          return userCache.setCache(_user, {id: currentUser.id}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache([_user], {id: currentUser.id, action: 'all'}).return(_user);
        })
        .then(function(_user) {
          userCache.setCache([_user], {id: currentUser.id, action: 'connections'});
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    });
    
    after(function(done) {
      userCache.expire({expire_all: true})
        .then(function(_status) {
          done();
        })
        .catch(function(_err) {
          done(_err);
        });
    });
    
    it("Should hit cache when data present with the cacheKey with searchScoped", function(done) {
      var userCache = cacheStore(User, {ttl: 300, enabled: false})
      return userCache.searchPattern({pattern: "*", id: 1})
        .then(function(_users) {  
          should.exist(_users);
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
  });
  
  
  describe("#search should not hit cache when not present", function() {
    after(function(done) {
      userCache.expire({expire_all: true})
        .then(function(_status) {
          done();
        })
        .catch(function(_err) {
          done(_err);
        });
    });
    
    it("Should not fetch currentUser when searched only with id - {id: id}", function(done) {
      return userCache.search({id: currentUser.id})
        .then(function(_cachedUser) {
          should(_cachedUser).not.exist;
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
  });
  
  describe("#expire", function() {
    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return User.findById(currentUser.id)
        .then(function(_user) {
          return userCache.setCache(_user, {id: currentUser.id}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache(_user, {id: 2}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache(_user, {id: 3}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache([_user], {id: 2, action: 'all'}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache([_user], {id: 2, action: 'all'}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache([_user], {id: currentUser.id, action: 'connections'}).return(_user);
        })
        .then(function(_user) {
          userCache.setCache([_user], {id: currentUser.id, action: 'all'});
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    });
    
    it("Should expire a single key with - {id: id} format", function(done) {
      return userCache.expire({id: currentUser.id})
        .then(function(_status) {
          _status.should.be.empty;
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("Should expire a single key with - {id: id, action: action} format", function(done) {
      return userCache.expire({id: currentUser.id, action: 'all'})
        .then(function(_status) {
          _status.should.be.empty;
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("Should expire all keys for that user - {id: id, all: true} format", function(done) {
      return userCache.expire({id: currentUser.id, all: true})
        .then(function(_status) {
          _status.should.be.empty;
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
    
    it("Should expire all keys for that user - {id: id, all: true} format", function(done) {
      return userCache.expire({expire_all: true})
        .then(function(_status) {
        _status.should.be.empty;
          return done();
        })
        .catch(function(err) {
          return done(err);
        });
    });
  });
  
  describe("Legacy - #expireOne", function() {
    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return User.findById(currentUser.id)
        .then(function(_user) {
          userCache.setCache(_user, {id: currentUser.id}).return(_user);
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    });
    
    it("Should expire one cache with #expireOne - {id: id}", function(done) {
      var userCache = cacheStore(User, {ttl: 300})
        return userCache.expireOne({id: currentUser.id})
          .then(function(_status) {
            _status.should.be.empty;
            return done();
          })
          .catch(function(err) {
            return done(err);
          });
    });
  })
  
  describe("Legace - #expirePattern", function() {
    before(function(done) {
      userCache = cacheStore(db.models.User, {ttl: 800, enabled: false});
      return User.findById(currentUser.id)
        .then(function(_user) {
          return userCache.setCache(_user, {id: currentUser.id}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache(_user, {id: 2}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache(_user, {id: 3}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache([_user], {id: 2, action: 'all'}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache([_user], {id: 2, action: 'all'}).return(_user);
        })
        .then(function(_user) {
          return userCache.setCache([_user], {id: currentUser.id, action: 'connections'}).return(_user);
        })
        .then(function(_user) {
          userCache.setCache([_user], {id: currentUser.id, action: 'all'});
          return done();
        })
        .catch(function(_err) {
          return done(_err);
        });
    });
    
    after(function(done) {
      userCache.expire({expire_all: true})
        .then(function(_status) {
          done();
        })
        .catch(function(_err) {
          done(_err);
        });
    });
    
    it("Should expire all keys matching the pattern", function(done) {
      var userCache = cacheStore(User, {ttl: 300})
      return userCache.expirePattern({pattern: "all*", id: 1})
        .then(function(_status) {
          _status.should.be.empty;     
          done()
        })
        .catch(function(err) {
          done(err);
        });
    });  
  });
  })
