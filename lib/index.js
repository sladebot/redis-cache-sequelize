'use strict';


var Promise = require('bluebird');
var async = require('async');
var _ = require('lodash');
var redis = null;
var options = null;



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
  this.cachePrefix = options.cachePrefix || 'DARTH::';
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
  generateKey: function(type, _data) {
    
  },
  // Set cache prefix
  setCachePrefix: function(prefix) {
    this.cachePrefix = prefix;
    return this;
  },
  clearCacheKey: function() {
    console.log("OK");
    this.key = null;
    return this;
  },
  /**
   * @params - Takes 2 valid options - [ id, action ]
   */
  searchOne: function searchOne(options) {
    options = options || {};
    if(!options.id) {
     throw new Error("Please provide id"); 
    }
    var action = options.action || 'default';  
    this.key = this.cachePrefix + '::' + this.modelName.name.toString() + '::' + options.id  + '.' + action;
    var key = this.key;
    return new Promise(function promisify(resolve, reject) {
      return redis.get(key, function(err, result) {
        if(err) {
          return reject(err);
        }
        if(!result) {
          return resolve();
        }
        try {
          return resolve(JSON.parse(result));
        } catch(e) {
          return reject(e);
        }
      });
    })
  },
  
  searchScoped: function searchAll(options) {
    options = options || {};
    if(!options.action) {
      throw new Error("Please provide action");
    }
    var action = options.action;
    this.key = this.cachePrefix + '::' + this.modelName.name.toString() + '::' + action;
    var key = this.key;
    return new Promise(function promisify(resolve, reject) {
      return redis.get(key, function(err, result) {
        if(err) {
          return reject(err);
        }
        if(!result) {
          return resolve();
        }
        try {
          return resolve(JSON.parse(result));
        } catch(e) {
          return reject(e);
        }
      });
    });
    
  },
  
  setCache: function(_data) {
    var key = this.key;
    var ttl = this.ttl;
    return new Promise(function promisify(resolve, reject) {
      var res;
      try {
        res = JSON.stringify(_data)
      } catch(e) {
        return reject(e);
      }
      return redis.setex(key, ttl, res, function(err, res) {
        if(err) {
          return reject(err);
        }
        //TODO: Clear the cache key after setting a cache
        this.key = null;
        return resolve(res);
      })
    })
    
  }
  
}

