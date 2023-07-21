import {EventEmitter} from "events";

import { ResponsePacket, MulticastDNS, RemoteInfoOutgoing } from "multicast-dns";
import {SrvAnswer, StringAnswer, TxtAnswer, StringAnswer} from "dns-packet";


/**
 * A ResponsePacket where each answer was assigned to its own array
 * @see ResponsePacket
 */
interface ParsedPacket{
  A: StringAnswer[];
  AAAA: StringAnswer[];
  SRV: SrvAnswer[];
  PTR: StringAnswer[];
  TXT: TxtAnswer[];
}

/**
 * Representation of a scanned host
 */
interface Host{
  address: string;
  host?: string;
  services: string[];
  ttl: number;
  status?: "unreachable"|"online"|"running";
  version?: string;
}

/**
 * Necessary parameters to run the event loop.
 */
interface EventLoopParams{
  mdns?: MulticastDNS;
  randomDelay?: number;
}

/**
 * 
 */
interface QueryParams {
  mdns: MulticastDNS;
  services?: string[] = default_services;
  /**If not provided, use the default destination address (typ. broadcast) */
  address?: RemoteInfoOutgoing;
}

//export default async function* productScanner(params?: EventLoopParams) :AsyncGenerator<Host,void, undefined>;

/**
 * Scans for products on the network
 * by default, starts its own mdns server, waits for readiness and sends a query.
 * In this case, errors are transparently forwarded
 */
export default class ProductScanner extends EventEmitter{
  constructor(params?:EventLoopParams);

  /**
   * mdns errors, forwarded for convenience
   */
  on(eventName: "error", listener: (err:Error)=>any):this;
  on(eventName: "ready", listener: ()=>any):this;
  /**
   * added/updated node
   */
  on(eventName: "change", listener: (node:Host)=>any):this;
  /**
   * removed node's full hostname
   */
  on(eventName: "remove", listener: (node:string)=>any):this;

  close():void;
  /**
   * A list of hosts
   */
  async refresh(ids: string[]|IterableIterator<string>, timeout:number=500):Promise<void>;
}