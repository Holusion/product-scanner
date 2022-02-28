'use strict';
import EventEmitter, {on} from "events";

import { query, isProduct } from "./services.js";
import { combineHosts, parse } from "./packets.js";


export class Store extends EventEmitter{
  #records = new Map();
  add(host){
    let key = host.host
    if(!key) throw new Error(`Trying to add invalid host : ${host.host}`);
    this.#records.set(key, host);
    this.emit("change","add", host);
  }

  remove({host}){
    let old_record = this.#records.get(host);
    if(old_record){ this.emit("change", "remove", old_record);}
    this.#records.delete(host);
  }
  /**
   * error handler that silences AbortError and emits an error for everything else
   * @param {Error} e 
   */
  onError = (e)=>{
    if(e.name === "AbortError") return;
    this.emit("error", e);
  }
}

/**
 * 
 * @param {import(".").LoopParams} params
 */
export async function add({store, mdns, signal}){
  query({mdns}).catch(e=>{
    store.emit("error", e);
  });
  for await(let [packet] of on(mdns, "response", {signal})){
    for (let host of combineHosts(parse(packet))){
      if(!isProduct(host)){
        continue;
      }
      store.add(host);
    }
  }
  /* c8 ignore next */
  /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
}

/**
 * 
 * @param {import(".").LoopParams} params
 */
export async function remove({store, mdns, signal, delay=Math.random()*2000}){
  let timeouts = {
    /** @type {Map<string,NodeJS.Timeout>} */
    remove: new Map(),
    /** @type {Map<string,NodeJS.Timeout>} */
    query: new Map(),
    replace(type, key, fn, time){
      clearTimeout(this[type].get(key)); 
      this[type].delete(key);
      this[type].set(key, setTimeout(fn, time));
    },
  };
  try{
    for await (let [event, host] of on(store, "change", {signal})){
      if(event !== "add") continue;
      let key = host.host;
      timeouts.replace("remove", key, ()=>{
        store.remove(host);
      }, host.ttl*1000);
  
      timeouts.replace("query", key, ()=>{
        if(host.ttl == 0) return;
        console.log("Perform a refresh query for : ", host.host);
        query({mdns, address: host.address});
      }, host.ttl*1000*0.8+delay);
    }
    /* c8 ignore next */
    /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
  }finally{
    for(let t of [...timeouts.remove.values(),...timeouts.query.values()]){
      clearTimeout(t);
    }
  }
  
}
