'use strict';
import multicastDns from "multicast-dns";
import scanner from "./lib/index.js";

for await (let host of scanner()){
  console.log("Yield %s (%s)", host.host, host.status);
}