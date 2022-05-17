'use strict';
import {EventEmitter} from "events";

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
   * @override
   * @returns {("ready" | "message" | "query" | "response" | "error" | "warning")[]}
   */
  eventNames = ()=>(["ready", "message", "query", "response", "error", "warning"])
  /**
   * @override
   * @returns {Array<() => void>}
   */
  listeners(name){
    // @ts-ignore
    return super.listeners(name);
  }  
  
  /**
  * @override
  * @returns {Array<() => void>}
  */
  rawListeners(name){
    // @ts-ignore
    return super.rawListeners(name);
  }
}
