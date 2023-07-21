import ProductScanner from "./index.js";

import { MdnsMock } from "./__tests__/test-mocks.js";
import { readJSON } from "./__tests__/test-fixtures.js";
import { once } from "events";


describe("scanner", function(){
  let mdns, s, packet, host;
  this.beforeEach(function(){
    mdns = new MdnsMock();
    s = new ProductScanner({mdns, randomDelay:0});
  });
  this.afterEach(async function(){
    s.close();
  });
  
  this.beforeAll(async function(){
    packet = await readJSON("packet.json");
    host = await readJSON("host.json");
  });

  it("can be cancelled", async function(){
    setImmediate(()=>s.close());
    expect(s.listenerCount()).to.equal(0);
  });

  it("can yield results", async function(){
    mdns._onQuery(()=>{
      mdns.emit("response", packet);
    });
    let [v] = await expect(once(s, "change")).to.be.fulfilled;
    expect(v).to.deep.equal(host);
    s.close();
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
      mdns._onQuery(()=>{
        mdns.emit("response", shortTtlPacket);
      });
      let [v] = await expect(once(s, "change")).to.be.fulfilled;
      expect(v).to.deep.equal({...host, ttl: 0.001});
    });

    it("can remove timed-out hosts", async function(){
      mdns._onQuery(()=>{
        mdns.emit("response", shortTtlPacket);
      });
      let [v] = await expect(once(s, "change")).to.be.fulfilled;
      expect(v).to.deep.equal({...host, ttl: 0.001});
      [v] = await expect(once(s, "remove")).to.be.fulfilled;
      expect(v).to.deep.equal(host.host);
    });
  });
});
