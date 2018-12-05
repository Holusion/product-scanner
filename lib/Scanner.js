'use strict';

const {EventEmitter} = require("events");
const mdns = require('mdns');

require("isomorphic-fetch");

const {BrowseError} = require("./errors");
const {Node} = require("./Node");
//prevents getaddrinfo error -3008 in most cases
// https://github.com/agnat/node_mdns/issues/130
const resolve_sequence = [
  mdns.rst.DNSServiceResolve()
, mdns.rst.getaddrinfo({families:[0]})
, mdns.rst.makeAddressesUnique()
];

/* Network Scanner
 * items returned from Scanner.list() are mdns service objects, like :
   var service = {
    name: serviceName,
    interfaceIndex: ifaceIdx,
    type: type,
    replyDomain: replyDomain,
    flags: flags
  };
 */
class Scanner extends EventEmitter{
  constructor(start=true, initialList= []){
    super();
    this._data = initialList;
    const browser = mdns.createBrowser(mdns.tcp('workstation'),{resolverSequence:resolve_sequence});
    browser.on("error",(e)=>{
      switch(e.code){
        //uv_getaddrinfo() error codes are defined under UV__EAI_* in :
        //https://github.com/libuv/libuv/blob/fe3fbd63e5dfe26c473cdd422ad216a14ae2d7e4/include/uv-errno.h
        case -3008: //UV__EAI_NONAME
          //The node or service is not known; or both node and service are NULL;
          //or AI_NUMERICSERV was specified in hints.ai_flags
          //and service was not a numeric port-number string.
          // in `node_modules/mdns/lib/resolver_sequence_tasks.js :117` :
          // we call to cares_wrap's getAddrInfo which is :
          // https://github.com/nodejs/node/blob/master/src/cares_wrap.cc#L1891
          console.warn("name or service not known (no valid address found for device)");
          //Do not throw an error here
          break
        default:
          this.emit("error", e);
      }
    });

    browser.on('serviceUp',async (service)=>{
      try{
        const n = Node.createFromService(service)
        this.add(await n.withStatus());
      }catch(e){
        this.emit("error", e);
      }

    });

    browser.on('serviceDown', (service)=>{
      try{
        this.remove(Node.createFromService(service));
      }catch(e){
        this.emit("error", e);
      }
    });

    this.browser = browser;
    start && this.start();
  }
  start(){
    this.browser.start();
  }
  findIndex(item){
    return this._data.findIndex(n => n.isSame(item));
  }
  merge(newNode){
    if(!newNode) return;
    const idx = this.findIndex(newNode);
    if (idx != -1) {
      const oldNode = this.list[idx];
      newNode.merge(oldNode);
    }
    this.add(newNode);
  }
  async add(item){
    //This error only happens when network has invalid "product-like" hosts
    if(!item || ! (item instanceof Node)) {
      return this.emit("error", new BrowseError(`tried to add invalid Node : ${item}`));
    }
    let idx = this.findIndex(item);
    if( idx == -1){
      this._data.push(item);
      this.emit("add", item);
      //console.log("added Product : ",item);
    }else if( JSON.stringify(this._data[idx]) != JSON.stringify(item)){//update object if necessary
      this._data[idx] = item;
      this.emit("update", item);
    }else{
      return;
    }
    this.emit("change", this._data);
  }

  remove(item){
    //Sometimes mdns can do weird things. Can probably be ignored...
    if(!item || ! item instanceof Node) return this.emit("error", new BrowseError(`tried to remove invalid Node : ${item}`));
    let idx = this.findIndex(item);
    if (idx == -1) return; //Services are often removed twice
    this._data.splice(idx, 1);
    this.emit("remove", item);
    this.emit("change", this.list);
  }
  get list(){
    return this._data;
  }
}
module.exports = {Scanner};
