import { Transaction } from '@mysten/sui/transactions';
import { FAVORITES_PACKAGE_ID } from './constants';

const GAS_BUDGET = 10_000_000;

/**
 * First-time use: create a Favorites object, add the URL, and transfer it
 * to the sender — all in a single PTB.
 */
export function buildCreateAndAddFavoriteTx(url: string, senderAddress: string): Transaction {
  const pkg = FAVORITES_PACKAGE_ID;
  const tx = new Transaction();
  const fav = tx.moveCall({ target: `${pkg}::favorites::create` });
  tx.moveCall({
    target: `${pkg}::favorites::add`,
    arguments: [fav, tx.pure.string(url)],
  });
  tx.transferObjects([fav], tx.pure.address(senderAddress));
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}

/**
 * Add a URL to an existing Favorites object.
 */
export function buildAddFavoriteTx(favObjectId: string, url: string): Transaction {
  const pkg = FAVORITES_PACKAGE_ID;
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::favorites::add`,
    arguments: [tx.object(favObjectId), tx.pure.string(url)],
  });
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}

/**
 * Remove a URL from an existing Favorites object.
 */
export function buildRemoveFavoriteTx(favObjectId: string, url: string): Transaction {
  const pkg = FAVORITES_PACKAGE_ID;
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::favorites::remove`,
    arguments: [tx.object(favObjectId), tx.pure.string(url)],
  });
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}
