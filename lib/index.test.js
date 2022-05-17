import timers from "timers/promises"
import scanner from "./index.js";

import { MdnsMock } from "./__tests__/test-mocks.js";
import { readJSON } from "./__tests__/test-fixtures.js";
import { once } from "events";


describe("scanner", function(){
  let mdns, c, s, packet, host;
  this.beforeEach(function(){
    mdns = new MdnsMock();
    c = new AbortController();
    s = scanner({mdns, signal: c.signal, randomDelay:0});
  });
  this.afterEach(async function(){
    c.abort();
    //Be sure to always drain the generator
    for await (let _ of s){}
  });
  
  this.beforeAll(async function(){
    packet = await readJSON("packet.json");
    host = await readJSON("host.json");
  });

  it("can be cancelled", async function(){
    setImmediate(()=>c.abort());
    await expect((async ()=>{
      for await (let x of  s){
        expect.fail("Should not yield here");
      }
    })()).to.be.fulfilled;
  });

  it("can yield results", async function(){
    mdns.once("_query", ()=>{
      mdns.emit("response", packet);
    });
    let v = await expect(s.next()).to.be.fulfilled;
    expect(v).to.have.property("done", false);
    expect(v).to.have.property("value").deep.equal(host);
    c.abort();
    v = await expect(s.next()).to.be.fulfilled;
    expect(v).to.have.property("done", true);
  });
  describe("renewal", function(){
    let shortTtlPacket;
    this.beforeAll(function(){
      shortTtlPacket = {
        ...packet,
        answers: packet.answers.map( a => ((a.ttl)? {...a, ttl: 0.001} : a)),
      };
    });

    it("can perform refresh queries", async function(){

      mdns.once("_query", ()=>{
        mdns.emit("response", shortTtlPacket);
      });
      let v = await expect(s.next()).to.be.fulfilled;
      expect(v).to.have.property("value").deep.equal({...host, ttl: 0.001});
      await once(mdns, "_query");
    });

    it("can remove timed-out hosts", async function(){
      mdns.once("_query", ()=>{
        mdns.emit("response", shortTtlPacket);
      });
      let v = await expect(s.next()).to.be.fulfilled;
      expect(v).to.have.property("value").deep.equal({...host, ttl: 0.001});
      v = await expect(s.next()).to.be.fulfilled;
      expect(v).to.have.property("value").deep.equal({...host, ttl: 0, status: "unreachable"});
    });
  });
});
