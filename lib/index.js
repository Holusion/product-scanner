'use strict';
import {on} from "events";

import { Store, add, remove } from "./loop.js";

/**
 * @param {import(".").LoopParams} params
 */
export async function* eventLoop ({mdns, signal}) {
  let store = new Store();
  add({store, mdns, signal}).catch(store.onError);
  remove({store, mdns, signal}).catch(store.onError);
  yield* on(store, "change", {signal});
  /* c8 ignore next */
  /* Coverage ignore  because events.on() never breaks unless it throws an AbortError */
}
