const {debuglog} = require('util');
const debug = debuglog("holusion-scanner");
class BrowseError extends Error{
  //Browse Errors can generally be ignored but can be symptomatic of shaky networks
  constructor(message){
    super(message);
    this.name = "BrowseError"
  }
}
module.exports = {BrowseError, debug};
