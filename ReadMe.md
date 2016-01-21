# Redis Cache for Sequelize

[![Build Status](https://travis-ci.org/sladebot/redis-cache-sequelize.svg?branch=master)](https://travis-ci.org/sladebot/redis-cache-sequelize) [![Dependency Status](https://david-dm.org/sladebot/redis-cache-sequelize.svg)](https://david-dm.org/sladebot/redis-cache-sequelize.svg) [![Code Climate](https://codeclimate.com/github/sladebot/redis-cache-sequelize/badges/gpa.svg)](https://codeclimate.com/github/sladebot/redis-cache-sequelize)


This helps in caching sequelize objects in redis based on 3 strategies and not queries


#### Initialization and configuration

- It is basically namespaced globally and you can do that by providing options.namespace while initializing the cacheStore :

```javascript

  var initCacheStore = require("redis-cache-sequelize");
  var cacheStore = initCacheStore(redisClient, {namespace: 'VADER'});

```

- We are using sequelize models for using this as of now.

```javascript

	var redisClient = redis.createClient(redisPort, redisHost);
    db = new Sequelize(opts.database, opts.username, opts.password, opts);
    cacheStore = initCacheStore(redisClient, {namespace: 'VADER'});

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
        }
      }
    });

    User.sync({force: true})
      .then(function() {
        return done();
      })
      .catch(onErr);


	var userCache = cacheStore(User)
                .ttl(100);

```

#### Searching in Cache

##### searchOne

This basically searches based on the id of the object, a global namespace is present which is set while initializing the cache and apart from that the model name is used as the secondary namespace. For example :

Global Namespace : ```javascript VADER ```
Model: ```javascript User ```
id: ```javascript 1 ```

The key will be formed as ```javascript VADER::User::1 ```

- Usage

```javascript
userCache.searchOne({id: 1})
    .then(function(result) {  
      /** */
    })
```

##### searchScoped

This basically searches based on actions / methods or however you set the keys. It's agostic of that at the moment intentionally.

Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
Scope/Method/Action: ```javascript ALL ```
id:                  ```javascript 1 ```

The key will be formed as ```javascript VADER::USER::ALL::1 ```

- Usage

```javascript
userCache.searchScoped({action: 'ALL', id: 1})
    .then(function(result) {  
      /** */
    })
```

##### searchPattern

This searches all keys based on the pattern provided

Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
id:                  ```javascript 1 ```
Pattern:             ```javascript "*" ```

The key will be formed as ```javascript VADER::USER::1::* ```

- Usage

```javascript
userCache.searchPattern({action: '*', id: 1})
    .then(function(result) {  
      /** */
    })
```

#### Cache Expiry

##### expireOne

This expires a particular value based on the key generated from what you pass in options.

Global Namespace : ```javascript VADER ```
Model: ```javascript User ```
id: ```javascript 1 ```

The key will be formed as ```javascript VADER::User::1 ```

- Usage

```javascript
userCache.expireOne({id: 1})
    .then(function(result) {  
      /** */
    })
```


#### setCache


#### setCache with id only
You can set cache which always needs an id and / or with action. Pattern is
restricted while setting cache for obvious reasons.

Global Namespace : ```javascript VADER ```
Model: ```javascript User ```
id: ```javascript 1 ```

The key will be formed as ```javascript VADER::User::1 ```

- Usage

```javascript
userCache.setCache(_datam, {id: 1})
    .then(function() {  
      /** success */
    })
```


#### setCache with id and action
Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
id:                  ```javascript 1 ```
Pattern:             ```javascript "all" ```

The key will be formed as ```javascript VADER::USER::ALL::1 ```

- Usage

```javascript
userCache.setCache(_data, {action: 'all', id: 1})
    .then(function() {  
      /** success */
    })
```




##### More coming soon ...

##### Check tests for more details.
