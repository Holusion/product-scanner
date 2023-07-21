'use strict';
import {EventEmitter} from "events";

export class MdnsMock extends EventEmitter{
  constructor(){
    super();
    this.queries = [];
    this.handler = null;
  }

  _onQuery(handler){
    this.handler = handler;
    this.queries.forEach(([q, rinfo, cb])=>Promise.resolve().then(()=>handler(q, rinfo)).then(cb));
  }

  query(questions, rinfo, cb){
    this.queries.push([questions, rinfo, cb]);
    if(this.handler) Promise.resolve().then(()=>this.handler(questions, rinfo)).then(cb);
  }
  respond(){}



  destroy(cb=()=>{}){setImmediate(cb)}
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
