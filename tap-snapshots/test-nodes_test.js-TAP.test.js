/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/nodes_test.js TAP nodes.deserialize() deserialize a typical database item > deserialized 1`] = `
Object {
  "addresses": Array [],
  "configuration_data": Array [
    "some",
    "data",
    Object {
      "foo": "bar",
    },
  ],
  "name": "foo",
  "version": "0.0.0",
  "withStatus": AsyncFunction bound withStatus(),
}
`

exports[`test/nodes_test.js TAP nodes.fromService() build from a typical service > fromService 1`] = `
Object {
  "addresses": Array [
    "192.168.1.129",
  ],
  "flags": 2,
  "fullname": "holopi-07\\\\032\\\\091b8\\\\05827\\\\058eb\\\\05816\\\\058fe\\\\058ce\\\\093._workstation._tcp.local.",
  "host": "holopi-07.local.",
  "interfaceIndex": 2,
  "mac": "[b8:27:eb:16:fe:ce]",
  "name": "holopi-07",
  "networkInterface": "eth0",
  "port": 9,
  "replyDomain": "local.",
  "type": Object {
    "fullyQualified": true,
    "name": "workstation",
    "protocol": "tcp",
    "subtypes": Array [],
  },
  "version": "0.0.0",
  "withStatus": AsyncFunction bound withStatus(),
}
`
