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
  signal?: AbortSignal;
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

export default async function* productScanner(params?: EventLoopParams) :AsyncGenerator<Host,void, undefined>;