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

test("Node.merge()",function(t){
  t.test("new node overwrite values",function(t){
    const n1 = new Node({name: "toto", foo:"something"})
    const n2 = new Node({name: "toto", foo:"something_else"})
    n1.merge(n2);
    t.deepEqual(n1, n2);
    t.end();
  });
  t.test("keep known values",function(t){
    const n1 = new Node({name: "toto", fullname:"foobar"})
    const n2 = new Node({name: "toto"})
    n1.merge(n2);
    t.equal(n1.fullname, "foobar");
    t.end();
  })
  t.test("delete unknown values",function(t){
    const n1 = new Node({name: "toto", bar:"foobar"})
    const n2 = new Node({name: "toto"})
    n1.merge(n2);
    t.equal(typeof n1.bar, "undefined");
    t.end();
  })
  
  t.test("can merge invalid values",function(t){
    const n1 = new Node({name: "toto", bar:"foobar"})
    n1.merge(null);
    t.deepEqual(n1, new Node({name: "toto", bar:"foobar"}));
    t.end();
  })
  t.end();
})
