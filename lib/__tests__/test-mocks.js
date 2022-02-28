'use strict';
import {EventEmitter} from "events";


export class StoreMock extends EventEmitter{
  add(){

  }
  remove(){

  }
}

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
}