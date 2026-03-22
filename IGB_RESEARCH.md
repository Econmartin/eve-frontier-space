# EVE Frontier IGB Bridge Research

Notes on the undocumented JavaScript bridge functions injected by the game client into the in-game browser (IGB).

---

## Architecture

```
eveFrontierRpcRequest(request)          — JS wrapper, polls until done
  └─ _eveFrontierRpcRequest(id, req)    — calls ccpPython.pythonCall("", "_eveFrontierRpcRequest", args)
       └─ ccpPython.pythonCall(obj, fn, args)  — calls __pythonCall (native)
            └─ __pythonCall()           — [native code] — actual Python bridge
```

`pythonReply(idx, err, reply)` is called by the native layer to resolve/reject pending promises.

---

## Function Sources

### `eveFrontierRpcRequest(request, interval=10, timeout=30000)`
Polls `_eveFrontierRpcRequest` until response status is `done`, `failed`, or times out.
Response shape: `{ id, status: 'pending'|'done'|'failed', response }`.
Is a **JSON-RPC 2.0** endpoint — request format: `{ jsonrpc: "2.0", id, method, params }`.

### `_eveFrontierRpcRequest()`
```js
function() { return ccpPython.pythonCall("", "_eveFrontierRpcRequest", Array.prototype.slice.call(arguments)); }
```
Direct Python call with empty object name. Args are passed as array.

### `callWallet(request, interval=10, timeout=30000)`
Identical source to `eveFrontierRpcRequest` — same polling wrapper. Likely points to a different Python endpoint.

### `ccpPython.pythonCall(objname, funcname, args)`
```js
function(objname, funcname, args) {
    return new Promise(function(resolve, reject) {
        pending[callId] = { resolve, reject };
        __pythonCall(objname, funcname, callId, JSON.stringify(args));
        ++callId;
    });
}
```
Core bridge: calls `__pythonCall(objname, funcname, callId, JSON.stringify(args))`.
Returns a Promise resolved by `pythonReply`.

### `ccpPython.pythonReply(idx, err, reply)`
```js
function(idx, err, reply) {
    if (pending.hasOwnProperty(idx)) {
        if (err.length) pending[idx].reject(JSON.parse(err));
        else pending[idx].resolve(JSON.parse(reply));
        delete pending[idx];
    }
}
```
Called by the native layer to resolve/reject a pending `pythonCall` promise.

### `__pythonCall()` — `[native code]`
### `captureEvents()` — `[native code]`
### `releaseEvents()` — `[native code]`

---

## Known Globals on `window`

| Name | Type | Notes |
|------|------|-------|
| `eveFrontierRpcRequest` | function | JSON-RPC 2.0 polling wrapper |
| `_eveFrontierRpcRequest` | function | Raw Python bridge for RPC |
| `callWallet` | function | Same shape as eveFrontierRpcRequest, wallet endpoint |
| `ccpPython` | object | `pythonCall(objname, funcname, args)` + `pythonReply` |
| `__pythonCall` | function | Native Python bridge |
| `captureEvents` | function | Native — browser event bridge |
| `releaseEvents` | function | Native — browser event bridge |
| `WALLET_API_CHAIN` | string | `"sui:testnet"` |
| `ongotpointercapture` | object | Pointer capture event |
| `onlostpointercapture` | object | Pointer capture event |

---

## Open Questions

- What are the valid JSON-RPC method names for `eveFrontierRpcRequest`? (tried ~20, all "method not found")
  - `system.listMethods` / `rpc.discover` may enumerate them
- What Python object names does `ccpPython.pythonCall` accept?
  - `_eveFrontierRpcRequest` uses `""` as objname — what others exist?
- `callWallet` — same source as `eveFrontierRpcRequest`, different Python endpoint?
- Can we get assembly/character IDs via any of these?
