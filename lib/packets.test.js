'use strict';
import fs from "fs/promises";
import {URL} from "url";

import {parse, combineHosts, getHost} from "./packets.js";
import { readJSON } from "./__tests__/test-fixtures.js";

describe("packets", function(){
  this.beforeAll(async function(){
    this.packet = await readJSON("packet.json");
    this.parsed = await readJSON("parsed.json");
    this.host = await readJSON("host.json");
  });
  describe("parse()", function(){
    it("parse packets from a generator", async function(){
      expect(parse(this.packet)).to.deep.equal(this.parsed);
    });
    it("Assign default values", async function(){
      Object.keys(this.parsed).forEach(key=>{
        let mPacket = {...this.packet, answers:this.packet.answers.filter(({type})=> type!== key)};
        let mParsed = {...this.parsed};
        mParsed[key]=[];
        expect(parse(mPacket)).to.deep.equal(mParsed);
      });
    });
  });

  describe("combineHosts()", function(){
    it("combine A records into Services", function(){
      expect([...combineHosts(this.parsed)]).to.deep.equal([this.host]);
    });
    it(`host is online if it has no _holusion._tcp record`, function(){
      let mParsed = parse({
        ...this.packet, 
        answers:this.packet.answers.filter(({name})=>(!/_holusion._tcp/.test(name)))
      });

      expect([...combineHosts(mParsed)]).to.deep.equal([{
        ...this.host, 
        version: undefined,
        status: "online",
        services: this.host.services.filter(s=>!/_holusion._tcp/.test(s)),
      }]);
    });

    it(`host is online if it has no version TXT record`, function(){
      let mParsed = {
        ...this.parsed, 
        TXT: this.parsed.TXT.filter(({name})=> name !== "Holusion Controller._holusion._tcp.local")
      };
      expect([...combineHosts(mParsed)]).to.deep.equal([{...this.host, version:undefined, status: "online"}]);
    });
  });

  describe("getHost", function(){
    it("get a host from a packet", function(){
      expect(getHost(this.packet)).to.deep.equal(this.host);
    });
  })
});
