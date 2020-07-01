'use strict';
const {Node} = require("../lib/Node");


describe("node.isSame()", function(){
  let n;
  beforeEach(()=>{
    n = new Node({name: "foo"});
  })
  test("requires a name",function(){
    expect(n.isSame({})).toBe(false);
  })
  test("requires same name",function(){
    expect(n.isSame({name: "foo"})).toBe(true);
  })
  test("return false if ref has no name",function(){
    const n2 = new Node();
    expect(n2.isSame(new Node())).toBe(false);
  })
  test("return false if name is not a string",function(){
    const n2 = new Node({name:null});
    expect(n2.isSame({name: null})).toBe(false);
  })
  test("return false name strings are not equal",function(){
    const n2 = new Node({name:"foo"});
    expect(n2.isSame({name: "bar"})).toBe(false);
  })
})

describe("Node.mapAddresses()",function(){
  test("map addresses", function(){
    const addrs = Node.mapAddresses("eth0", ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
    expect(addrs).toEqual(["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  })
})

describe("Node.merge()",function(){
  test("new node overwrite values",function(){
    const n1 = new Node({name: "toto", foo:"something"})
    const n2 = new Node({name: "toto", foo:"something_else"})
    n1.merge(n2);
    expect(n1).toEqual(n2);
  });
  test("keep known values",function(){
    const n1 = new Node({name: "toto", fullname:"foobar"})
    const n2 = new Node({name: "toto"})
    n1.merge(n2);
    expect(n1.fullname).toBe("foobar");
  })
  test("delete unknown values",function(){
    const n1 = new Node({name: "toto", bar:"foobar"})
    const n2 = new Node({name: "toto"})
    n1.merge(n2);
    expect(typeof n1.bar).toBe("undefined");
  })
  
  test("can merge invalid values",function(){
    const n1 = new Node({name: "toto", bar:"foobar"})
    n1.merge(null);
    expect(n1).toEqual(new Node({name: "toto", bar:"foobar"}));
  })
})

describe("Node.dial()",function(){
  test("can dial to existing host 8.8.8.8:443",function(){
    return expect(Node.dial("8.8.8.8", 443)).resolves.toBeUndefined();
  })
  test("can't dial to invalid host 127.0.0.1:5432",function(){
    return expect(Node.dial("127.0.0.1", 5432)).rejects.toThrow();
  });
})
