### This helps in caching sequelize objects in redis based on 3 strategies and not queries

* modelCache.searchOne({id: 1, action: 'method'}) => This searches the cache that model's cache with that id, and / or the action if specified. 
  This doesnot automatically set the cache ! ( not just yet ). This return's bluebird promises to support promise chains.


## Check tests for more details. 