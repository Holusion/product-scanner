'use strict';

module.exports = function createService(name, opts){
  return Object.assign({
    interfaceIndex: 2,
    type: {
       name: 'workstation',
       protocol: 'tcp',
       subtypes: [],
       fullyQualified: true },
    replyDomain: 'local.',
    flags: 2,
    name: `${name} [94:c6:91:a4:5c:0f]`,
    networkInterface: 'eth0',
    fullname: `${name}\\032\\09194\\058c6\\05891\\058a4\\0585c\\0580f\\093._workstation._tcp.local.`,
    host: `${name}.local.`,
    port: 9,
    addresses: [ '192.168.1.126' ],
  }, opts);
}
