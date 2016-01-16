'use strict';


var Promise = require('bluebird');
var async = require('async');
var _ = require('lodash').runInContext();
var redis = null;
var options = null;
// var Util = require('./util');


module.exports = _init;

/**
 * Initializer
 * 
 * @param  {Object}       [options.cachePrefix] This will prefix every redis key with the string provided
 * @param  {Object}       [options.expiry] This will be used as expiry for the cache keys.
 */
function _init(_redis, options) {
  options = options || {};
  redis = _redis;
  return CacheStore;
}


/**
 * Constructor for cacher
 */
function CacheStore(model, options) {
  var options = options || {}
  if(!(this instanceof CacheStore)) {
    return new CacheStore(model);
  }
  this.modelName = model;
  this.cachePrefix = options.cachePrefix || 'DARTH';
  this.options = options;
  this.expired = false;
}

CacheStore.prototype = {
  // Connect
  connect: function connect() {},
  // Set expiry 
  ttl: function ttl(seconds) {
    this.ttl = seconds;
    return this;
  },
  // TODO: Move this to Util functions
  generateKey: function (options) {
    options = options || {}
    if(options.id) {
      return (this.cachePrefix + '::' + this.modelName.name.toString() + '::' + options.id); 
    } else if(options.action) {
      return (this.cachePrefix + '::' + this.modelName.name.toString() + '::' + options.action);
    } else if(options.pattern) {
      return (this.cachePrefix + '::' + this.modelName.name.toString() + '::' + options.pattern);
    } else {
      throw new Error("Key options not recognised")
    }
  },
  clearCacheKey: function() {
    this.key = null;
    return this;
  },
  /**
   * options.id required
   */
  searchOne: function searchOne(options) {
    options = options || {};
    if(!options.id) {
     throw new Error("Please provide id"); 
    }
    this.key = this.generateKey(options);
    var key = this.key;
    return new Promise(function promisify(resolve, reject) {
      return redis.getAsync(key)
        .then(function(result) {
          return resolve(result);
        })
        .catch(function(err) {
          return reject(err);
        });
    })
  },
  /**
   * options.action required
   */
  searchScoped: function searchScoped(options) {
    options = options || {};
    if(!options.action) {
      throw new Error("Please provide action");
    }
    this.key = this.generateKey(options);
    var key = this.key;
    return new Promise(function promisify(resolve, reject) {
      return redis.getAsync(key)
        .then(function(result) {
          return resolve(result);
        })
        .catch(function(err) {
          return reject(err);
        });
    });
    
  },
  /**
   * options.pattern required
   */
  searchPattern: function searchPattern(options) {
    options = options || {}
     if(!options.pattern) {
       throw new Error("Please provide a pattern to search keys with");
     }
     this.key = this.generateKey(options);
     var key = this.key;
     return new Promise(function promisify(resolve, reject) {
       return redis.keysAsync(key)
           .then(function(_keys) {
             var _get_promises = _.map(_keys, function(_key) {
               try {
                 //TODO: Make this async !!
                return redis.getAsync(_key); 
               } catch(e) {
                 return reject(e);
               }
            });
            return resolve(Promise.all(_get_promises));
           })
           .catch(function(err) {
             return reject(err);  
           })      
       
     }) 
  },
  
  expireOne: function(options) {
    options = options || {}
    if(!options.id) {
      throw new Error("Please enter id");
    }
    this.key = this.generateKey(options);
    var _key = this.key;

    return new Promise(function promisify(resolve, reject) {
      return redis.delAsync(_key)
        .then(function(_result) {
          return resolve(_result);
        })
        .catch(function(err) {
          return reject(err);
        })
    })
  },
  
  expirePattern: function(options) {
    options = options || {}
    if(!options.pattern) {
      throw new Error("Please enter pattern");
    }
    var self = this;
    var _key_pattern = self.generateKey(options);
      return new Promise(function promisify(resolve, reject) {
      return redis.keysAsync(_key_pattern)
        .then(function(_keys) {
          var _delete_promises = _.map(_keys, function(_key) {
            return redis.delAsync(_key);
          });
          return resolve(Promise.all(_delete_promises));
        })
        .catch(function(err) {
          return reject(err);
        })
    })
  },
  
  setCache: function(_data) {
    var key = this.key;
    var ttl = this.ttl;
    var self = this;
    return new Promise(function promisify(resolve, reject) {
      var data;
      try {
        // TODO: Make this async man 
        data = JSON.stringify(_data)
      } catch(e) {
        return reject(e);
      }
      
      return redis.setexAsync(key, ttl, data)
        .then(function(res) {
          self.clearCacheKey();
          return resolve(res);
        })
        .catch(function(err) {
          return reject(err);
        });
    })
    
  }
  
}

