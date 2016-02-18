# Redis Cache for Sequelize

[![Build Status](https://travis-ci.org/sladebot/redis-cache-sequelize.svg?branch=master)](https://travis-ci.org/sladebot/redis-cache-sequelize) [![Dependency Status](https://david-dm.org/sladebot/redis-cache-sequelize.svg)](https://david-dm.org/sladebot/redis-cache-sequelize) [![Code Climate](https://codeclimate.com/github/sladebot/redis-cache-sequelize/badges/gpa.svg)](https://codeclimate.com/github/sladebot/redis-cache-sequelize)


This helps in caching sequelize objects in redis based on 3 strategies and not queries. There are methods like `` #search `` , `` #setCache`` and `` #expire `` for handling your caches based on ``id``, ``action`` for setting caches and searching based on ``id``, ``action``, ``all`` and expiry based on ``id``, ``action`` and ``all``. These caches are in context of some object and are not global. For example: 

- A cache for the api response ``/users/connections`` for User with id 1 will be different than that of the User with id 2. 


##### Initialization and configuration

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
    /**
    * enabled - decides if this cacheStore will enable caching or not. 
    * ttl - Time to live for the redis objects. After that the entire cacheStore expires.
    */
    var userCache = cacheStore(User, {ttl: 500, enabled: true});

```


#### Setting Cache:

`` #setCache `` returns a promise that resolves by successfully setting the cache and returns the result.

###### ``#setCache`` with id only - ``{id: <id>}``
You can set cache which always needs an id and / or with action. Pattern is
restricted while setting cache for obvious reasons.

Global Namespace : ```javascript VADER ```
Model:      ```javascript User ```
id:         ```javascript 1 ```

The key will be formed as ```javascript VADER::User::1 ```

- Usage

```javascript
  userCache.setCache(_data, {id: 1})
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```


#### setCache with id and action
Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
id:                  ```javascript 1 ```
Action:              ```javascript "connections" ```

The key will be formed as ```javascript VADER::USER::CONNECTIONS::1 ```

- Usage

```javascript
  userCache.setCache(_data, {action: 'connections', id: 1})
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```



#### Searching in Cache

`` #search `` provides multiple ways to search the cached objects:
- ``{id: <id>}``
- ``{id: <id>, action: <action>}``
- ``{id: <id>, all: true}`` 

###### `` #search `` with just id - ``{ id: <id> }`` :

This basically searches based on the id of the object, a global namespace is present which is set while initializing the cache and apart from that the model name is used as the secondary namespace. For example :

Global Namespace : ```javascript VADER ```
Model: ```javascript User ```
id: ```javascript 1 ```

The key will be formed as ```javascript VADER::User::1 ```

- Usage

```javascript
  userCache.search({id: 1})
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```

###### `` #search `` with id and action - ``{ id: <id>, action: <action> }`` :

This basically searches based on actions  or however you set the keys.

Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
Action:              ```javascript ALL ```
id:                  ```javascript 1 ```

The key will be formed as ```javascript VADER::USER::ALL::1 ```

- Usage

```javascript
  userCache.search({action: 'ALL', id: 1})
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```

###### `` #search `` for all cached objects for that id - ``{ id: <id>, all: <boolean> }`` :

This searches for all the cached objects for the mentioned id with a key pattern.

Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
id:                  ```javascript 1 ```

The key will be formed as ```javascript VADER::User*1 ```

- Usage

```javascript
  userCache.search({id: 1, all: true })
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```


#### Expiring Cache :

`` #expire `` provides multiple ways to search the cached objects:
- ``{id: <id>}``
- ``{id: <id>, action: <action>}``
- ``{id: <id>, all: true}``
- ``{expire_all: true}``

###### `` #expire `` with just id - ``{ id: <id> }`` :

This expires a particular cache object for that id.

Global Namespace : ```javascript VADER ```
Model: ```javascript User ```
id: ```javascript 1 ```

The key will be formed as ```javascript VADER::User::1 ```

- Usage

```javascript
  userCache.expire({id: 1})
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```

###### `` #expire `` with id and action - ``{ id: <id>, action: <action> }`` :

This basically expires based on actions  or however you set the keys.

Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
Action:              ```javascript ALL ```
id:                  ```javascript 1 ```

The key will be formed as ```javascript VADER::USER::ALL::1 ```

- Usage

```javascript
  userCache.expire({action: 'ALL', id: 1})
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```

###### `` #expire `` for all cached objects for that id - ``{ id: <id>, all: <boolean> }`` :

This expires all the cached objects for the mentioned id with a key pattern.

Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```
id:                  ```javascript 1 ```

The key will be formed as ```javascript VADER::User*1 ```

- Usage

```javascript
  userCache.expire({id: 1, all: true })
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```

###### `` #expire `` for all cached objects available - ``{ expire_all: <boolean> }`` :

This expires all the cached objects for the model with a key pattern.

Global Namespace:    ```javascript VADER ```
Model:               ```javascript User ```

The key will be formed as ```javascript VADER::User* ```

- Usage

```javascript
  userCache.expire({expire_all: true })
    .then(_data => // Use the data)
    .catch(_err => // Handle Error)
```




#### Searching with legacy functions:

* These are deprecated, will be removed in future releases. Please use `` #search `` instead.

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

