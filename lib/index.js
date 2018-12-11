'use strict';
const {EventEmitter} = require("events");


const {BrowseError} = require("./errors");
const {Node} = require("./Node");
const {Scanner} = require("./Scanner");



class Register extends EventEmitter{
  static get sq() { return require('sqlite');  }
  static get commonRows(){ return `product_fullname, product_name, product_mac, product_version`}
  constructor(db_path=':memory:'){
    super();
    this.dbPromise = Register.sq.open(db_path);
    this.scanner = new Scanner(false);
    this.scanner.on("add", this.addNode.bind(this));
    this.scanner.on("remove", this.rmNode.bind(this));
    this.scanner.on("error",this.emit.bind(this,"error"));
  }

  //migrate : one of false/true/"force"
  async waitForDB(migrate=false){
    this.db = await this.dbPromise;
    if(migrate){
      await this.db.migrate({force: ((migrate == "force")?'last': false)});
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
    await db.each(`SELECT ${Register.commonRows} FROM products`, function(err, row){
      //Function called for every row returned by query
      const newNode = Node.createFromDB(row);
      s.merge(newNode)
    });

    return await Promise.all(s.list.map(n => n.withStatus(false)));
  }
  async getNodeByName(name){
    const db = await this.dbPromise;
    const row = await db.get(`SELECT ${Register.commonRows} FROM products WHERE product_name = $name`, {$name: name})
    const dbNode = Node.createFromDB(row);
    const activeIndex = this.scanner.findIndex(dbNode);
    dbNode.merge(this.scanner.list[activeIndex]);
    return dbNode;
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
    `,{
      $fullname:n.fullname,
      $name: n.name.toLowerCase(),
      $mac: n.mac,
      $version: n.version ||"0.0.0"
    })
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
