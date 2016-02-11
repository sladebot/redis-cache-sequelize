/**
 * @author - Souranil Sen < souranil@gmail.com >
 * 
*/
'use strict';


const Promise = require('bluebird')
const _ = require('lodash').runInContext();
const errors = require("./errors");
var redis = null;
var options = null;
var globalNamespace;
// var Util = require('./util');


/**
 * Initializer
 * @constructor
 * @param  {Object}       [options.namespace] - This will prefix every redis key with the string provided
 * @param  {Object}       [options.expiry] - This will be used as expiry for the cache keys.
 * @returns {Object}      cacheStore - Returns a cacheStore object.
 *
 */
function _init(_redis, options) {
  options = options || {};
  redis = _redis;
  globalNamespace = options.namespace || "DARTH";
  return CacheStore;
}


/**
 * Represents a CacheStore with Redis
 * @class
 * @param  {Object}       model - a sequelize model is passed for caching.
 * @param  {integer}      [options.ttl=30000] - Sets the ttl for the cache object for the particular model.
 *
 * @example
 * var redisClient = redis.createClient(redisPort, redisHost);
 * db = new Sequelize(opts.database, opts.username, opts.password, opts);
 * cacheStore = cacheStore(redisClient, {namespace: 'XYZ'});
 *
 */
function CacheStore(model, options) {
  options = options || {}
  if(!(this instanceof CacheStore)) {
    return new CacheStore(model, options);
  }
  this.modelName = model;
  this.namespace = globalNamespace;
  this.ttl = options.ttl;
}


  /**
   * This generates the cache Key for specific scenarios -
   * - setCache by only id
   * - setCache by id & action
   *
   * @param options.action - The action for the model object for the cache key
   * @param options.id - This denotes the id of the sequelize model object.
   * @param options.all - If all the caches a particular model object is needed to be expired
   * @param options.expire_all - If the cache for ALL model objects is required to be expired
   *
   *
   * @example:
   *
   * Assuming the cachestore is for model 'User'
   *
   * * {id: 1} - DARTH::User::1
   * * {id: 1, action: 'current'} - DARTH::User::current::1
   * * {id: 1, all: true} - DARTH::User*1
   * * {expire_all: true} - DARTH::User*
   *  
   * @returns {string}
   */
  CacheStore.prototype.generateKey = function (options) {
    options = options || {}
    if(!options.id) {
      throw new Error("Please provide id");
    }
    if(options.expire_all) {
      return (this.namespace + "::" + this.modelName.name.toString() + "*")
    }
    if(options.action && options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + '::' + options.action + "::" + options.id);
    } else if(options.all && options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + "*" + options.id);
    } else if (options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + '::' + options.id);
    } else {
      throw new Error("Key options not recognised")
    }
  }

  /**
   * @deprecated
   * 
   * This method is used to generate keys for expiring patterns
   * 
   * @example:
   * Presuming the cacheStore is for the model User
   * 
   * {id: 1, pattern: '*'} - DARTH::User::*
   * 
   * @returns {string}
   */
  CacheStore.prototype.generatePatternKey = function(options) {
    options = options || {}
    if(!options.id) {
      throw new Error("Please provide id");
    }
    if(options.pattern && options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + '::' + options.pattern + options.id);
    }
      
  }
  
  /**
   * This method is used to search values for a cacheKey
   * 
   * @param options.id - This denotes the id of the sequelize model object to be searched.
   * @param options.action - The action for a particular sequelize model object to be searched.
   * @param options.all - Search all the cached objects for a particular sequelize model ( Needs id to be passed )
   * @param options.expire_all - Search all cached objects for any sequelize model ( Doesn't need id, returns all cached objects for that model.)
   *
   *
   * @example:
   *
   * Assuming the cachestore is for model 'User'
   *
   * * {id: 1} - DARTH::User::1
   * * {id: 1, action: 'current'} - DARTH::User::current::1
   * * {id: 1, all: true} - DARTH::User*1
   * * {expire_all: true} - DARTH::User*
   * 
   * @returns {Object} - A list of cached objects for the relevant key that is generated.
   */
  CacheStore.prototype.searchOne = function searchOne(options) {
    options = options || {};
    if(!options.id) {
     throw new Error("Please provide id");
    }
    var key = this.generateKey(options);
    return new Promise(function promisify(resolve, reject) {
      return redis.getAsync(key)
        .then(function(result) {
          return resolve(JSON.parse(result));
        })
        .catch(function(err) {
          return reject(err);
        });
    })
  }
  
  CacheStore.prototype.search = function(options) {
    
  }

  /**
   * options.action required
   */
  CacheStore.prototype.searchScoped = function searchScoped(options) {
    options = options || {};
    if(!options.action && !options.id) {
      throw new Error("Action and id both are required");
    }
    var key = this.generateKey(options);
    return new Promise(function promisify(resolve, reject) {
      return redis.getAsync(key)
        .then(function(result) {
          return resolve(JSON.parse(result));
        })
        .catch(function(err) {
          return reject(err);
        });
    });

  }
  
  /**
   * options.pattern required
   */
  CacheStore.prototype.searchPattern = function searchPattern(options) {
    options = options || {}
     if(!options.pattern && !options.id) {
       throw new Error("Please provide a pattern & id to search keys with");
     }
     var key = this.generatePatternKey(options);
     return new Promise(function promisify(resolve, reject) {
       return redis.keysAsync(key)
           .then(function(_keys) {
             var _get_promises = _.map(_keys, function(_key) {
               try {
                return redis.getAsync(_key);
               } catch(e) {
                 return reject(e);
               }
            });
            return Promise.all(_get_promises);
           })
           .then(function(_results) {
             return resolve(_results);
           })
           .catch(function(err) {
             return reject(err);
           })

     })
  }

  CacheStore.prototype.expireOne = function(options) {
    options = options || {}
    if(!options.id) {
      throw new Error("Please enter id");
    }
    var _key = this.generateKey(options);

    return new Promise(function promisify(resolve, reject) {
      return redis.delAsync(_key)
        .then(function(_result) {
          return resolve(_result);
        })
        .catch(function(err) {
          return reject(err);
        })
    })
  }

  CacheStore.prototype.expirePattern = function(options) {
    options = options || {}
    if(!options.pattern && !options.id) {
      throw new Error("Please enter pattern & id");
    }
    var _key_pattern = this.generatePatternKey(options);
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
  }

  // Cache should never be set with a pattern !
  CacheStore.prototype.setCache =  function(_data, options) {
    options = options || {}
    if(!options.id && options.pattern) {
      throw new Error("Please enter id :");
    }
    var key = this.generateKey(options);
    var ttl = this.ttl;
    var self = this;
    return new Promise(function promisify(resolve, reject) {
      var data;
      try {
        data = JSON.stringify(_data)
      } catch(e) {
        return reject(e);
      }

      return redis.setexAsync(key, ttl, data)
        .then(function(res) {
          return resolve(res);
        })
        .catch(function(err) {
          return reject(err);
        });
    })

  }

module.exports = _init;