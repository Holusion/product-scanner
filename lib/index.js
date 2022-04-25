'use strict';
import EventEmitter from "events";
import multicastDns from "multicast-dns";

import { add, remove, refresh, resolve } from "./loop.js";

/**
 * 
 */
export default class Store extends EventEmitter{
  #abortControl = new AbortController();
  #records = new Map();
  #strikes = {};

  constructor({mdns=multicastDns()}){
    super();
    this.on("change",(host)=>{
      if(0 < host.ttl) this.emit("add", host);
    });
    this.once("error", ()=> this.close());
    [add, refresh, remove].forEach((fn)=>{
      fn({store: this, mdns, signal: this.#abortControl.signal}).catch(this.onError);
    });
  }

  close(){
    this.#abortControl.abort();
    this.removeAllListeners();
  }

  change(host){
    let key = host.host
    if(!key) throw new Error(`Trying to add invalid host : ${host.host}`);
    this.#records.set(key, host);
    this.emit("change", host);//change will emit "add" if ttl != 0
  }

  remove({host}){
    let old_record = this.#records.get(host);
    if(old_record){ this.emit("remove", old_record);}
    this.#records.delete(host);
    delete this.#strikes[host.host];
  }
  /**
   * error handler that silences AbortError and emits an error for everything else
   * @param {Error} e 
   */
  onError = (e)=>{
    if(e.name === "AbortError") return;
    this.emit("error", e);
  }

  get hosts(){
    return [...this.#records.values()];
  }

  async resolvedHosts(){
    let hosts = await Promise.all(this.hosts.map(host=> resolve(host)))
    for(let host of hosts){
      if(host.status === "unreachable"){
        this.#strikes[host.host] = (this.#strikes[host.host] || 0 ) + 1;
        if(3 <= this.#strikes[host.host]){
          this.remove(host);
        }
      }else{
        this.#strikes[host.host] = 0;
      }
    }
    return hosts;
  }
}
