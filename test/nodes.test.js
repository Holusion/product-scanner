'use strict';
const {EventEmitter} = require("events");
jest.mock("net");
jest.mock("isomorphic-fetch");
const fetchMock = require("isomorphic-fetch");
const {connect: connectMock} = require("net");

const {BrowseError, nodes: {
  ip4Addr,
  ip6Addr,
  isSame, 
  mapAddresses, 
  merge, 
  dial, 
  isEqual, 
  deserialize, 
  fromService, 
  withStatus, 
  Node
}} = require("../lib");

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
  test("throws if deserialized object is invalid", function(){
    expect(()=>deserialize(undefined)).toThrow(BrowseError);
  })
  test("throws if deserialized object has no name", function(){
    expect(()=>deserialize({foo: "bar"})).toThrow(BrowseError);
  })
  test("accepts a deserialized service object", function(){
    expect(()=>deserialize({name: "foo"})).not.toThrow();
  });
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
  });
  test("throws if service object is invalid", function(){
    expect(()=>fromService(undefined)).toThrow(BrowseError);
  })
  test("throws if service object has no name", function(){
    expect(()=>fromService({foo: "bar"})).toThrow(BrowseError);
  })
  test("accepts a minimal service object", function(){
    expect(()=>fromService({name: "foo"})).not.toThrow();
  });
})

describe("nodes.isSame()", function(){
  const n = {name: "foo"};

  test("don't throw on unefined or null or empty objects",function(){
    expect(isSame(undefined, undefined)).toBe(false);
    expect(isSame(null, null)).toBe(false);
    expect(isSame({}, {})).toBe(false);
  })
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

describe("nodes.ip4Addr()", function(){
  test("parses missing addresses field", function(){
    expect(ip4Addr()).toBeUndefined();
    expect(ip4Addr({})).toBeUndefined();
  })
  test("skip ipv6 addresses", function(){
    expect(ip4Addr({addresses:["2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]})).toBeUndefined();
  })
  test("skip unknown addresses", function(){
    expect(ip4Addr({addresses:["foo.example.com"]})).toBeUndefined();
  })
  test("return ipv4 address", function(){
    expect(ip4Addr({addresses:["192.168.1.11", "2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0" ]})).toBe("192.168.1.11");
  })
  test("return first ipv4 address", function(){
    expect(ip4Addr({addresses:["192.168.1.11", "192.168.1.12" ]})).toBe("192.168.1.11");
  })
})


describe("nodes.ip6Addr()", function(){
  test("parses missing addresses field", function(){
    expect(ip6Addr()).toBeUndefined();
    expect(ip6Addr({})).toBeUndefined();
  })
  test("skip ipv4 addresses", function(){
    expect(ip6Addr({addresses:["192.168.1.11"]})).toBeUndefined();
  })
  test("return ipv6 address", function(){
    expect(ip6Addr({addresses:["192.168.1.11", "2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0" ]})).toBe("2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0");
  })
  test("return first ipv6 address", function(){
    expect(ip6Addr({addresses:["2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0", "2001:db8:85a3:8d3:1319:8a2e:370:7348%eth0" ]})).toBe("2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0");
  })
})


describe("nodes.mapAddresses()",function(){
  test("basic map", ()=>{
    const addrs = mapAddresses("eth0", ["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
    expect(addrs).toEqual(["192.168.1.1","2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  })
  test("return ipv4 adresses as-is", function(){
    const addrs = mapAddresses("eth0", ["192.168.1.1"])
    expect(addrs).toEqual(["192.168.1.1"]);
  })
  test("append interface to ipv6", function(){
    const addrs = mapAddresses("eth0", ["2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
    expect(addrs).toEqual(["2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  })
  test("append interface to ipv6", function(){
    const addrs = mapAddresses("eth0", ["2001:0db8:0000:85a3:0000:0000:ac1f:8001"])
    expect(addrs).toEqual(["2001:0db8:0000:85a3:0000:0000:ac1f:8001%eth0"]);
  })
  test("output a warning and filter invalid addresses", function(){
    const warnMock = jest.spyOn(global.console, 'warn');
    warnMock.mockImplementationOnce(()=>{});
    const addrs = mapAddresses("eth0", ["foo.example.com"])
    expect(addrs).toEqual([]);
    expect(warnMock).toHaveBeenCalled();
    warnMock.mockRestore();
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

describe("nodes.withStatus()", function(){

  beforeEach(()=>{
    connectMock.mockClear();
    fetchMock.mockReset();
  })

  test("returns a new node", async function(){
    const ref = Object.freeze({name: "toto", fullname:"foobar", custom_prop:[{custom_key:"bar"}]})
    const orig = deserialize(ref);
    expect(typeof orig.withStatus).toEqual("function");
    const n = await orig.withStatus();
    expect(n).toBeInstanceOf(Node);
    expect(n).toHaveProperty("status", "unreachable");
    for (let prop of ["name", "fullname", "custom_prop"]){
      expect(n[prop]).toBe(ref[prop]);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("don't update status if previously set and force==false", async function(){
    const ref = Object.freeze({name: "toto", fullname:"foobar", status:"online", addresses: ["192.168.1.11"]})
    const orig = deserialize(ref);
    expect(typeof orig.withStatus).toEqual("function");
    const n = await orig.withStatus({force: false});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(n).toBeInstanceOf(Node);
    expect(n).toHaveProperty("status", "online");
  });

  test("Keep assigned properties", async function(){
    const ref = Object.freeze({name: "toto", fullname:"foobar", version:"1.1.0", custom_prop:[{custom_key:"bar"}]})
    const n = await withStatus(ref);
    expect(n).toHaveProperty("status", "unreachable");
    expect(n).toHaveProperty("version", "1.1.0");
    expect(n).toHaveProperty("custom_prop", [{custom_key:"bar"}]);
    expect(fetchMock).not.toHaveBeenCalled();
  })

  describe("with an address", function(){
    let ref, orig;
    beforeEach(()=>{
      ref = Object.freeze({
        name: "toto", 
        fullname:"foobar", 
        addresses: ["192.168.1.11"],
      })
      orig = deserialize(ref);
    })
    test("will call fetch if node has an address", async ()=>{
      fetchMock.mockImplementationOnce(()=>Promise.resolve({ok: true, text: ()=>Promise.resolve("8.8.8")}));
      const n = await orig.withStatus();
      expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
      expect(n).toHaveProperty("version", "8.8.8");
      expect(n).toHaveProperty("status", "running");
    });
    test("handle unexpected fetch response codes", async ()=>{
      fetchMock.mockImplementationOnce(()=>Promise.resolve({ok: false, statusText: "Internal Error"}));
      const n = await orig.withStatus();
      expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
      expect(n).toHaveProperty("version", "0.0.0");
      expect(n).toHaveProperty("status", "online");
    });
    ["ECONNRESET", "ECONNREFUSED"].forEach((code)=>{
      test("handle fetch error ECONNRESET by falling back to dial()", async ()=>{
        fetchMock.mockImplementationOnce(()=>Promise.reject({code}));
        const n = await orig.withStatus();
        expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
        expect(connectMock).toHaveBeenCalledTimes(1);
        expect(n).toHaveProperty("version", "0.0.0");
        expect(n).toHaveProperty("status", "online");
      });
    });
  
    test("handle fetch error request-timeout by falling back to dial()", async ()=>{
      fetchMock.mockImplementationOnce(()=>Promise.reject({type: 'request-timeout'}));
      const n = await orig.withStatus();
      expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
      expect(connectMock).toHaveBeenCalledTimes(1);
      expect(n).toHaveProperty("version", "0.0.0");
      expect(n).toHaveProperty("status", "online");
    });
    describe("fallback to dial() is properly handled on error", ()=>{
      let logMock;
      beforeAll(()=>{
        logMock = jest.spyOn(global.console, "log");
        logMock.mockImplementation(()=>{});
      })
      beforeEach(()=>{
        logMock.mockClear();
      })
      afterAll(()=>{
        logMock.mockRestore();
      })
      it("on connect ETIMEDOUT", async ()=>{
        connectMock.mockImplementationOnce(()=>{
          let e = new EventEmitter();
          e.destroy = jest.fn();
          setImmediate(()=>e.emit("timeout"));
          return e;
        });
        fetchMock.mockImplementationOnce(()=>Promise.reject({type: 'request-timeout'}));
        const n = await orig.withStatus();
        expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
        expect(connectMock).toHaveBeenCalledTimes(1);
        expect(logMock).not.toHaveBeenCalled();
        expect(n).toHaveProperty("version", "0.0.0");
        expect(n).toHaveProperty("status", "unreachable");
      })

      it("on connect anormal error", async ()=>{
        connectMock.mockImplementationOnce(()=>{
          let e = new EventEmitter();
          e.destroy = jest.fn();
          setTimeout(()=> e.emit("error", new Error("foo")), 0);
          return e;
        });
        fetchMock.mockImplementationOnce(()=>Promise.reject({type: 'request-timeout'}));
        const n = await orig.withStatus();
        expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
        expect(connectMock).toHaveBeenCalledTimes(1);
        expect(logMock).toHaveBeenCalledTimes(1);
        expect(n).toHaveProperty("version", "0.0.0");
        expect(n).toHaveProperty("status", "unreachable");
      });
    });

    test("handle fetch error EHOSTUNREACH by leaving product as unreachable", async ()=>{
      fetchMock.mockImplementationOnce(()=>Promise.reject({code: "EHOSTUNREACH"}));
      const n = await orig.withStatus();
      expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
      expect(connectMock).not.toHaveBeenCalled();
      expect(n).toHaveProperty("version", "0.0.0");
      expect(n).toHaveProperty("status", "unreachable");
    });

    test("handle fetch error ENOTFOUND by leaving product as unreachable", async ()=>{
      fetchMock.mockImplementationOnce(()=>Promise.reject({code: 'ENOTFOUND'}));
      const n = await orig.withStatus();
      expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
      expect(connectMock).not.toHaveBeenCalled();
      expect(n).toHaveProperty("version", "0.0.0");
      expect(n).toHaveProperty("status", "unreachable");
    });

    test("handle unspecified fetch error by leaving product as unreachable and printing a warning", async ()=>{
      const warnMock = jest.spyOn(global.console, "warn");
      warnMock.mockImplementation(()=>{});
      fetchMock.mockImplementationOnce(()=>Promise.reject(new Error("foo")));
      const n = await orig.withStatus();
      expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.11/system/version", {timeout: expect.anything(), headers: {"Accept": "text/plain"}});
      expect(connectMock).not.toHaveBeenCalled();
      expect(n).toHaveProperty("version", "0.0.0");
      expect(n).toHaveProperty("status", "unreachable");
      expect(warnMock).toHaveBeenCalledWith("Fetch failed on %s with unhandled error :", "http://192.168.1.11/system/version", new Error("foo"));
      warnMock.mockRestore();
    });
  });
});
  

describe("nodes.dial()",function(){
  let e;
  beforeEach(()=>{
    e = new EventEmitter();
    e.destroy = jest.fn();
    connectMock.mockImplementationOnce(()=>e);
  })
  test("dial when connect succeeds",function(done){
    dial("8.8.8.8", 443).then(()=> {
      expect(e.destroy).toHaveBeenCalledTimes(1);
      done();
    }, done);
    e.emit("connect");
  })
  test("can't dial to invalid host 127.0.0.1:5432",function(){
    let p = expect(dial("127.0.0.1", 5432)).rejects.toThrow("foo");
    e.emit("error", new Error("foo"))
    return p;
  });
  test("emit a specific error on timeout",function(){
    let p = expect(dial("127.0.0.1", 5432)).rejects.toThrow(expect.objectContaining({code: "ETIMEDOUT"}));
    e.emit("timeout");
    return p;
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
