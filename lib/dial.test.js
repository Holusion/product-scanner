'use strict';
import { expect } from "chai";
import { once } from "events";
import net from "net";
import dial from "./dial.js";


describe("dial", function(){
  this.beforeEach(async function(){
    this.server = net.createServer();
    this.server.listen(0);
    await once(this.server, "listening");
    this.address = this.server.address();
  });
  this.afterEach(function(done){
    this.server.close(()=>done());
  })
  it("dials to an address", async function(){
    await expect(dial(this.address.address, {port: this.address.port})).to.be.fulfilled;
  });
  it("dials ECONNREFUSED", async function(){
    this.server.close();
    let err= await expect(dial(this.address.address, {port: this.address.port, timeout: 5})).to.be.rejected;
    expect(err).to.have.property("code", "ECONNREFUSED");
  });
});