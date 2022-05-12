'use strict';
import EventEmitter, {on} from "events";
import timers from "timers/promises";
import { query, isProduct } from "./services.js";
import { combineHosts, parse } from "./packets.js";


/**
 * 
 * @yields {Host} any added/modified host
 */
 export async function* add({mdns, signal}){
  let events = on(mdns, "response", {signal})
  await query({mdns});

  for await(let [packet] of events){
    for (let host of combineHosts(parse(packet))){
      if(!isProduct(host)){
        if(/^iris\d+-\d+/.test(host.host)) console.log("Not a product : ", host.host, JSON.stringify(packet));
        continue;
      }
      yield host;
    }
  }
  /* c8 ignore next */
  /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
}

export class AbortList{
  /**@type {Map<string,AbortController>} */
  #controllers = new Map();
  #promises = new Map();
  values(){
    return this.#promises.values();
  }

  setTimeout(key, fn, delay){
    let prev = this.#controllers.get(key);
    if(prev){
      prev.abort();
      this.#controllers.delete(key);
      this.#promises.delete(key);
    }
    let next = new AbortController();
    this.#controllers.set(key, next);
    this.#promises.set(key, timers.setTimeout(delay, null, {signal: next.signal})
    .then(fn)
    .finally(()=>{
      this.#controllers.delete(key);
      this.#promises.delete(key);
    })
    .catch((e)=>  (e) => { 
      if(e.code === "ABORT_ERR") return;
      throw e;
    }));
  }

  clear(){
    for(let c of this.#controllers.values()){
      c.abort();
    }
    this.#controllers.clear();
    this.#promises.clear();
  }
}


export async function* lifecycle({mdns, signal, randomDelay=2000}){
  const nextEvent = (()=>{
    let events = add({mdns, signal});
    return function(){
      return events.next().then((r)=>({type:"add", host:r.value, done: false}));
    }
  })();

  const refreshs = new AbortList();
  const timeouts  = new AbortList();
  try{
    let pendingResponse = nextEvent();
    while(true){
      let {type, host, done} = await Promise.race([
        pendingResponse,
        ...timeouts.values(),
      ]);
      if(type === "add"){
        refreshs.setTimeout(host.host, ()=>{
          if(host.ttl == 0) return;
          console.log("Perform a refresh query for : %s at ", host.host, new Date());
          query({mdns, address: host.address});
        }, host.ttl*1000*0.8 + randomDelay*Math.random());
  
        timeouts.setTimeout(host.host, ()=>({type: "rm", host, done:false}), host.ttl*1000);
        pendingResponse = nextEvent();
        if(host.ttl != 0) yield host;
      }else{
        yield {...host, status: "unreachable"};
      }
      if(done) break;
    }
  }finally{
    refreshs.clear();
    timeouts.clear();
  }
}