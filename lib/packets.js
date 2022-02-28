'use strict';
/**
 * 
 * @param {import("multicast-dns").ResponsePacket} packet
 * @returns {import(".").ParsedPacket}
 */
 export function parse(packet){
  return {
    SRV:[],
    PTR: [],
    A: [],
    AAAA: [],
    TXT: [],
    ...packet.answers.concat(packet.additionals).reduce((rest, a)=>({...rest, [a.type]: [...(rest[a.type]|| []), a]}), {})
  };
}

/**
 * Map a packet onto ip addresses
 * @param {import(".").ParsedPacket} packet
 * @returns {IterableIterator<import(".").Host>}
 */
export function* combineHosts({A, SRV, PTR}){
  for (let a of A){
    let srvList = SRV.filter(srv=> srv.data.target === a.name);
    let ptrList = srvList.map((srv)=>PTR.find(ptr=>ptr.data === srv.name)).filter(ptr=>ptr);
    yield {
      address: a.data,
      host: srvList[0]?.data.target,
      services: ptrList.map(ptr=> ptr.name),
      ttl: Math.min(...ptrList.map(ptr=>ptr.ttl), 4500),
    }
  }
}
