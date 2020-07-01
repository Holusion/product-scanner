const {EventEmitter} = require("events");
const {isIP} = jest.requireActual("net");

const connect = jest.fn(()=> {
  let e = new EventEmitter();
  e.destroy = jest.fn();
  setImmediate(()=>e.emit("connect"));
  return e;
});

module.exports = {
  isIP,
   connect,
}