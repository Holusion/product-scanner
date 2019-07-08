'use strict';
const {isIP, connect} = require("net");
const {BrowseError} = require("./errors");
const connect_timeout = 1000;
class Node {
  get props(){ return ["name", "fullname", "version", "status", "addr", "addresses", "mac"]}
  constructor(fromObject={}){
    for (let prop of this.props){
      // Object.assign restricted to known props
      if(typeof fromObject[prop] != "undefined") this[prop] = fromObject[prop];
    }
  }
  merge(n){ //priority to new values
    if(!n) return;
    Object.assign(this, n);
  }
  isSame(n){
    return (typeof n.name == "string" && n.name === this.name);
  }
  get ip4Addr(){
    return (this.addresses || []).find((addr)=> isIP(addr) == 4)
  }
  get ip6Addr(){
    return (this.addresses || []).find((addr)=> isIP(addr) == 6)
  }

  //Determine node's status.
  // it _can_ throw but all major known errors should be caught in-function and taken care of. 
  // It's _relatively_ safe to assume it won't ever throw under normal operations
  // Thrown error will be a [FetchError](https://github.com/bitinn/node-fetch/blob/HEAD/ERROR-HANDLING.md)
  //All major known error
  async withStatus(force=true){
    const n = this;
    if(n.status && !force) return n;
    n.status= "unreachable";
    for (let addr of [n.ip4Addr, n.ip6addr]){
      if(!addr) continue;
      const uri = `http://${addr}/system/version`;
      try{
        const res = await fetch(uri, {timeout: connect_timeout});
        if(res.ok){
          n.addr = addr,
          n.version = await res.text(),
          n.status = "running"
          //This is first class info and it overrides anything previously set
          //And we break the loop just after
          break;
        }
      }catch(e){
        if(e.code == "ECONNREFUSED" || e.code == 'ECONNRESET' ||e.type == 'request-timeout'){
          //Maybe node is online on this address but controller is down / faulty
          //So we check if it's reachable on port 22 (ssh)
          try {
            await Node.dial(addr);
            n.addr = addr;
            n.status= "online";
          }catch(e){
            //Some addresses are just bad... so we try every one of them
            if(e.code = "ETIMEDOUT"){
              continue;
            }
            //However we still log anormal errors.
            console.log("Failed to dial %s : ", addr, e);
            continue;
          }
        }else if(e.code == 'EHOSTUNREACH'){
          continue; // 'unreachable' is already the defaut state unless set otherwise
        }else{
          //Some unspecified error occured. We report the error and stop processing
          // A case where IP4 throws an unexpected error and IP6 works fine has never been encountered yet.
          throw e;
          continue;
        }        
      }
    }
    return n;
  }

  static dial(addr, port=22){
    const c = new Promise((resolve, reject) =>{
      const s = connect({port : port, host: addr, family: isIP(addr), timeout: connect_timeout});
      s.once("connect", ()=>{
        s.destroy();
        resolve();
      });
      s.once("timeout",()=>{
        s.destroy();
        let e = new Error("socket connection timed-out");
        e.code = "ETIMEDOUT";
        e.type = "connection-timeout";
        reject(e);
      });
      s.once("error", reject); //socket auto-closes on error
    });
    return c;
  }
  //Will throw BrowseError if the Service is invalid
  static createFromService(service){
    if(!service.name){
      throw new BrowseError("Invalid item found : item.name = "+JSON.stringify(service));
    }
    const addrs = Node.mapAddresses(service.networkInterface, service.addresses || []);
    //Assign those values to Node
    const n = new Node(Object.assign({}, service, {
      fullname: service.fullname,
      name: service.name.split(" ")[0],
      mac: service.name.split(" ")[1],
      addresses: addrs,
    }))

    return n;
  }

  static createFromSerialized(item){
    if(!item.name){
      throw new BrowseError("Invalid item found : item.name = "+JSON.stringify(item));
    }
    const n = new Node(Object.assign({
      version: "0.0.0",
      addresses: [],
    }, item));
    return n;
  }
  static mapAddresses(iface, addrs){
    return addrs.map((addr)=>{
      switch (isIP(addr)) {
        case 4:
          return  addr;
        case 6:
          return `${addr}%${iface}`;
        case 0:
          console.warn("Invalid net address: ", addr);
        default:
          return null;
      }
    }).filter(addr => addr );
  }
}
module.exports = {Node};
