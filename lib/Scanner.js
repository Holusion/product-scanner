'use strict';

const {EventEmitter} = require("events");
const mdns = require('mdns');


require("isomorphic-fetch");

const {BrowseError, debug} = require("./errors");

const nodes = require("./nodes");
//prevents getaddrinfo error -3008 in most cases
// https://github.com/agnat/node_mdns/issues/130
const resolve_sequence = [
  mdns.rst.DNSServiceResolve(),
  ('DNSServiceGetAddrInfo' in mdns.dns_sd)? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families:[0]}),
  mdns.rst.makeAddressesUnique(),
  function(service, next){
    nodes.withStatus(nodes.fromService(service))
    .then((n)=>{
      ["addr", "version", "status"].forEach(function(key){
        if(n[key]) service[key] = n[key]
      })
      next();
    })
  }
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
  constructor(opts={}){
    super();
    const {
      autostart=true,
      initial= [],
      autorefresh = 0, //only when autostart = true <=0 to disable, or a time in ms
      service = 'workstation'
    } = opts;
    this._data = initial;
    this.service = service;
    this.constructor_opts = opts;
    autostart && this.start({autorefresh});
  }

  lock(thenDoThings){
    this._lock = ((this._lock)?this._lock:Promise.resolve())
    .then(thenDoThings);
    return this._lock;
  }

  start({autorefresh=0} ={}){
    if(this.browser) return;
    const browser = mdns.createBrowser(mdns.tcp(this.service), Object.assign(
      {resolverSequence:resolve_sequence},
      this.constructor_opts
    ));
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

    browser.on('serviceUp',(service)=>{
      try{
        const n = nodes.fromService(service)
        debug("serviceUp event", n);
        this.lock(()=>{
          this.add(n);
        })
      }catch(e){
        this.emit("error", e);
      }
    });

    browser.on('serviceDown', (service)=>{
      try{
        const n = nodes.fromService(service);
        debug("serviceDown event", n);
        this.lock(()=>{
          this.remove(n);
        })
      }catch(e){
        this.emit("error", e);
      }
    });

    this.browser = browser;
    this.browser.start();
    if(autorefresh){
      this.refreshTimer = setInterval(this.refresh.bind(this, autorefresh/2),autorefresh);
    }
  }
  stop(){
    if(!this.browser) return;
    this.browser.stop();
    if(this.refreshTimer){
      this.refreshTimer.clearInterval();
      this.refreshTimer = null;
    }
  }

  refresh(timeout){
    return this.lock(async ()=>{
      let changes = [];
      //this.list being an array of object, they update themselves
      const new_list = await Promise.all(this.list.map(async (n, index) => {
        try {
          const updated_node = await n.withStatus();
          if(! nodes.isEqual(updated_node,n)){
            changes.push(updated_node);
          }
          return updated_node;
        }catch(e){
          this.emit("error",new BrowseError(`Failed to fetch node status for ${n.name} : ${e.message}`));
          return Object.assign({}, n);
        }
      }));
      this._data = new_list;

      if(0 < changes.length){
        setImmediate( () =>{
          this.emit("change", this.list)
          changes.forEach((c)=> this.emit("update", c));
        });
        
      }
      return new_list;
    }).then((new_list)=>{
      debug("refreshed status")
      return new_list;
    });
  }

  findIndex(item){
    return this._data.findIndex(n => nodes.isSame(item, n));
  }
  find(item){
    const idx = this._data.findIndex(n => nodes.isSame(item, n));
    return this.list[idx];
  }
  add(item){
    //This error only happens when network has invalid "product-like" hosts
    if(!item || ! item.name) {
      return this.emit("error", new BrowseError(`tried to add invalid Node : ${item}`));
    }
    let idx = this.findIndex(item);
    if( idx == -1){
      this._data.push(item);
      this.emit("add", item);
      //console.log("added Product : ",item);
    }else if( !nodes.isEqual(this._data[idx], item)){//update object if necessary
      this._data[idx] = item;
      this.emit("update", item);
    }else{
      return;
    }
    this.emit("change", this._data);
  }

  remove(item){
    //Sometimes mdns can do weird things. Can probably be ignored...
    if(!item || ! item.name) return this.emit("error", new BrowseError(`tried to remove invalid Node : ${item}`));
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
