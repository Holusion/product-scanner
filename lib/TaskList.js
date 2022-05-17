import timers from "timers/promises";

/**
 * @typedef {Function} task
 * @template T
 * @param {Object} param0
 * @param {AbortSignal} param0.signal
 * @return {T|Promise<T>}
 */


export default class TaskList{
  #m = new Map();
  /**
   * @yields {Promise<*>}
   */
  *values(){
    for (let i of this.#m.values()){
      yield i.task;
    }
  }
  /**
   * schedule a task using a unique key
   * Any task already scheduled using that key will be cancelled
   * @template T
   * @param {string} key 
   * @param {task<T>} task
   * @param {number} delay
   * @returns {Promise<T>}
   */
  schedule(key, task, delay){
    let prev = this.#m.get(key);
    if(prev){
      prev.control.abort();
      this.#m.delete(key);
    }
    let control = new AbortController()
    let next = {
      control,
      task: timers.setTimeout(delay, null, {signal: control.signal})
      .then(()=>task({signal:next.signal}))
      .finally(()=>{
        if(this.#m.get(key)?.control === control) this.#m.delete(key);
      }),
    };
    this.#m.set(key, next);
    return next.task;
  }

  clear(){
    for(let v of this.#m.values()){
      v.task.catch(e=> {if(e.code !== "ABORT_ERR") throw e})
      v.control.abort();
    }
    this.#m.clear();
  }
}