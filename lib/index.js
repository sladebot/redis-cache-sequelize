'use strict';


var Promise = require('bluebird');
var async = require('async');
var _ = require('lodash').runInContext();
var redis = null;
var options = null;
var globalNamespace;
// var Util = require('./util');


module.exports = _init;

/**
 * Initializer
 *
 * @param  {Object}       [options.namespace] This will prefix every redis key with the string provided
 * @param  {Object}       [options.expiry] This will be used as expiry for the cache keys.
 */
function _init(_redis, options) {
  options = options || {};
  redis = _redis;
  globalNamespace = options.namespace || "DARTH";
  return CacheStore;
}


/**
 * Constructor for cacher
 * @param  {integer}      [options.ttl=30000] Sets the ttl for the cache object for the particular model
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
  this.expired = false;
}

CacheStore.prototype = {
  generateKey: function (options) {
    options = options || {}
    if(!options.id) {
      throw new Error("Please provide id");
    }
    if(options.action && options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + '::' + options.action + "::" + options.id);
    } else if(options.pattern && options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + '::' + options.pattern + "::" + options.id);
    } else if (options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + '::' + options.id);
    } else {
      throw new Error("Key options not recognised")
    }
  },
  /**
  * This is for pattern keys. For specific patterns we miss out the parent because of
  * using ::, this method will take care of that.
  */
  generatePatternKey: function(options) {
    options = options || {}
    if(!options.id) {
      throw new Error("Please provide id");
    }
    if(options.pattern && options.id) {
      return (this.namespace + '::' + this.modelName.name.toString() + '::' + options.pattern + options.id);
    }
  },
  /**
   * options.id required
   */
  searchOne: function searchOne(options) {
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
  },
  /**
   * options.action required
   */
  searchScoped: function searchScoped(options) {
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

  },
  /**
   * options.pattern required
   */
  searchPattern: function searchPattern(options) {
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
  },

  expireOne: function(options) {
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
  },

  expirePattern: function(options) {
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
  },

  // Cache should never be set with a pattern !
  setCache: function(_data, options) {
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

}
