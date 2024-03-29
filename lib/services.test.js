'use strict';

import { combineHosts, getHost, parse } from "./packets.js";
import {isProduct, query} from "./services.js";
import { readJSON } from "./__tests__/test-fixtures.js";
import { MdnsMock } from "./__tests__/test-mocks.js";

describe("services", function(){
  describe("isProduct()", function(){
  
    it("returns false", function(){
      [
        {host: "foo.local"},
        {address: "192.168.1.11"},
        {services:[]},
        {services: ["_workstation._tcp.local"]},
      ].reduce((acc, add) => {
        acc = {...acc, ...add};
        // @ts-ignore
        expect(isProduct(acc)).to.be.false;
        return acc;
      }, {});
    });
  
    it("returns true", function(){
      expect(isProduct({
        host: "foo.local",
        address: "192.168.1.11",
        services: [
          "_workstation._tcp.local",
          "_ssh._tcp.local",
          "_http._tcp.local"
        ],
        ttl: 0,
      })).to.be.true;
    });

    it("sample packet from running product", async function(){
      expect(isProduct(getHost(await readJSON("packet.json")))).to.be.true;
    });

    it("sample packet from online product", async function(){
      expect(isProduct(getHost(await readJSON("packet2.json"))), JSON.stringify(getHost(await readJSON("packet2.json")), null, 2)).to.be.true;
    });

  });

  describe("query()", async function(){
    let expected_services = [
      {name:"_holusion._tcp.local", type: "PTR"},
      {name:"_workstation._tcp.local", type: "PTR"},
      {name:"_ssh._tcp.local", type: "PTR"},
    ];
    this.beforeEach(function(){
      this.mdns = new MdnsMock();
      this.mdns._onQuery(()=>{ });
    })
    it("performs a query using a MulticastDns instance", async function(){
      // @ts-ignore
      await expect(query({mdns: this.mdns })).to.be.fulfilled;
      expect(this.mdns.queries).to.have.property("length", 1)
      expect(this.mdns.queries[0].slice(0, 2)).to.deep.equal([
        expected_services,
        null,
      ]);
    });
    it(`performs a query targetting a remote host`, async function(){
      // @ts-ignore
      await expect(query({mdns: this.mdns, address: "192.168.1.11"})).to.be.fulfilled;
      expect(this.mdns.queries).to.have.property("length", 1)
      expect(this.mdns.queries[0].slice(0, 2)).to.deep.equal([
        expected_services,
        {port: 5353, address: "192.168.1.11"},
      ]);
    });

    it(`handles errors`, async function(){
      this.mdns.query = function(questions, rinfo, cb){
        cb(new Error("some failure"));
      }
      // @ts-ignore
      await expect(query({mdns: this.mdns, address: "192.168.1.11"})).to.be.rejectedWith("some failure");
    });

  })
})