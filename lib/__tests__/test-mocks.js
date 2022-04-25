'use strict';
import {EventEmitter} from "events";
import Store from "../index.js";

export class MdnsMock extends EventEmitter{
  constructor(){
    super();
    this.queries = [];
  }

  query(questions, rinfo, cb){
    this.queries.push([questions, rinfo]);
    setImmediate(()=>{
      this.emit("_query", questions)
      cb? cb(): null;
    });
  }
  respond(){}
  
  destroy(cb=()=>{}){setImmediate(cb)};
  /**
   * 
   * @returns {("ready" | "message" | "query" | "response" | "error" | "warning")[]}
   */
  eventNames = ()=>(["ready", "message", "query", "response", "error", "warning"])
  /**
   * @returns {Array<() => void>}
   */
  listeners(name){
    // @ts-ignore
    return super.listeners(name);
  }  
  
  /**
  * @returns {Array<() => void>}
  */
 rawListeners(name){
   // @ts-ignore
   return super.rawListeners(name);
 }
}


export class StoreMock extends Store {
  constructor({mdns=new MdnsMock()}={}){
    super({mdns});
  }
}