'use strict';
import timers from "timers/promises";
import {EventEmitter, on, once} from "events";

import {add, remove} from "./loop.js";

import {MdnsMock, StoreMock} from "./__tests__/test-mocks.js";
import { readJSON } from "./__tests__/test-fixtures.js";


describe("product-scanner", function(){

  let store;
  this.beforeEach(async function(){
    this.c = new AbortController();
    this.mdns = new MdnsMock();
    this.packet =  await readJSON("packet.json")
    this.host =  await readJSON("host.json")
    store = new StoreMock();
  });
  this.afterEach(function(){
    this.c.abort();
    store.close();
  });


  describe("Store", function(){
    this.beforeAll(async function(){
      this.host = await readJSON("host.json");
    })
    it("emits an event when a host is added", function(done){
      store.on("error", done);
      store.on("change", (host)=>{
        expect(host).to.deep.equal(this.host);
        done();
      });
      store.change(this.host);
    });
    it("emits an event when a host is removed", function(done){
      store.change(this.host);
      store.on("error", done);
      store.on("remove", (host)=>{
        expect(host).to.deep.equal(this.host);
        done();
      });
      store.remove(this.host);
    });
    it("doesn't emit change if host has already been removed", function(done){
      store.on("error", done);
      store.on("change", ()=>{
        expect.fail("change handler should not be called");
      });
      store.remove({host: "foo.local"})
      setTimeout(done, 2);
    });
    it("emit error if host is malformed", function(){
      expect(()=>store.change({...this.host, host:undefined})).to.throw("invalid host");
    })
  });
})
