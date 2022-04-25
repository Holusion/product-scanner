'use strict';
import multicastDns from "multicast-dns";
import Store from "./lib/index.js";
/*
let b = new ProductScanner();
b.on("up", function(s){
  console.log("Service UP : ", s);
})
b.on("down", function(s){
  console.log("Service DOWN : ", s);
})
//*/
/*
const r = new Registry();
r.on("up", (record)=>console.log("New Record : %s %s (%s)",record.name, record.host, record.address));
r.on("change", (record)=>console.log("Update Record : %s %s (%s)",record.name, record.host, record.address));
r.on("down", (record)=>console.log("Remove Record : %s %s (%s)",record.name, record.host, record.address));

r.query()
//*/


let mdns = multicastDns();
let store = new Store({mdns});
store.on("add", function(host){
  console.log("ADD : ", new Date(), host);
});

store.on("remove", function(host){
  console.log("RM", new Date(), host);
});