'use strict';
const {test} = require('tap');
const {Node} = require("../lib/Node");


test("node.isSame()", function(t){
  const n = new Node({name: "foo"});
  const n2 = new Node({name: "bar"});
  const n3 = new Node({name: "foo"});
  t.equal(n.isSame(n2), false);
  t.equal(n.isSame(n3), true);
  t.end();
})

test("Node.mapAddresses()",function(t){
  const addrs = Node.mapAddresses("eth0", ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
  t.deepEqual(addrs, ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  t.end();
})
