'use strict';
import {URL} from "url";
import {join} from "path";
import fs from "fs/promises";

let fixtures = new Map();

export async function readFixture(name, opts = {encoding: "utf8"}){
  return fixtures.get(name) ?? (await fs.readFile(new URL(join("../__fixtures__", name), import.meta.url)).then(content=>{
    fixtures.set(name, content);
    return content;
  }));
} 

export async function readJSON(name){
  return JSON.parse(await readFixture(name), (key, value)=>{
    if(key === "data" 
      && Array.isArray(value) 
      && value.length === 1
      && value[0].type === "Buffer"
    ){
      return Buffer.from(value[0].data);
    }
    return value;
  });
}