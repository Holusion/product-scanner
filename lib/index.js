import EventEmitter, {once} from "events";
import timers from "timers/promises";
import multicastDns from "multicast-dns";

import {add} from "./lifecycle.js";
import TaskList from "./TaskList.js";
import { query } from "./services.js";


export default class ProductScanner extends EventEmitter{
  #c = new AbortController();
  #delay;
  /**@type {import("multicast-dns").MulticastDNS} */
  #mdns;
  /**@type {boolean} */
  #defaultMdns = false;

  #tasks = new TaskList();

  constructor({mdns=undefined, randomDelay=2000}={}){
    super();
    this.#delay = randomDelay;
    this.#defaultMdns = !mdns
    this.#mdns = this.#defaultMdns?multicastDns(): mdns;
    if(this.#defaultMdns){
      this.#mdns.once("ready", this.emit.bind(this, "ready"));
      this.#mdns.once("ready",this.#loop.bind(this));

      this.#mdns.on("error", this.emit.bind(this, "error"));
    }else{
      this.#loop();
    }
  }

  close(){
    this.#c.abort();
    this.#tasks.clear();
    if(this.#defaultMdns) this.#mdns.destroy();
    this.removeAllListeners();
  }

  /**
   * force refresh a list of node names.
   * Resolves after timeout expires or all nodes answered
   * @param {string[]|IterableIterator<string>} ids 
   * @param {number} timeout
   */
  async refresh(ids, timeout=500){
    return Promise.race([
      new Promise((resolve)=>{
        let refreshed = 0;
        let count = 0;
        for(let id of ids){
          count++;
          this.#tasks.schedule("timeout-"+id, ()=>{
            this.emit("remove", id);
          }, timeout).catch((e)=>{
            if(e.code != "ABORT_ERR"){
              resolve(e);
            }else if(++refreshed == count){
              resolve();
            }
          });
        }
        if(count == 0) resolve();
      }),
      query({mdns:this.#mdns}).then(()=>timers.setTimeout(timeout)),
    ]);
    
  }


  #loop(){
    this.#c.abort();
    const c = this.#c = new AbortController();
    (async ()=>{
      for await (let host of add({mdns:this.#mdns, signal:c.signal})){
        const id = host.host;
  
        this.#tasks.schedule("timeout-"+id, ()=>{
          this.emit("remove", id);
        }, host.ttl*1000)
        .catch(e=>{if(e.code !== "ABORT_ERR")console.error("Failed to send a mdns Query : ", e)})
        
        if(host.ttl != 0){

          this.#tasks.schedule("refresh-"+id, async ()=>{
            //console.log("Perform a refresh query for : %s at ", host.host, new Date());
            await query({mdns: this.#mdns, address: host.address});
          }, host.ttl*1000*0.8 + this.#delay*Math.random())
          .catch(e=> {if(e.code !== "ABORT_ERR")console.error("Failed to send a mdns Query : ", e)});

          this.emit("change", host);
        }
      }
    })().catch(e=>{
      if(e.code != "ABORT_ERR") throw e;
    })
  }

}
