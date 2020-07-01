'use strict';
const {isSame, mapAddresses, merge, dial, isEqual, deserialize, fromService, withStatus, Node} = require("../lib/nodes");

describe("nodes.deserialize()", function(){
  test("returns an object with a withStatus() function", function(){
    const i = deserialize({name:"foo"});
    expect(typeof i.withStatus).toBe('function');
    expect(i.name).toBe("foo")
  })
  test("deserialize a typical database item", function(){
    const i = deserialize({
      name:"foo",
      configuration_data: [
        "some",
        "data",
        {foo:"bar"}
      ]
    });
    expect(i).toMatchSnapshot();
  })
})

describe("nodes.fromService()", function(){
  test("build from a typical service", function(){
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
    expect(i).toMatchSnapshot();
  })
})

describe("nodes.isSame()", function(){
  const n = {name: "foo"};
  test("requires a name",function(){
    expect(isSame(n, {})).toBe(false);
  })
  test("requires same name",function(){
    expect(isSame(n, {name: "foo"})).toBe(true);
  })
  test("return false if name is not a string",function(){
    expect(isSame({name:null}, {name: null})).toBe(false);
  })
  test("return false name strings are not equal",function(){
    expect(isSame({name:"foo"}, {name: "bar"})).toBe(false);
  })
})

describe("nodes.mapAddresses()",function(){
  test("map", ()=>{
    const addrs = mapAddresses("eth0", ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
    expect(addrs).toEqual(["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  })
})

describe("nodes.merge()", function(){
  test("new node overwrite values", function(){
    const n1 = {name: "toto", foo:"something"}
    const n2 = {name: "toto", foo:"something_else"}
    const n3 = merge(n1, n2);
    expect(n3).toEqual(n2);
  });

  test("keep known values",function(){
    const n1 = {name: "toto", fullname:"foobar", custom_prop:"foo"}
    const n2 = {name: "toto"}
    const n3 = merge(n1, n2);
    expect(n3.fullname).toBe("foobar");
    expect(n3.custom_prop).toBe("foo");
  })
  
  test("can merge invalid values",function(){
    const n1 = {name: "toto", bar:"foobar"}
    const n2 = merge(n1, null);
    expect(n2).toEqual({name: "toto", bar:"foobar"});
  })
  
  test("Keeps Node.withStatus() working", async function(){
    const n1 = {name: "toto", fullname:"foobar", custom_prop:"foo"}
    const n2 = {name: "toto"}
    const n3 = merge(n1, n2);
    expect(typeof n3.withStatus).toEqual("function");
    const n4 = await n3.withStatus();
    expect(n4).toEqual(Object.assign(n3, {status: "unreachable"}));
  })
})

describe("nodes.withStatus", function(){

  test("Keep assigned properties", async function(){
    const ref = Object.freeze({name: "toto", fullname:"foobar", custom_prop:[{custom_key:"bar"}]})
    const n = await withStatus(ref);
    ["name", "fullname", "custom_prop"].forEach(prop=> expect(n[prop]).toEqual(ref[prop]));
  })

  test("returns a new node", async function(){
    const ref = Object.freeze({name: "toto", fullname:"foobar", custom_prop:[{custom_key:"bar"}]})
    const orig = deserialize(ref);
    expect(typeof orig.withStatus).toEqual("function");
    const n = await orig.withStatus();
    expect(n).toBeInstanceOf(Node);
    for (let prop of ["name", "fullname", "custom_prop"]){
      expect(n[prop]).toBe(ref[prop]);
    }
  });
});

describe("nodes.dial()",function(){
  test("can dial to existing host 8.8.8.8:443",function(){
    return expect(dial("8.8.8.8", {port:443, timeout: 150})).resolves.toBeUndefined();
  })
  test("can't dial to invalid host 127.0.0.1:5432",function(){
    return expect(dial("127.0.0.1", {port:5432, timeout: 150})).rejects.toThrow();
  });
})

describe("nodes.isEqual()", function(){
  test("same object is equal",function(){
    const o = deserialize({name:"foo"});
    expect(isEqual(o, o)).toBeTruthy();
  })
  test("deep-equal object is equal",function(){
    expect(isEqual( deserialize({name:"foo"}), deserialize({name:"foo"}))).toBeTruthy();
  })
  test("different object is not equal",function(){
    expect(
      isEqual( deserialize({name:"foo"}), deserialize({name:"foo", version:"1.0.0"}))
    ).toBeFalsy();
  })
})
