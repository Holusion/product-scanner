'use strict';
import scanner from "./lib/index.js";

for await (let host of scanner()){
  console.log("Yield %s (%s)", host.host, host.status);
}