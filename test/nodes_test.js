'use strict';
const {test} = require('tap');
const {isSame, mapAddresses, merge, dial} = require("../lib/nodes");


test("nodes.isSame()", function(t){
  const n = {name: "foo"};
  t.test("requires a name",function(t){
    t.equal(isSame(n, {}), false);
    t.end();
  })
  t.test("requires same name",function(t){
    t.equal(isSame(n, {name: "foo"}), true);
    t.end();
  })
  t.test("return false if name is not a string",function(t){
    t.equal(isSame({name:null}, {name: null}), false);
    t.end();
  })
  t.test("return false name strings are not equal",function(t){
    t.equal(isSame({name:"foo"}, {name: "bar"}), false);
    t.end();
  })
  t.end();
})

test("mapAddresses()",function(t){
  const addrs = mapAddresses("eth0", ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
  t.deepEqual(addrs, ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  t.end();
})

test("merge()",function(t){
  t.test("new node overwrite values",function(t){
    const n1 = {name: "toto", foo:"something"}
    const n2 = {name: "toto", foo:"something_else"}
    const n3 = merge(n1, n2);
    t.deepEqual(n3, n2);
    t.end();
  });
  t.test("keep known values",function(t){
    const n1 = {name: "toto", fullname:"foobar"}
    const n2 = {name: "toto"}
    const n3 = merge(n1, n2);
    t.equal(n3.fullname, "foobar");
    t.end();
  })
  
  t.test("can merge invalid values",function(t){
    const n1 = {name: "toto", bar:"foobar"}
    const n2 = merge(n1, null);
    t.deepEqual(n2, {name: "toto", bar:"foobar"});
    t.end();
  })
  t.end();
})

test("dial()",function(t){
  t.test("can dial to existing host 8.8.8.8:443",function(t){
    return dial("8.8.8.8", 443);
  })
  t.test("can't dial to invalid host 127.0.0.1:5432",function(t){
    return t.rejects(dial("127.0.0.1", 5432));
  });
  t.end();
})
