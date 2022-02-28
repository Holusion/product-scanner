'use strict';
import timers from "timers/promises";
import {EventEmitter, on, once} from "events";

import {add, remove, Store} from "./loop.js";

import {MdnsMock} from "./__tests__/test-mocks.js";
import { readJSON } from "./__tests__/test-fixtures.js";

describe("loop", function(){
  this.beforeEach(async function(){
    this.c = new AbortController();
    this.mdns = new MdnsMock();
    this.packet =  await readJSON("packet.json")
    this.host =  await readJSON("host.json")
  });
  this.afterEach(function(){
    this.c.abort();
  });

  describe("add", function(){
    it(`forwards response events`, async function(){
      setImmediate(()=>{this.mdns.emit("response", this.packet)});
      let store = new Store();
      add({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
      });
      let v = await once(store, "change");
      expect(v).to.deep.equal(["add", this.host]);
    });
  
    it(`loops over responses until cancelled`, async function(){
      setImmediate(async ()=>{
        for(let id=0; id<5;id++){
          await timers.setImmediate();
          this.mdns.emit("response", {...this.packet}, {});
        }
      });
      let store = new Store();
      add({
        store,
        mdns:this.mdns,
        signal: this.c.signal,
      });
      let id = 0;
      await expect((async ()=>{
        for await (let v of on(store, "change", {signal: this.c.signal})){
          expect(v).to.deep.equal(["add", this.host]);
          if(++id==5) this.c.abort();
        }
      })()).to.be.rejectedWith("aborted");
      expect(this.mdns.listenerCount()).to.equal(0);
    });

    it("skips responses that are not a product", async function(){
      let store = new Store();
      store.on("change", ()=>{
        expect.fail("change event should not fire");
      })
      add({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
      });
      this.mdns.emit("response", {...this.packet, answers: this.packet.answers.filter(a=> a.type==="A")})
      await timers.setTimeout(2);
    });
    it("skips responses that have no SRV", async function(){
      let store = new Store();
      store.on("change", ()=>{
        expect.fail("change event should not fire");
      })
      add({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
      });
      this.mdns.emit("response", {...this.packet, answers: this.packet.answers.filter(a=> a.type==="SRV")})
      await timers.setTimeout(2);
    })
  });

  describe("remove", function(){
    it(`removes hosts with ttl = 0`, async function(){
      let store = new Store();
      setImmediate(()=>{store.add( {...this.host, ttl:0})});
      remove({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
        delay: 0,
      });

      for await (let [type, value] of on(store, "change")){
        if(type === "remove"){
          expect(value).to.deep.equal({...this.host, ttl: 0});
          break;
        }
      }
      expect(this.mdns.queries).to.have.property("length", 0);
    });

    it(`emits a query before ttl expires`, async function(){
      let store = new Store();
      setImmediate(()=>{store.add( {...this.host, ttl:0.003})});
      remove({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
        delay: 0,
      });

      for await (let [type, value] of on(store, "change")){
        if(type === "remove"){
          expect(value).to.deep.equal({...this.host, ttl: 0.003});
          break;
        }
      }
      expect(this.mdns.queries).to.have.property("length", 1);
    });

    it("can be  cancelled", async function(){
      setImmediate(()=>this.c.abort());
      await expect( remove({
        store: new Store(),
        mdns: this.mdns,
        signal: this.c.signal,
        delay: 0,
      })).to.be.rejectedWith({code: "ABORT_ERR"});
    });
  });
  

  it("throws errors", async function(){
    setImmediate(() =>this.mdns.emit("error", new Error("some error string")));
    let store = new Store();
    await expect(add({
      store,
      mdns:this.mdns,
      signal: this.c.signal,
    })).to.be.rejectedWith("some error");
    expect(this.mdns.listenerCount()).to.equal(0);
  });


  describe("Store", function(){
    this.beforeAll(async function(){
      this.host = await readJSON("host.json");
    })
    it("emits an event when a host is added", function(done){
      let s = new Store();
      s.on("error", done);
      s.on("change", (action, host)=>{
        expect(action).to.equal("add");
        expect(host).to.deep.equal(this.host);
        done();
      });
      s.add(this.host);
    });
    it("emits an event when a host is removed", function(done){
      let s = new Store();
      s.add(this.host);
      s.on("error", done);
      s.on("change", (action, host)=>{
        expect(action).to.equal("remove");
        expect(host).to.deep.equal(this.host);
        done();
      });
      s.remove(this.host);
    });
    it("doesn't emit change if host has already been removed", function(done){
      let s = new Store();
      s.on("error", done);
      s.on("change", ()=>{
        expect.fail("change handler should not be called");
      });
      s.remove({host: "foo.local"})
      setTimeout(done, 2);
    });
    it("emit error if host is malformed", function(){
      let s = new Store();
      expect(()=>s.add({...this.host, host:undefined})).to.throw("invalid host");
    })
  });
})

