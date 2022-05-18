'use strict';

export const default_services = [
  "_holusion._tcp.local",
  "_workstation._tcp.local",
  "_ssh._tcp.local",
];


/**
 * 
 * @param {object} param0 
 * @param {import("multicast-dns").MulticastDNS} param0.mdns
 * @param {string[]} [param0.services]
 * @param {string} [param0.address]
 */
 export async function query({mdns, services=default_services, address}){
   if(typeof mdns?.query !== "function") throw new Error(`Invalid MulticastDns instance : ${mdns}`);
  return await new Promise((resolve, reject) => mdns.query(
    /** @type {Array<{type:"PTR"|"A", name: string}>} */
    services.map(name => ({ 
      type: "PTR",
      name,
    })),
    address?{port:5353, address}: null,
    (err)=>err?reject(err):resolve()
  ));
}

/**
 * 
 * @param {import("./types").Host} host 
 * @returns {boolean}
 */
 export function isProduct(host, services=default_services){
  return !!host.host 
      && !!host.address 
      && host.services?.length 
      && ( //Require either all default services (deprecated  as of 4.3.0 ) or _holusion._tcp.local
        services.slice(1).every(s=>host.services.indexOf(s) !== -1)
        || host.services.indexOf("_holusion._tcp.local") !==-1
      ) || false;
}
