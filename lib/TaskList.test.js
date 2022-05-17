import timers from "timers/promises";

import TaskList from "./TaskList.js";


describe("TaskList", function(){

  it("schedules tasks", async function(){
    let tl = new TaskList();
    let hasRun = false;
    let result = await expect(tl.schedule("foo", ()=>{
      hasRun = true;
      return "foo";
    }, 0)).to.be.fulfilled;

    expect(result).to.deep.equal("foo");
  });

  it("reports task errors", async function(){
    let tl = new TaskList();
    await expect(tl.schedule("foo", ()=>{
      throw new Error("foo");
    }, 0)).to.be.rejectedWith("foo");
  });

  it("can be cancelled before task is run", async function(){
    let tl = new TaskList();
    let p = tl.schedule("foo", ()=>{ 
      expect.fail("should not execute");
    }, 1000); //Will cause tests to hang if not properly cancelled
    expect([...tl.values()]).to.have.property("length", 1);
    setImmediate(()=>tl.clear());
    await expect(p).to.be.rejectedWith("The operation was aborted");
    expect([...tl.values()]).to.have.property("length", 0);
  });

  it("can cancel during task execution if supported", async function(){
    let tl = new TaskList();
    setTimeout(()=>tl.clear(), 1);
    await expect(tl.schedule("foo", async ({signal})=>{
      expect(signal).to.be.instanceof(AbortSignal);
      await timers.setTimeout(10, {signal});
      expect.fail("Should not be reached");
    }, 0)).to.be.rejectedWith("The operation was aborted");
  });

  it("can replace tasks by reusing a key", async function(){
    let tl = new TaskList();

    tl.schedule("foo", ()=>{
      console.log("should not run");
    }, 10);
    await timers.setTimeout(1);
    tl.schedule("foo", ()=> "bar", 0);

    let tasks = [...tl.values()];
    expect(tasks).to.have.property("length", 1);
    expect(await Promise.all(tasks)).to.deep.equal(["bar"]);
  });

  it("doesn't delete from cancelled tasks", async function(){
    let tl = new TaskList();

    let p = tl.schedule("foo", ()=>{ }, 1);
    await timers.setImmediate();
    tl.schedule("foo", ()=> "bar", 2);
    await expect(p).to.be.rejectedWith("The operation was aborted");
    expect([...tl.values()]).to.have.property("length", 1);
  });
});