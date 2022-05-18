'use strict';
import timers from "timers/promises";
import {EventEmitter, on, once} from "events";

import {add} from "./lifecycle.js";

import {MdnsMock} from "./__tests__/test-mocks.js";
import { readJSON } from "./__tests__/test-fixtures.js";

describe("lifecycle", function(){
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
      let loop = add({ mdns: this.mdns, signal: this.c.signal });
      let next = await loop.next();
      expect(next.value).to.deep.equal(this.host);
      expect(next.done).to.be.false;
    });
  
    it(`loops over responses until cancelled`, async function(){
      setImmediate(async ()=>{
        for(let id=0; id<5;id++){
          await timers.setImmediate();
          this.mdns.emit("response", {...this.packet}, {});
        }
      });

      let received= 0;
      await expect((async ()=>{
        for await (let v of add({ mdns: this.mdns, signal: this.c.signal })){
          expect(v).to.deep.equal(this.host);
          if(++received == 5) this.c.abort();
        }
      })()).to.be.rejectedWith("aborted");
      expect(this.mdns.listenerCount()).to.equal(0);
    });

    it("skips responses that are not a product", async function(){
      let loop = add({ mdns: this.mdns, signal: this.c.signal });

      this.mdns.emit("response", {...this.packet, answers: this.packet.answers.filter(a=> a.type==="A")})

      await expect(Promise.race([
        timers.setTimeout(2),
        loop.next().then(()=> {throw new Error("loop should not yield here")}),
      ])).to.be.fulfilled;

    });
    
    it("skips responses that have no SRV", async function(){
      let loop = add({ mdns: this.mdns, signal: this.c.signal });

      this.mdns.emit("response", {...this.packet, answers: this.packet.answers.filter(a=> a.type==="SRV")})

      await expect(Promise.race([
        timers.setTimeout(2),
        loop.next().then(()=> {throw new Error("loop should not yield here")}),
      ])).to.be.fulfilled;
    });

    it("throws errors from mdns.query", async function(){
      this.mdns.on("_query", ()=>{
        this.mdns.emit("error", new Error("some error while emitting a query"))
      })
      let loop = add({ mdns: this.mdns, signal: this.c.signal });
      expect(loop.next()).to.be.rejectedWith("some error while emitting a query");
    });
  });
})

