#[allow(lint(self_transfer))]
module favorites::favorites;

use std::string::String;

// ─── Error codes ─────────────────────────────────────────────────────────────
const E_ALREADY_EXISTS:    u64 = 0;
const E_NOT_FOUND:         u64 = 1;
const E_TOO_MANY_FAVORITES: u64 = 2;
const E_URL_TOO_LONG:      u64 = 3;

const MAX_FAVORITES: u64 = 100;
const MAX_URL_LEN:   u64 = 512;

// ─── Types ───────────────────────────────────────────────────────────────────

/// Owned by the wallet holder — holds their list of favourite app URLs.
/// One object per wallet; created once, mutated on every add/remove.
public struct Favorites has key, store {
    id:   UID,
    urls: vector<String>,
}

// ─── Entry points ────────────────────────────────────────────────────────────

/// Create an empty Favorites and return it so the caller can chain
/// add() and transfer() in a single PTB.
public fun create(ctx: &mut TxContext): Favorites {
    Favorites { id: object::new(ctx), urls: vector::empty() }
}

/// Add a URL to the favourites list.
public fun add(fav: &mut Favorites, url: String) {
    assert!(url.length() <= MAX_URL_LEN, E_URL_TOO_LONG);
    assert!(!fav.urls.contains(&url), E_ALREADY_EXISTS);
    assert!(fav.urls.length() < MAX_FAVORITES, E_TOO_MANY_FAVORITES);
    fav.urls.push_back(url);
}

/// Remove a URL from the favourites list.
public fun remove(fav: &mut Favorites, url: String) {
    let (found, idx) = fav.urls.index_of(&url);
    assert!(found, E_NOT_FOUND);
    fav.urls.remove(idx);
}
