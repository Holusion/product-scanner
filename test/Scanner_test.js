'use strict';

const {test} = require('tap');
const {createServiceObject } = require("./service_mocks");
const mdns = require("mdns");

const {Scanner, } = require("../lib/Scanner");
const {Node} = require("../lib/Node");
const {BrowseError} = require("../lib/errors");

function delay(t){ return new Promise((r)=> setTimeout(r, t))};

test('Scanner.findIndex()',function(t){
  const s = new Scanner({autostart: false}); //do not auto-start
  s._data = [
    Node.createFromService(createServiceObject("foo-01")),
    Node.createFromService(createServiceObject("foo-02"))
  ];
  t.test("return -1 when not found",function(t){
    t.equal(s.findIndex(Node.createFromService(createServiceObject("foo-03"))), -1);
    t.end();
  })
  t.test("return index when found",function(t){
    t.equal(s.findIndex(Node.createFromService(createServiceObject("foo-02"))), 1);
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
    s.on("change",function(list){
      t.type(list, Array);
      t.equal(list.length, 1);
      t.end();
    });
    s.add(Node.createFromService(obj));
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
