'use strict';
const http = require('http')
const port = 3000

const {Register} = require("./lib");

const s = new Register("products.db");

s.waitForDB().catch((e)=>{
  console.error("Wailed to get db : ",e);
  process.exit(1);
})


s.on("error", console.error);
s.on("add",function(item){
  console.log("ADD", item);
})

s.on("remove",function(item){
  console.log("REMOVE", item);
})

const server = http.createServer(async (req, res)=>{
  const nodes = await s.getNodes();
  res.end(JSON.stringify(nodes));
})
server.listen(port);
