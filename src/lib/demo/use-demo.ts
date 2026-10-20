"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDemoState,
  readDemoState,
  STORAGE_KEY,
  transition,
  type DemoCommand,
  type DemoState,
} from "./store";
import type { Role } from "../domain";
export function useDemo(role: Role) {
  const [state, setState] = useState<DemoState | null>(null);
  const current = useRef<DemoState | null>(null);
  const [message, setMessage] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    let initial: DemoState;
    try {
      initial = readDemoState(localStorage.getItem(STORAGE_KEY));
    } catch {
      initial = createDemoState();
      setStorageAvailable(false);
    }
    current.current = initial;
    setState(initial);
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = readDemoState(e.newValue);
        current.current = next;
        setState(next);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const save = useCallback((next: DemoState) => {
    current.current = next;
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setStorageAvailable(false);
    }
  }, []);
  const dispatch = useCallback(
    (command: DemoCommand) => {
      if (!current.current) return;
      try {
        const result = transition(current.current, role, command);
        save(result.state);
        setMessage(result.message);
        return result;
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not update demo.");
      }
    },
    [role, save],
  );
  const reset = () => {
    save(createDemoState());
    setMessage("Demo reset to its original sample data.");
  };
  return { state, dispatch, reset, message, setMessage, storageAvailable };
}
