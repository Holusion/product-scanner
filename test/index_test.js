'use strict';

const {test} = require('tap');
const createService = require("./service_mock");

const {Scanner, BrowseError} = require("../lib/index");

test('Scanner.findIndex()',function(t){
  const s = new Scanner(false); //do not auto-start
  s._data = [
    createService("foo-01", {fullname:"foo-01-unique-name"}),
    createService("foo-02", {fullname:"foo-02-unique-name"})
  ];
  t.test("return -1 when not found",function(t){
    t.equal(s.findIndex(createService("foo-02", {fullname:"foo-01-other-name"})), -1);
    t.end();
  })
  t.test("return index when found",function(t){
    t.equal(s.findIndex(createService("foo-02", {fullname:"foo-02-unique-name"})), 1);
    t.end();
  })
  t.end();
})

test('Scanner.add',function(t){
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
      t.equal(list[0], obj);
      t.end();
    });
    s.add(obj);
  })
  t.end();
})
