'use strict';
import {isIP, createConnection} from "net";

import { BrowseError } from "./errors.js";


export default function dial(addr, {port=22, timeout=100}={}){
  return  new Promise((resolve, reject) =>{
    const s = createConnection({port : port, host: addr, family: isIP(addr), timeout});
    s.once("connect", ()=>{
      s.destroy();
      resolve();
    });
    s.once("timeout",()=>{
      s.destroy();
      reject(new BrowseError("ETIMEDOUT", "socket connection timed-out") );
    });
    s.once("error", reject); //socket auto-closes on error
  });
}
