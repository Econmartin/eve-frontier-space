// ─── Package ─────────────────────────────────────────────────────────────────
// Original deploy address — used for object type filters (types always reference the original ID).
export const PACKAGE_ID =
  (import.meta.env.VITE_PACKAGE_ID as string) ??
  '0x894e36203b6f1f00cf351ee518cfb442a228700df71443b18544c61021dc0b59';

// Latest upgraded package — used for transaction function calls.
// Fixed u128 overflow in deposit/withdraw muldiv (upgraded 2026-03-22).
export const LATEST_PACKAGE_ID =
  (import.meta.env.VITE_LATEST_PACKAGE_ID as string) ??
  '0xbce507d59941f89f20b8f08641c6ad4da27076285bdbc2d62d5b8763bc54373e';

// ─── Network configs ─────────────────────────────────────────────────────────
export type NetworkId = 'utopia' | 'stillness';

export interface NetworkConfig {
  id:              NetworkId;
  label:           string;
  eveCoinType:     string;
  centralBankId:   string;
  lotterySystemId: string;
  loanProductId:   string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  utopia: {
    id:              'utopia',
    label:           'Utopia',
    eveCoinType:     '0xf0446b93345c1118f21239d7ac58fb82d005219b2016e100f074e4d17162a465::EVE::EVE',
    centralBankId:   '0x94f7b57b4de3cc14433805d8999c94d641ff9b3f45cd02e482962e81e56bb659',
    lotterySystemId: '0xf1b281f1197f2105649d4926697f107eb7e74cb05f0de8fe0cb5256f51a26d26',
    loanProductId:   '0x02e0b41bc68bb626a4ab0a5d1b3996a3f5f4d79c612b1ea67f14a02e2c6132c6',
  },
  stillness: {
    id:              'stillness',
    label:           'Stillness',
    eveCoinType:     '0x2a66a89b5a735738ffa4423ac024d23571326163f324f9051557617319e59d60::EVE::EVE',
    centralBankId:   '0x4d72ce7c643024bf9d20d73fad9dbab36a15240b486004b1dcc385fde7e0cc4e',
    lotterySystemId: '0x7d3e57be68c5698d1f764bd8e392818da0d72853a9e596dbd4ec684ec8295898',
    loanProductId:   '0x02e0b41bc68bb626a4ab0a5d1b3996a3f5f4d79c612b1ea67f14a02e2c6132c6',
  },
};

export const DEFAULT_NETWORK: NetworkId = 'utopia';

// ─── Universal token constants ────────────────────────────────────────────────
export const EVE_DECIMALS = 9;
export const EVE_SCALE = BigInt(10 ** EVE_DECIMALS); // 1_000_000_000n

// ─── Network RPC ─────────────────────────────────────────────────────────────
export const NETWORK_URL =
  (import.meta.env.VITE_RPC_URL as string) ?? 'https://rpc.testnet.sui.io:443';
