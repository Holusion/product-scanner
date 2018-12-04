'use strict';
const {EventEmitter} = require("events");


const {BrowseError} = require("./errors");
const {Node} = require("./Node");
const {Scanner} = require("./Scanner");



class Register extends EventEmitter{
  static get sq() { return require('sqlite');  }
  constructor(db_path=':memory:'){
    super();
    this.dbPromise = Register.sq.open(db_path);
    this.scanner = new Scanner(false);
    this.scanner.on("add", this.addNode.bind(this));
    this.scanner.on("remove", this.rmNode.bind(this));
    this.scanner.on("error",this.emit.bind(this,"error"));
  }

  async waitForDB(){
    this.db = await this.dbPromise;
    try{
      await this.db.migrate({});
    }catch(e){
      console.error("DB migrate error : ",e);
    }
    this.scanner.start();
    return this;
  }

  static connect(db_path=':memory:'){
    const r = new Register(db_path);
    return r.waitForDB();
  }

  async getNodes(){
    //We create a disconnected scanner to inherit findIndex function but avoid race conditions
    //products state is thus freezed when the query begins
    const s = new Scanner(false, this.scanner.list);
    const db = await this.dbPromise;
    await db.each(`SELECT product_fullname, product_name, product_mac, product_version FROM products`, function(err, row){
      //Function called for every row returned by query
      const newNode = Node.createFromDB(row);
      s.merge(newNode)
    });

    return await Promise.all(s.list.map(n => n.withStatus(false)));
  }

  async addNode(n){
    const db = await this.dbPromise;
    await db.run(`INSERT INTO products (product_fullname, product_name, product_mac, product_version)
    VALUES (
      $fullname,
      $name,
      $mac,
      $version
    ) ON CONFLICT (product_name) DO UPDATE SET
    product_fullname=excluded.product_fullname,
    product_version=excluded.product_version
    WHERE excluded.product_version NOT NULL;
    `,{$fullname:n.fullname, $name: n.name, $mac: n.mac, $version: n.version ||"0.0.0"})
    this.emit("add", n);

    const nodes = await this.getNodes();
    this.emit("change", nodes);
  }
  async rmNode(n){
    this.emit("remove", n);
    const nodes = await this.getNodes();
    this.emit("change", nodes);
  }
}

module.exports = {Scanner, BrowseError, Node, Register};
