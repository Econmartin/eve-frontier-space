// ─── Package ─────────────────────────────────────────────────────────────────
// Fresh deploy 2026-03-22: added merge_shares, split_share, burn_expired_ticket,
// lottery rounds (current_round / LotteryTicket.round), u128 overflow fix.
export const PACKAGE_ID =
  (import.meta.env.VITE_PACKAGE_ID as string) ??
  '0x51c9dc67394cc377069884bf757b27ae62553e366aa45a692e3c3daea46f1beb';

// Same as PACKAGE_ID — no upgrades yet on new deploy.
export const LATEST_PACKAGE_ID = PACKAGE_ID;

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
    centralBankId:   '0x7ac8c370e80674ddb5cb3363453188f419d6fe94c6b51906e4d6a18128f06615',
    lotterySystemId: '0x405d406b7ed3dae80a3e996c7a32552f429e33d15480a9c7637c275c6a86f70f',
    loanProductId:   '0xfa4f0cbdcdb650720b2d761b16d3b5a685e1e28791b4921132c128368175907b',
  },
  stillness: {
    id:              'stillness',
    label:           'Stillness',
    eveCoinType:     '0x2a66a89b5a735738ffa4423ac024d23571326163f324f9051557617319e59d60::EVE::EVE',
    centralBankId:   '0x0a77f7b7b1c78f46f055e28435c6b7c12e76be130270db50b07d535cf64132d0',
    lotterySystemId: '0x789504a42610c0d070e61826f49034d3a21593cb3b48024f3f20a15340a9f2c4',
    loanProductId:   '0xfa4f0cbdcdb650720b2d761b16d3b5a685e1e28791b4921132c128368175907b',
  },
};

export const DEFAULT_NETWORK: NetworkId = 'utopia';

// ─── Universal token constants ────────────────────────────────────────────────
export const EVE_DECIMALS = 9;
export const EVE_SCALE = BigInt(10 ** EVE_DECIMALS); // 1_000_000_000n

// ─── Network RPC ─────────────────────────────────────────────────────────────
export const NETWORK_URL =
  (import.meta.env.VITE_RPC_URL as string) ?? 'https://rpc.testnet.sui.io:443';
