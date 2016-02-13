module.exports = function(_){
  _.select = function (hash, props) {
    var o = {};
    props.forEach(function(p){
      if(hash[p])
        o[p] = hash[p];
    })
    return o;
  }
}