'use strict';
import EventEmitter, {on} from "events";
import timers from "timers/promises";
import { query, isProduct } from "./services.js";
import { combineHosts, parse } from "./packets.js";
import dial from "./dial.js";
import fetch from "node-fetch";

export async function resolve(node,{timeout=100}={}){
  console.log("Resolving node : ", node);
  if(!node.address || node.ttl == 0) return {...node, status: "unreachable"};
  let c = new AbortController();
  let t = setTimeout(()=>c.abort(), timeout);
  try{
    let r = await fetch(`http://${node.address}/system/version`, {signal: c.signal, headers: {"Accept": "text/plain"}});
    if(r.ok){
      return {...node, status: "running", version: await r.text()}
    }
  }catch(e){
    if(e.code == "ECONNREFUSED" || e.code == 'ECONNRESET' ||e.type == "aborted"){
      try{
        await dial(node.address, {timeout});
        return {...node, status: "online"};
      }catch(err){
        //FIXME : feedback to browser about unreachable node
        if(err.code != "ETIMEDOUT")
          console.log("Failed to dial %s : ", node.address, e);
      }
    }else if(e.code == 'EHOSTUNREACH' || e.code == 'ENOTFOUND'){
      console.log("%s %s", e.code, node.address);
    }else{
      console.warn("Fetch failed on %s with unhandled error :", node.address, e);
    }
  }finally{
    clearTimeout(t);
  }
  return {...node, status: "unreachable"};
}


/**
 * 
 * @param {import("./types").LoopParams} params
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
      store.change(host);
    }
  }
  /* c8 ignore next */
  /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
}


export class AbortList{
  /**@type {Map<string,AbortController>} */
  #controllers = new Map();
  #store;
  constructor(store){
    this.#store = store;
  }
  values(){
    return this.#controllers.values();
  }
  /** */
  upsert(key){
    let prev = this.#controllers.get(key);
    if(prev){
      prev.abort();
      this.#controllers.delete(key)
    }
    let next = new AbortController();
    this.#controllers.set(key, next);
    return next;
  }

  setTimeout(key, fn, delay){
    let {signal} = this.upsert(key);
    timers.setTimeout(delay, null, {signal})
    .then(fn)
    .finally(()=> this.#controllers.delete(key))
    .catch((e)=>  (e)=>{ 
      if(e.code === "ABORT_ERR") return;
      if(this.#store) {
        this.#store.emit("error", e)
      }else{
        throw e;
      } 
    })
  }

  clear(){
    for(let c of this.#controllers.values()){
      c.abort();
    }
    this.#controllers.clear();
  }
}


/**
 * @param {import("./types").LoopParams} params
 */
export async function refresh({store, mdns, signal, delay=Math.random()*2000}){
  let acList = new AbortList();
  try{
    for await (let [host] of on(store, "change", {signal})){
      let key = host.host;
      acList.setTimeout(key,()=>{
        if(host.ttl == 0) return;
        console.log("Perform a refresh query for : %s at ", host.host, new Date());
        return query({mdns, address: host.address});
      }, host.ttl*1000*0.8+delay);
    }
    /* c8 ignore next */
    /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
  }finally{
    acList.clear();
  }
}

/**
 * @param {import("./types").LoopParams} params
 */
 export async function remove({store, mdns, signal, delay=Math.random()*2000}){
  let acList = new AbortList();
  try{
    for await (let [host] of on(store, "change", {signal})){
      let key = host.host;
      acList.setTimeout(key,()=>{
        store.remove(host);
      }, host.ttl*1000);
    }
    /* c8 ignore next */
    /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
  }finally{
    acList.clear();
  }
}