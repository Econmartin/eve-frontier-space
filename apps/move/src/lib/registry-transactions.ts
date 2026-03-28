import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import {
  REGISTRY_PACKAGE_ID,
  REGISTRY_OBJECT_ID,
  REGISTRY_INITIAL_SHARED_VERSION,
  REGISTRY_GAS_BUDGET,
} from './registry-constants';

function buildRegisterTx(course: 1 | 2, name: string): Transaction {
  const tx = new Transaction();
  const nameBytes = [...new TextEncoder().encode(name.trim().slice(0, 64))];

  tx.moveCall({
    target: `${REGISTRY_PACKAGE_ID}::course_registry::register_course${course}`,
    arguments: [
      // Explicit shared object ref so wallets can simulate without an extra RPC call
      tx.sharedObjectRef({
        objectId: REGISTRY_OBJECT_ID,
        initialSharedVersion: REGISTRY_INITIAL_SHARED_VERSION,
        mutable: true,
      }),
      tx.pure(bcs.vector(bcs.u8()).serialize(nameBytes)),
    ],
  });
  tx.setGasBudget(REGISTRY_GAS_BUDGET);
  return tx;
}

export const buildRegisterCourse1Tx = (name: string) => buildRegisterTx(1, name);
export const buildRegisterCourse2Tx = (name: string) => buildRegisterTx(2, name);
