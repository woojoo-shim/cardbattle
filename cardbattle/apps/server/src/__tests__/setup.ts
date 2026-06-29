/**
 * vitest global setup — runs in the worker process before any test file.
 *
 * @colyseus/tools (pulled in by @colyseus/testing) has three fire-and-forget
 * dynamic imports at module level:
 *
 *   var BunWebSockets = import("@colyseus/bun-websockets");
 *   BunWebSockets.catch(() => {});
 *   // ... same for redis-driver and redis-presence
 *
 * When these packages are absent the dynamic import() returns a rejected
 * Promise.  Node schedules the rejection notification in the microtask queue,
 * but the .catch(() => {}) registration also runs in the microtask queue one
 * tick later.  In vitest's forks/vmForks pool the "unhandledRejection" process
 * event fires between those two ticks, and vitest tries to serialise the error
 * through the tinypool IPC channel.  The resulting plain Error object arrives
 * at the parent process as a raw Object (not a v8-serialised Buffer), which
 * makes Buffer.from(v) throw ERR_INVALID_ARG_TYPE.
 *
 * Importing @colyseus/tools here — before vitest installs its own
 * unhandledRejection handler — gives the .catch() swallowing a chance to run
 * first, so the rejections never surface as unhandled.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
await import('@colyseus/tools').catch(() => { /* intentionally swallowed */ });
