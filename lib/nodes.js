'use strict';
const {isIP, connect} = require("net");
const {BrowseError, debug} = require("./errors");

const props = ["name", "fullname", "version", "status", "addr", "addresses", "mac"];

//Deserialize  a string or an object to a node with default values
//Only makes a shallow copy of structured properties
function deserialize(item){
  if(!item.name){
    throw new BrowseError("Invalid item found : item.name = "+JSON.stringify(item));
  }
  const node = Object.assign({
    version: "0.0.0",
    addresses: [],
  }, item)
  node.withStatus = withStatus.bind(node, node);
  return node;
}

function fromService(service){
  if(!service.name){
    throw new BrowseError("Invalid item found : item.name = "+JSON.stringify(service));
  }
  const addrs = mapAddresses(service.networkInterface, service.addresses || []);
  //Assign those values to Node
  const node = Object.assign({}, service, {
    fullname: service.fullname,
    name: service.name.split(" ")[0],
    mac: service.name.split(" ")[1],
    addresses: addrs,
  })

  return deserialize(node);
}

function mapAddresses(iface, addrs){
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

function ip4Addr(){
  return (this.addresses || []).find((addr)=> isIP(addr) == 4)
}
function ip6Addr(){
  return (this.addresses || []).find((addr)=> isIP(addr) == 6)
}

function merge(a, b){ //priority to new values
  return Object.assign({}, a, b);
}
function isSame(a, b){
  return (typeof b.name == "string" && a.name === b.name);
}

function isEqual(a, b){
  return JSON.stringify(a) == JSON.stringify(b);
}

  //Determine node's status.
  // it _can_ throw but all major known errors should be caught in-function and taken care of. 
  // It's _relatively_ safe to assume it won't ever throw under normal operations
  // Thrown error will be a [FetchError](https://github.com/bitinn/node-fetch/blob/HEAD/ERROR-HANDLING.md)
  //All major known error
async function withStatus(node, {force=true, timeout = 1000}={}){
  const new_node = Object.assign({}, node);
  if(node.status && !force) return new_node;

  new_node.status= "unreachable";
  for (let addr of [node.ip4Addr, node.ip6addr]){
    if(!addr) continue;
    const uri = `http://${addr}/system/version`;
    try{
      const res = await fetch(uri, {timeout});
      if(res.ok){
        new_node.addr = addr,
        new_node.version = await res.text(),
        new_node.status = "running"
        //This is first class info and it overrides anything previously set
        //And we break the loop just after
        break;
      }
    }catch(e){
      if(e.code == "ECONNREFUSED" || e.code == 'ECONNRESET' ||e.type == 'request-timeout'){
        debug("%s from %s. Dialing to %s:22", e.code, uri, addr);
        //Maybe node is online on this address but controller is down / faulty
        //So we check if it's reachable on port 22 (ssh)
        try {
          await dial(addr);
          new_node.addr = addr;
          new_node.status= "online";
        }catch(e){
          //Some addresses are just bad... so we try every one of them
          if(e.code = "ETIMEDOUT"){
            debug("ETIMEDOUT from %s:22", addr);
            continue;
          }
          //However we still log anormal errors.
          console.log("Failed to dial %s : ", addr, e);
          continue;
        }
      }else if(e.code == 'EHOSTUNREACH'){
        debug("EHOSTUNREACH %s", uri);
        continue; // 'unreachable' is already the defaut state unless set otherwise
      }else{
        //Some unspecified error occured. We report the error and stop processing
        // A case where IP4 throws an unexpected error and IP6 works fine has never been encountered yet.
        throw e;
      }
    }
  }
  return new_node;
}

function dial(addr, {port=22, timeout=1000}){
  return  new Promise((resolve, reject) =>{
    const s = connect({port : port, host: addr, family: isIP(addr), timeout});
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
}

module.exports = {
  deserialize,
  fromService,
  mapAddresses,
  ip4Addr,
  ip6Addr,
  merge,
  isSame,
  isEqual,
  withStatus,
  dial,
};
