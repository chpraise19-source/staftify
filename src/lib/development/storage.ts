"use client";
import type { Role } from "../domain";
import {
  localView,
  seedLocalState,
  simulate,
  type LocalState,
} from "./simulation";
const DATABASE = "staftify-development-v1";
export const LOCAL_CHANGE = "staftify-local-change";
export const LOCAL_CHANNEL = "staftify-development";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new Error(
          "Persistent local testing needs browser storage. Enable storage for this application.",
        ),
      );
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Local test storage could not be opened. Check browser storage permissions.",
        ),
      );
    request.onblocked = () =>
      reject(
        new Error(
          "Close older STAFTIFY tabs and reload to update local test storage.",
        ),
      );
  });
}
async function transaction<T>(
  work: (state: LocalState) => { state: LocalState; result: T },
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite"),
      store = tx.objectStore("state");
    let result: T;
    let problem: unknown;
    const read = store.get("workspace");
    read.onsuccess = () => {
      try {
        const current = read.result ?? seedLocalState();
        if (current.version !== 1 || !Array.isArray(current.data?.profiles))
          throw new Error(
            "Local test data is incompatible. Use Reset local test data to start again.",
          );
        const updated = work(current);
        result = updated.result;
        store.put(updated.state, "workspace");
      } catch (e) {
        problem = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = () => {
      db.close();
      reject(
        problem ??
          new Error(
            "Local test data could not be saved. Check available browser storage.",
          ),
      );
    };
    tx.onerror = () => {
      problem ??= new Error(
        "Local test storage failed. Your last change was not saved.",
      );
    };
  });
}
function changed() {
  window.dispatchEvent(new Event(LOCAL_CHANGE));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(LOCAL_CHANNEL);
    channel.postMessage("changed");
    channel.close();
  }
}
export async function readLocalWorkspace(role: Role) {
  return transaction((state) => ({ state, result: localView(state, role) }));
}
export async function readLocalHistory() {
  return transaction((state) => ({ state, result: state.history }));
}
export async function localRequest(
  role: Role,
  url: string,
  method: string,
  body: Record<string, unknown>,
) {
  const result = await transaction((state) => {
    const updated = simulate(state, role, url, method, body);
    return { state: updated.state, result: updated.response };
  });
  changed();
  return result;
}
export async function resetLocalWorkspace() {
  // Reset also repairs an incompatible snapshot without ever touching live data.
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(seedLocalState(), "workspace");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("Unable to reset local test data."));
    };
  });
  changed();
}
