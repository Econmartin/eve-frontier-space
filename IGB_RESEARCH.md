# EVE Frontier IGB Bridge Research

Notes on the undocumented JavaScript bridge functions injected by the game client into the in-game browser (IGB).

---

## Architecture

```
eveFrontierRpcRequest(request)          — JSON-RPC 2.0 polling wrapper
  └─ _eveFrontierRpcRequest(id, req)    — calls ccpPython.pythonCall("", "_eveFrontierRpcRequest", args)
       └─ ccpPython.pythonCall(obj, fn, args)  — calls __pythonCall (native)
            └─ __pythonCall()           — [native code] — actual Python bridge

callWallet(request)                     — Sui wallet standard JSON-RPC endpoint
  └─ same polling wrapper as eveFrontierRpcRequest
```

`pythonReply(idx, err, reply)` is called by the native layer to resolve/reject pending promises.

---

## Confirmed Working

### `callWallet` — Sui Wallet Standard

Follows [Sui wallet standard](https://docs.sui.io/standards/wallet-standard). Request format: `{ jsonrpc: "2.0", id, method, params }`.

#### `connect` ✅
```js
callWallet({ jsonrpc: "2.0", id: 1, method: "connect", params: [] })
```
Returns the player's wallet accounts:
```json
{
  "result": {
    "accounts": [
      {
        "suiAddress": "0x5dfdb9...",
        "pubkey": "AIeSK+9T...",
        "chains": ["sui:testnet"]
      }
    ]
  }
}
```

---

## Function Sources

### `eveFrontierRpcRequest(request, interval=10, timeout=30000)`
Polls `_eveFrontierRpcRequest` until response `status` is `done`, `failed`, or times out.
Response shape from `_eveFrontierRpcRequest`: `{ id: "<uuid>", status: "pending"|"done"|"failed", response }`.
Is a **JSON-RPC 2.0** endpoint — request format: `{ jsonrpc: "2.0", id, method, params }`.
**All method names tried so far return -32603 "Method not found"** — may only expose methods when dapp is opened from a registered on-chain smart assembly.

### `_eveFrontierRpcRequest(requestId, request)`
```js
function() { return ccpPython.pythonCall("", "_eveFrontierRpcRequest", Array.prototype.slice.call(arguments)); }
```
Raw Python call. First call: pass `null` as requestId, get back `{ id: "<uuid>", status: "pending", response: null }`. Then poll with the returned uuid until `status === "done"`.

### `callWallet(request, interval=10, timeout=30000)`
Identical polling wrapper to `eveFrontierRpcRequest`. Implements **Sui wallet standard** JSON-RPC.
Confirmed methods: `connect` → returns `{ accounts: [{ suiAddress, pubkey, chains }] }`.

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
Core bridge. Valid object names unknown except `""` (used by `_eveFrontierRpcRequest`).
All other object names tried (`igb`, `sm`, `assembly`, `character`, `dapp`, `frontier`) timed out — likely don't exist.

### `ccpPython.pythonReply(idx, err, reply)`
Called by native layer to resolve/reject pending `pythonCall` promises.

### `__pythonCall()` — `[native code]`
### `captureEvents()` — `[native code]` (legacy DOM, not IGB-specific)
### `releaseEvents()` — `[native code]` (legacy DOM, not IGB-specific)

---

## Known Globals on `window`

| Name | Type | Notes |
|------|------|-------|
| `eveFrontierRpcRequest` | function | JSON-RPC 2.0 — no working methods found yet |
| `_eveFrontierRpcRequest` | function | Raw Python bridge, UUID-based polling |
| `callWallet` | function | Sui wallet standard — `connect` confirmed working |
| `ccpPython` | object | `pythonCall` + `pythonReply` — only `""` objname confirmed |
| `__pythonCall` | function | Native Python bridge |
| `captureEvents` | function | Native legacy DOM |
| `releaseEvents` | function | Native legacy DOM |
| `WALLET_API_CHAIN` | string | `"sui:testnet"` |

---

## Open Questions

- What are the valid JSON-RPC method names for `eveFrontierRpcRequest`?
  - May only be available when dapp is opened from a registered on-chain smart assembly
- What other `callWallet` methods work beyond `connect`? (signTransaction, getAccounts, etc.)
- Can we get the current assembly ID or character ID via any bridge?
