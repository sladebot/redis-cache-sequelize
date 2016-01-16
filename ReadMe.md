[![Build Status](https://travis-ci.org/sladebot/redis-cache-sequelize.svg?branch=master)](https://travis-ci.org/sladebot/redis-cache-sequelize) [![Dependency Status](https://david-dm.org/sladebot/redis-cache-sequelize.svg)](https://david-dm.org/sladebot/redis-cache-sequelize.svg) [![Code Climate](https://codeclimate.com/github/sladebot/redis-cache-sequelize/badges/gpa.svg)](https://codeclimate.com/github/sladebot/redis-cache-sequelize)


### This helps in caching sequelize objects in redis based on 3 strategies and not queries


#### Initialization and configuration

_ We are using sequelize models for using this as of now.

```javascript
	
	var redisClient = redis.createClient(redisPort, redisHost);
    db = new Sequelize(opts.database, opts.username, opts.password, opts);
    cacheStore = initCacheStore(redisClient);
    
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


	var userCache = cacheStore(User, {cachePrefix: 'DARTH'})
                .ttl(100);

```

##### searchOne

* This basically searches based on the id of the object, a global namespace is present which is set while initializing the cache and apart from that the model name is used as the secondary namespace. For example : 

Global Namespace : DARTH
Model: User
id: 1

The key will be formed as DARTH::User::1

** Usage

```javascript
userCache.searchOne({id: 1})
    .then(function(result) {  
      /** */
    })
```

##### searchScoped

* This basically searches based on actions / methods or however you set the keys. It's agostic of that at the moment intentionally.

Global Namespace:    DARTH
Model:               User
Scope/Method/Action: ALL

The key will be formed as DARTH::USER::ALL

** Usage

```javascript
userCache.searchScoped({action: 'ALL'})
    .then(function(result) {  
      /** */
    })
```

##### searchPattern

* Now this searches all keys based on the pattern provided

Global Namespace:    DARTH
Model:               User
Pattern:             "*"

The key will be formed as DARTH::USER::*

** Usage

```javascript
userCache.searchPattern({action: '*'})
    .then(function(result) {  
      /** */
    })
```

### Expiry has a similar setup. 
Docs coming soon ...


## Check tests for more details. 
