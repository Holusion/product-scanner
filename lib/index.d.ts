import { ResponsePacket, MulticastDNS, RemoteInfoOutgoing } from "multicast-dns";
import {SrvAnswer, StringAnswer, TxtAnswer, StringAnswer} from "dns-packet";
import { Store } from "./loop";


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
}

/**
 * Necessary parameters to run the event loop.
 */
interface EventLoopParams{
  mdns: MulticastDNS;
  signal: AbortSignal;
}

interface LoopParams extends EventLoopParams{
  store: Store;
  /** Applies this additional delay to query requests. Defaults to a random value 0-2000ms but can be set to a predefined delay for tests */
  delay?: number;
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