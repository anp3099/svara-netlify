// Keep this tiny and dependency-free. Re-export your configured blink here.
// If your real file is at src/blink/server (TS or JS), just re-export it.
export { blink } from "../blink/server";    // or "../blink/client" / another path
// or: export { default as blink } from "../blink/server";
