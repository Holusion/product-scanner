'use strict';
const {test} = require('tap');
const {Node} = require("../lib/Node");


test("node.isSame()", function(t){
  const n = new Node({name: "foo"});
  t.test("requires a name",function(t){
    t.equal(n.isSame({}), false);
    t.end();
  })
  t.test("requires same name",function(t){
    t.equal(n.isSame({name: "foo"}), true);
    t.end();
  })
  t.test("return false if ref has no name",function(t){
    const n2 = new Node();
    t.equal(n2.isSame(new Node()), false);
    t.end();
  })
  t.test("return false if name is not a string",function(t){
    const n2 = new Node({name:null});
    t.equal(n2.isSame({name: null}), false);
    t.end();
  })
  t.test("return false name strings are not equal",function(t){
    const n2 = new Node({name:"foo"});
    t.equal(n2.isSame({name: "bar"}), false);
    t.end();
  })
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

test("Node.dial()",function(t){
  t.test("can dial to existing host 8.8.8.8:443",function(t){
    return Node.dial("8.8.8.8", 443);
  })
  t.test("can't dial to invalid host 127.0.0.1:5432",function(t){
    return t.rejects(Node.dial("127.0.0.1", 5432));
  });
  t.end();
})
