import {once} from "events";
import multicastDns from "multicast-dns";

import {add} from "./lifecycle.js";
import TaskList from "./TaskList.js";
import { query } from "./services.js";

/**
 * Takes some liberty with the RFC for cache handling
 * @param {Object} [param0]
 * @param {import("multicast-dns").MulticastDNS} [param0.mdns]
 * @param {AbortSignal} [param0.signal] abort signal
 * @param {number} [param0.randomDelay=2000] max. random delay to add to ttl to prevent bursts
 * @yields {Promise<Host>} Yields on each changed host with its last-known state (unreachable, online, running)
 */
export default async function* productScanner({mdns, signal= new AbortController().signal, randomDelay=2000}={}){
  let useDefaultMdns = !mdns;
  if(useDefaultMdns){
    mdns = multicastDns();
    await once(mdns, "ready", {signal});
  }

  const nextEvent = (()=>{
    let events = add({mdns, signal});
    return function() {
      return events.next().then((r)=>({type:"add", host:r.value, done: false}));
    }
  })();

  const refreshs = new TaskList();
  const timeouts  = new TaskList();
  try{
    let pendingResponse = nextEvent();
    let onAbort = once(signal, "abort").then(()=>({type:"abort"}));
    while(!signal.aborted){
      let {type, host, done} = await Promise.race([
        onAbort,
        pendingResponse,
        //wait for any timeout to finish.
        //We do not wait for refreshs bacause they wont immediately yield any new data
        ...timeouts.values(),
      ]);
      if(type === "abort"){
        break;
      }
      if(type === "add"){
        refreshs.schedule(host.host, async ()=>{
          if(host.ttl == 0) return;
          //console.log("Perform a refresh query for : %s at ", host.host, new Date());
          await query({mdns, address: host.address});
        }, host.ttl*1000*0.8 + randomDelay*Math.random())
        .catch(e=> {if(e.code !== "ABORT_ERR")console.error("Failed to send a mdns Query : ", e)});
  
        timeouts.schedule(host.host, ()=>({type: "rm", host, done:false}), host.ttl*1000);
        pendingResponse = nextEvent();
        if(host.ttl != 0) yield host;
      }else{
        yield {...host, ttl: 0, status: "unreachable"};
      }

      if(done) break;
    }
  }finally{
    refreshs.clear();
    timeouts.clear();
    if(useDefaultMdns) mdns.destroy();
  }
}