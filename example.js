'use strict';
import ProductScanner from "./lib/index.js";
let hosts = new Map();
const s = new ProductScanner();
s.on("error", (e)=>{
  console.error(e);
})
.on("change", h=>{
  console.log("Change : ", h.host, h.status);
  hosts.set(h.host, h);
})
.on("remove", (n)=>{
  console.log("Remove : ", n);
  hosts.delete(n);
});
setInterval(()=>{
  let start = Date.now();
  s.refresh(hosts.keys()).then(()=>{
    console.log("refresh took %dms",Date.now()-start);
  }).catch(e=>console.error("Refresh :", e));
},10000)