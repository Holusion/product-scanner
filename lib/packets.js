'use strict';
/**
 * 
 * @param {import("multicast-dns").ResponsePacket} packet
 * @returns {import("./types").ParsedPacket}
 */
 export function parse(packet){
   let answers = packet.answers.concat(packet.additionals).reduce((rest, a)=>({...rest, [a.type]: [...(rest[a.type]|| []), a]}), {});
  return {
    SRV:[],
    PTR: [],
    A: [],
    AAAA: [],
    ...answers,
    // @ts-ignore
    TXT: [...answers.TXT ?? []].map(txt => {
      let str = txt.data.toString("utf8")
      let m = /^(.+)=(.+)$/.exec(str);
      return {
        ...txt, 
        data: (m? {[m[1]]:m[2]}: str),
      }
    }),
  };
}

/**
 * Map a packet onto ip addresses
 * @param {import("./types").ParsedPacket} packet
 * @returns {IterableIterator<import("./types").Host>}
 */
export function* combineHosts({A, SRV, PTR, TXT}){
  for (let a of A){
    let srvList = SRV.filter(srv=> srv.data.target === a.name);
    let ptrList = srvList.map((srv)=>PTR.find(ptr=>ptr.data === srv.name)).filter(ptr=>ptr);
    let holusionService = ptrList.find(ptr=> ptr.name === "_holusion._tcp.local");
    // @ts-ignore
    let holusionTxt = TXT.find(txt=> txt.name === holusionService?.data.toString("utf8"));
    // @ts-ignore
    let version = holusionTxt?.data?.version;
    yield {
      address: a.data,
      host: srvList[0]?.data.target,
      services: ptrList.map(ptr=> ptr.name),
      ttl: Math.min(...ptrList.map(ptr=>ptr.ttl), 4500),
      version,
      status: ((version) ? "running": "online"),
    }
  }
}
/**
 * Shortcut for parse and combineHosts that returns only the first host in the serie
 * @param {import("multicast-dns").ResponsePacket} packet 
 */
export function getHost(packet){
  let it =  combineHosts(parse(packet));
  let host = it.next().value;
  if(!it.next().done) throw new Error("Unexpected packet mapping to more than one host");
  return host;
}