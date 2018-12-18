'use strict';
const http = require('http')
const port = 3000

const {Scanner} = require("./lib");

const s = new Scanner({autostart:true, autorefresh:10000});

s.on("error", console.error);
s.on("add",function(item){
  console.log("ADD", item);
})

s.on("remove",function(item){
  console.log("REMOVE", item);
})

const server = http.createServer(async (req, res)=>{
  const nodes = s.list;
  res.end(JSON.stringify(nodes));
})
server.listen(port);
