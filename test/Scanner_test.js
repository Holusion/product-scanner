'use strict';

const {test} = require('tap');
const createService = require("./service_mock");

const {Scanner} = require("../lib/Scanner");
const {Node} = require("../lib/Node");
const {BrowseError} = require("../lib/errors");
test('Scanner.findIndex()',function(t){
  const s = new Scanner(false); //do not auto-start
  s._data = [
    Node.createFromService(createService("foo-01")),
    Node.createFromService(createService("foo-02"))
  ];
  t.test("return -1 when not found",function(t){
    t.equal(s.findIndex(Node.createFromService(createService("foo-03"))), -1);
    t.end();
  })
  t.test("return index when found",function(t){
    t.equal(s.findIndex(Node.createFromService(createService("foo-02"))), 1);
    t.end();
  })
  t.end();
})

test('Scanner.add()',function(t){
  t.test("Emit error on invalid product",function(t){
    const s = new Scanner(false); //do not auto-start
    s.on("error",function(e){
      t.type(e, BrowseError);
      t.equal(e.name, "BrowseError");
      t.end();
    })
    s.on("change",function(){throw new Error("No change event should be emitted")});
    s.add({});
  })

  t.test("emit change event",function(t){
    const s = new Scanner(false); //do not auto-start
    const obj = createService("foo-01", {fullname:"foo-01-unique-name"});
    s.on("change",function(list){
      t.type(list, Array);
      t.equal(list.length, 1);
      t.end();
    });
    s.add(Node.createFromService(obj));
  })
  t.end();
})
