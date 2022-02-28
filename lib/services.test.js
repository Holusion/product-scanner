'use strict';

import {isProduct, query} from "./services.js";
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
  });

  describe("query()", async function(){
    let expected_services = [
      {name:"_workstation._tcp.local", type: "PTR"},
      {name:"_ssh._tcp.local", type: "PTR"},
      {name:"_http._tcp.local", type: "PTR"},
    ];
    this.beforeEach(function(){
      this.mdns = new MdnsMock();
    })
    it("performs a query using a MulticastDns instance", async function(){
      // @ts-ignore
      await expect(query({mdns: this.mdns })).to.be.fulfilled;
      expect(this.mdns.queries).to.deep.equal([[
        expected_services,
        null,
      ]]);
    });
    it(`performs a query targetting a remote host`, async function(){
      // @ts-ignore
      await expect(query({mdns: this.mdns, address: "192.168.1.11"})).to.be.fulfilled;
      expect(this.mdns.queries).to.deep.equal([[
        expected_services,
        {port: 5353, address: "192.168.1.11"},
      ]]);
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