'use strict';
import timers from "timers/promises";
import {EventEmitter, on, once} from "events";

import {add, remove} from "./loop.js";

import {MdnsMock, StoreMock} from "./__tests__/test-mocks.js";
import { readJSON } from "./__tests__/test-fixtures.js";

describe("loop", function(){
  let store;
  this.beforeEach(async function(){
    this.c = new AbortController();
    this.mdns = new MdnsMock();
    this.packet =  await readJSON("packet.json")
    this.host =  await readJSON("host.json")
    store = new EventEmitter();
  });
  this.afterEach(function(){
    this.c.abort();
  });

  describe("add", function(){
    it(`forwards response events`, async function(){
      setImmediate(()=>{this.mdns.emit("response", this.packet)});
      add({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
      });
      let v = await once(store, "change");
      expect(v).to.deep.equal([this.host]);
    });
  
    it(`loops over responses until cancelled`, async function(){
      setImmediate(async ()=>{
        for(let id=0; id<5;id++){
          await timers.setImmediate();
          this.mdns.emit("response", {...this.packet}, {});
        }
      });
      add({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
      });
      let id = 0;
      await expect((async ()=>{
        for await (let v of on(store, "change", {signal: this.c.signal})){
          expect(v).to.deep.equal([this.host]);
          if(++id==5) this.c.abort();
        }
      })()).to.be.rejectedWith("aborted");
      expect(this.mdns.listenerCount()).to.equal(0);
    });

    it("skips responses that are not a product", async function(){
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
      setImmediate(()=>{store.change( {...this.host, ttl:0} )});
      remove({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
        delay: 0,
      });

      let [value] = await once(store, "remove");
      expect(value).to.deep.equal({...this.host, ttl: 0});
      expect(this.mdns.queries).to.have.property("length", 0);
    });

    it(`emits a query before ttl expires`, async function(){
      setImmediate(()=>{store.change( {...this.host, ttl:0.003})});
      remove({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
        delay: 0,
      });
      let [value] = await once(store, "remove");
      expect(value).to.deep.equal({...this.host, ttl: 0.003});
    });

    it("can be  cancelled", async function(){
      setImmediate(()=>this.c.abort());
      await expect( remove({
        store,
        mdns: this.mdns,
        signal: this.c.signal,
        delay: 0,
      })).to.be.rejectedWith({code: "ABORT_ERR"});
    });
  });
  

  it("throws errors", async function(){
    setImmediate(() =>this.mdns.emit("error", new Error("some error string")));
    await expect(add({
      store,
      mdns:this.mdns,
      signal: this.c.signal,
    })).to.be.rejectedWith("some error");
    expect(this.mdns.listenerCount()).to.equal(0);
  });
})

