'use strict';
const {test} = require('tap');
const {isSame, mapAddresses, merge, dial, isEqual, deserialize, fromService, withStatus, Node} = require("../lib/nodes");


test("nodes.deserialize()", function(t){
  t.test("returns an object with a withStatus() function", function(t){
    const i = deserialize({name:"foo"});
    t.type(i.withStatus, 'function');
    t.equal(i.name, "foo")
    t.end();
  })
  t.test("deserialize a typical database item", function(t){
    const i = deserialize({
      name:"foo",
      configuration_data: [
        "some",
        "data",
        {foo:"bar"}
      ]
    })
    t.matchSnapshot(i, "deserialized");
    t.end();
  })
  t.end();
})
test("nodes.fromService()", function(t){
  t.test("build from a typical service", function(t){
    const i = fromService({ interfaceIndex: 2,
      type: {
         name: 'workstation',
         protocol: 'tcp',
         subtypes: [],
         fullyQualified: true },
      replyDomain: 'local.',
      flags: 2,
      name: 'holopi-07 [b8:27:eb:16:fe:ce]',
      networkInterface: 'eth0',
      fullname:
       'holopi-07\\032\\091b8\\05827\\058eb\\05816\\058fe\\058ce\\093._workstation._tcp.local.',
      host: 'holopi-07.local.',
      port: 9,
      addresses: [ '192.168.1.129' ] })
    t.matchSnapshot(i, "fromService");
    t.end();
  })
  t.end();
})
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

test("nodes.mapAddresses()",function(t){
  const addrs = mapAddresses("eth0", ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
  t.deepEqual(addrs, ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  t.end();
})

test("nodes.merge()", async function(t){
  await t.test("new node overwrite values",function(t){
    const n1 = {name: "toto", foo:"something"}
    const n2 = {name: "toto", foo:"something_else"}
    const n3 = merge(n1, n2);
    t.deepEqual(n3, n2);
    t.end();
  });
  await t.test("keep known values",function(t){
    const n1 = {name: "toto", fullname:"foobar", custom_prop:"foo"}
    const n2 = {name: "toto"}
    const n3 = merge(n1, n2);
    t.equal(n3.fullname, "foobar");
    t.equal(n3.custom_prop, "foo");
    t.end();
  })
  
  await t.test("can merge invalid values",function(t){
    const n1 = {name: "toto", bar:"foobar"}
    const n2 = merge(n1, null);
    t.deepEqual(n2, {name: "toto", bar:"foobar"});
    t.end();
  })
  
  await t.test("Keeps Node.withStatus() working", async function(t){
    const n1 = {name: "toto", fullname:"foobar", custom_prop:"foo"}
    const n2 = {name: "toto"}
    const n3 = merge(n1, n2);
    t.type(n3.withStatus, "function");
    const n4 = await n3.withStatus();
    t.deepEqual(n4, Object.assign(n3, {status: "unreachable"}));
  })
})
test("nodes.withStatus", async function(t){
  await t.test("Keep assigned properties", async function(t){
    const ref = Object.freeze({name: "toto", fullname:"foobar", custom_prop:[{custom_key:"bar"}]})
    const n = await withStatus(ref);
    ["name", "fullname", "custom_prop"].forEach(prop=> t.deepEqual(n[prop], ref[prop]));
  })
  await t.test("returns a new node", async function(t){
    const ref = Object.freeze({name: "toto", fullname:"foobar", custom_prop:[{custom_key:"bar"}]})
    const orig = deserialize(ref);
    t.type(orig.withStatus, "function");
    const n = await orig.withStatus();
    t.type(n, Node);
    for (let prop of ["name", "fullname", "custom_prop"]){
      t.equal(n[prop], ref[prop]);
    }
  });
});

test("nodes.dial()",function(t){
  t.test("can dial to existing host 8.8.8.8:443",function(t){
    return dial("8.8.8.8", {port:443, timeout: 150});
  })
  t.test("can't dial to invalid host 127.0.0.1:5432",function(t){
    return t.rejects(dial("127.0.0.1", {port:5432, timeout: 150}));
  });
  t.end();
})

test("nodes.isEqual()", function(t){
  t.test("same object is equal",function(t){
    const o = deserialize({name:"foo"});
    t.ok(isEqual(o, o));
    t.end();
  })
  t.test("deep-equal object is equal",function(t){
    t.ok(isEqual( deserialize({name:"foo"}), deserialize({name:"foo"})));
    t.end();
  })
  t.test("different object is not equal",function(t){
    t.notOk(isEqual( deserialize({name:"foo"}), deserialize({name:"foo", version:"1.0.0"})));
    t.end();
  })
  t.end();
})
