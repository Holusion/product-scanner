'use strict';

const {test} = require('tap');
const {createServiceObject } = require("./service_mocks");
const mdns = require("mdns");

const {Scanner, } = require("../lib/Scanner");
const {fromService, deserialize} = require("../lib/nodes");
const {BrowseError} = require("../lib/errors");

function delay(t){ return new Promise((r)=> setTimeout(r, t))};

test('Scanner.findIndex()',function(t){
  const s = new Scanner({autostart: false}); //do not auto-start
  s._data = [
    fromService(createServiceObject("foo-01")),
    fromService(createServiceObject("foo-02"))
  ];
  t.test("return -1 when not found",function(t){
    t.equal(s.findIndex(fromService(createServiceObject("foo-03"))), -1);
    t.end();
  })
  t.test("return index when found",function(t){
    t.equal(s.findIndex(fromService(createServiceObject("foo-02"))), 1);
    t.end();
  })
  t.end();
})

test('Scanner.add()',function(t){
  t.test("Emit error on invalid product",function(t){
    const s = new Scanner({autostart: false}); //do not auto-start
    s.on("error",function(e){
      t.type(e, BrowseError);
      t.equal(e.name, "BrowseError");
      t.end();
    })
    s.on("change",function(){throw new Error("No change event should be emitted")});
    s.add({});
  })

  t.test("emit change event",function(t){
    const s = new Scanner({autostart: false}); //do not auto-start
    const obj = createServiceObject("foo-01", {fullname:"foo-01-unique-name"});
    const obj2 = Object.assign({}, obj, {status: "running"});
    s.once("change",function(list){
      t.type(list, Array);
      t.equal(list.length, 1);
      s.once("change", function(list){
        t.equal(list[0].status, "running");
        t.end()
      });
      s.add(fromService(obj2));
    });
    s.add(fromService(obj));
  })
  t.end();
});

test("Scanner.remove()", function(t){
  t.beforeEach(function(done, t){
    t.context.obj = fromService(createServiceObject("foo-01", {fullname:"foo-01-unique-name"}));
    t.context.s = new Scanner({autostart: false});
    t.context.s.add(t.context.obj);
    done();
  })
  t.test("emit change event",function(t){
    t.context.s.on("change",function(list){
      t.equal(list.length, 0);
      t.end();
    })
    t.context.s.remove({name: t.context.obj.name});
  })
  t.test("emit remove event",function(t){
    t.context.s.on("remove",function(n){
      t.equal(n.name, t.context.obj.name);
      t.end();
    })
    t.context.s.remove({name: t.context.obj.name});
  })
  t.end();
})
test("Scanner lock", function(t){
  const s = new Scanner({autostart: false});
  let count =0;
  s.lock(async function(){
    await delay(10)
    t.equal(count++,0);
  });
  s.lock(function(){
    t.equal(count++,1);
    t.end()
  });
})

test("Scanner refresh",function(t){
  let s;
  t.beforeEach(function(done, t){
    s = new Scanner({autostart: false});
    t.context.objects = [
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

  t.test("update list", (t)=>{
    return s.refresh()
    .then(()=>{
      t.equal(s.list[0].version,"3.0.0");
    })
  })
  t.test("emit change event", function(t){
    //Make sure we don't catch the first "change" event
    s.on("change",function(){
      t.equal(s.list[0].version,"3.0.0");
      t.end()
    })
    s.refresh();
  })
  t.test("emit update event", function(t){
    //Make sure we don't catch the first "change" event
    s.on("update", function(n){
      t.equal(n.version,"3.0.0");
      t.end()
    })
    s.refresh();
  })
  t.test("Event is emitted after list has been updated", function(t){
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
      t.equal(s.list[0], n);
      t.equal(s.list[0].version,"foofoo");
      t.end()
    })
    s.refresh();
  })
  t.end();
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
