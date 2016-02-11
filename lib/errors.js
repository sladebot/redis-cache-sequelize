"use strict"
class DeprecationWarning extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.type = "Deprecated";
  }
}

module.exports = {
  DeprecationWarning: DeprecationWarning
}