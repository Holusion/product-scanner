'use strict';

const {createServiceObject } = require("./__mocks__/service_mocks");
const mdns = require("mdns");

const {Scanner, } = require("../lib/Scanner");
const {fromService, deserialize} = require("../lib/nodes");
const {BrowseError} = require("../lib/errors");

function delay(t){ return new Promise((r)=> setTimeout(r, t))};

describe('Scanner.findIndex()',function(){
  let s;
  beforeEach(()=>{
    s = new Scanner({autostart: false}); //do not auto-start
    s._data = [
      fromService(createServiceObject("foo-01")),
      fromService(createServiceObject("foo-02"))
    ];
  })

  test("return -1 when not found",function(){
    expect(s.findIndex(fromService(createServiceObject("foo-03")))).toBe(-1);
  })
  test("return index when found",function(){
    expect(s.findIndex(fromService(createServiceObject("foo-02")))).toBe(1);
  })
})

describe('Scanner.add()',function(){
  test("Emit error on invalid product",function(done){
    const s = new Scanner({autostart: false}); //do not auto-start
    s.on("error",function(e){
      expect(e).toBeInstanceOf(BrowseError);
      expect(e.name).toBe("BrowseError");
      done()
    })
    s.on("change",function(){throw new Error("No change event should be emitted")});
    s.add({});
  })

  test("emit change event",function(done){
    const s = new Scanner({autostart: false}); //do not auto-start
    const obj = createServiceObject("foo-01", {fullname:"foo-01-unique-name"});
    const obj2 = Object.assign({}, obj, {status: "running"});
    s.once("change",function(list){
      expect(list).toBeInstanceOf(Array);
      expect(list.length).toBe(1);
      s.once("change", function(list){
        expect(list[0].status).toBe("running");
        done()
      });
      s.add(fromService(obj2));
    });
    s.add(fromService(obj));
  })
});

describe("Scanner.remove()", function(){
  let obj, s;
  beforeEach(function(){
    obj = fromService(createServiceObject("foo-01", {fullname:"foo-01-unique-name"}));
    s = new Scanner({autostart: false});
    s.add(obj);
  })
  test("emit change event",function(){
    s.on("change",function(list){
      expect(list.length).toBe(0);
    })
    s.remove({name: obj.name});
  })
  test("emit remove event",function(){
    s.on("remove",function(n){
      expect(n.name).toBe(obj.name);
    })
    s.remove({name: obj.name});
  })
})
describe("Scanner lock", function(){
  let s;
  beforeEach(()=>{
    s = new Scanner({autostart: false});
  });

  test("check lock", function(done){
    let count =0;
    s.lock(async function(){
      await delay(10)
      expect(count++).toBe(0);
    });
    s.lock(function(){
      expect(count++).toBe(1);
      done()
    });
  })
})

describe("Scanner refresh",function(){
  let s, objects;
  beforeEach(function(done){
    s = new Scanner({autostart: false});
    objects = [
      deserialize({name:"foo"}),
      deserialize({name: "bar"})
    ].map((obj)=>{
      obj.withStatus = function() {
        return Promise.resolve(Object.assign({}, this, obj.name == "foo"?{version: "3.0.0"}: {}))
      };
      s.add(obj);
      return obj;
    })
    done();
  })

  test("update list", ()=>{
    return s.refresh()
    .then(()=>{
      expect(s.list[0].version).toBe("3.0.0");
    });
  })
  test("emit change event", function(done){
    //Make sure we don't catch the first "change" event
    s.on("change",function(){
      expect(s.list[0].version).toBe("3.0.0");
      done()
    })
    s.refresh();
  })
  test("emit update event", function(done){
    //Make sure we don't catch the first "change" event
    s.on("update", function(n){
      expect(n.version).toBe("3.0.0");
      done()
    })
    s.refresh();
  })
  test("Event is emitted after list has been updated", function(done){
    s.list[0].withStatus = function(){
      const res = Object.assign({}, s.list[0], {version: "foofoo"});
      return new Promise(r=>{
        setTimeout(()=> r(res), 10);
      })
    }
    s.list[1].withStatus = function(){
      const res = Object.assign({}, s.list[1]);
      return new Promise(r=>{
        setTimeout(()=> r(res), 60);
      })
    }
    s.on("update", function(n){
      expect(s.list[0]).toBe(n);
      expect(s.list[0].version).toBe("foofoo");
      done()
    })
    s.refresh();
  })
})
/* Disabled because lo interface does not work on linux so it causes trouble on the network
test("Scanner activity", async function(t){
  const s = new Scanner({autostart: true});
  const sv = mdns.createAdvertisement(mdns.tcp('workstation') , 9876, {})
  sv.start();
  await t.test("add service",function(t){
    return new Promise((resolve, reject)=>{
      s.once("add",function(node){
        t.notOk(node.version);
        t.equal(node.status,"online");
        resolve();
      })
    })
  })

  await t.test("remove service",function(t){
    return new Promise((resolve, reject)=>{
      s.once("remove",function(node){
        t.ok(node);
        //console.log("REMOVE NODE : ", node);
        resolve();
      })
      sv.stop();
    })
  });
  s.stop();

})
*/
