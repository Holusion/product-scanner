'use strict';
const {isIP, connect} = require("net");
const {BrowseError} = require("./errors");

class Node {
  constructor(fromObject){
    Object.assign(this, fromObject)
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
  async withStatus(force=true){
    const n = this;
    if(n.status && !force) return n;
    n.status= "unreachable";
    for (let addr of [n.ip4Addr, n.ip6addr]){
      if(!addr) continue;
      const uri = `http://${addr}/system/version`;
      try{
        const res = await fetch(uri);
        if(res.ok){
          n.addr = addr,
          n.version = await res.text(),
          n.status = "running"
          //This is first class info and it overrides anything previously set
          //And we break the loop just after
          break;
        }else{
          console.log("Res : ", res);
        }
      }catch(e){
        if(e.code != "ECONNREFUSED"){
          console.log("Error :",e.code, e);
          continue;
        };
        //Maybe node is online on this address but controller is down
        //So we check if it's reachable on port 22 (ssh)
        try {
          const p =  Node.dial(addr);
          await p;
          n.addr = addr;
          n.status= "online";
        }catch(e){
          console.log("Failed to dial %s : ", addr, e);
          //Some addresses are just bad... so we try every one of them
          continue;
        }
      }
    }
    return n;
  }

  static dial(addr){
    const c = new Promise((resolve, reject) =>{
      const s = connect({port : 22, host: addr, family: isIP(addr), timeout: 1000});
      s.once("connect", ()=>{
        s.destroy();
        resolve();
      });
      s.once("timeout",()=>{
        console.log("socket timed-out")
        s.destroy();
        reject();
      })
      s.once("error", function(e){
        console.log("socket error : ",e);
        reject(e);
      }); //socket auto-closes on error
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
    const n = new Node({
      fullname: service.fullname,
      name: service.name.split(" ")[0],
      mac: service.name.split(" ")[1],
      addresses: addrs,
    })
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
