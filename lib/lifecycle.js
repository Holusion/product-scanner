import {on} from "events";
import { query, isProduct } from "./services.js";
import { combineHosts, parse } from "./packets.js";


/**
 * 
 * @yields {Host} any added/modified host
 */
 export async function* add({mdns, signal}){
  let events = on(mdns, "response", {signal})
  await query({mdns});

  for await(let [packet] of events){
    for (let host of combineHosts(parse(packet))){
      if(!isProduct(host)){
        //if(/^iris\d+-\d+/.test(host.host)) console.log("Not a product : ", host.host, JSON.stringify(packet, null, 2));
        continue;
      }
      yield host;
    }
  }
  /* c8 ignore next */
  /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
}