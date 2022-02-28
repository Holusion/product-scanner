'use strict';

import {eventLoop} from "./index.js";
import { Store } from "./loop.js";
import {MdnsMock, StoreMock} from "./__tests__/test-mocks.js";

describe("product-scanner", function(){
  this.beforeEach(function(){
    this.c = new AbortController();
    this.mdns = new MdnsMock();
  });
  this.afterEach(function(){
    if(!this.c.signal.aborted) this.c.abort();
  })

  describe("eventLoop()", function(){
    it("throw an error for missing parameter", async function(){
      let store = new Store();
      await expect((async ()=>{
        for await (let _ of eventLoop({mdns: undefined, signal: this.c.signal, store})){
          expect.fail("Should not yield any result");
        }
      })()).to.be.rejectedWith("Invalid MulticastDns");
    })
    it("can be cancelled", async function(){
      setTimeout(()=>this.c.abort(), 2);
      let e = await expect((async ()=>{
        // @ts-ignore
        for await (let _ of eventLoop({mdns:this.mdns, signal: this.c.signal, store: new StoreMock()})){
          //
        }
      })()).to.be.rejectedWith({code: 'ABORT_ERR'});
    });
  });
  
})
