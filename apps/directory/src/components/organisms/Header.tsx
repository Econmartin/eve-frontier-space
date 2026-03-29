/**
 * Directory app header — wraps the shared AppHeader with a wallet
 * connect/disconnect button. Shows abbreviated wallet address when connected.
 */
import { AppHeader } from '@eve-frontier-space/ui';
import { abbreviateAddress } from '@evefrontier/dapp-kit';
import { useCurrentAccount, useDAppKit, useWallets } from '@mysten/dapp-kit-react';

export function Header() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const wallets = useWallets();
  const isConnected = !!account;

  // Prefer the "Eve Vault" popup over the Chrome extension — the extension has
  // a JWT nonce issue on testnet. Fall back to extension then any wallet.
  const handleConnect = () => {
    const popup = wallets.find(w => w.name === 'Eve Vault');
    const extension = wallets.find(w => w.name === 'EVE Frontier Client Wallet');
    const wallet = popup ?? extension ?? wallets[0];
    if (wallet) {
      localStorage.setItem('eve-dapp-connected', 'true');
      dAppKit.connectWallet({ wallet });
    }
  };

  const handleDisconnect = () => {
    // Eve Vault doesn't implement standard:disconnect — clear state and reload.
    localStorage.removeItem('eve-dapp-connected');
    window.location.reload();
  };

  const walletBtn = isConnected && account ? (
    <button
      onClick={handleDisconnect}
      className="font-mono text-[11px] uppercase px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer"
      style={{
        background: 'rgba(255,97,10,0.1)',
        border: '1px solid rgba(255,97,10,0.3)',
        color: '#ff610a',
        letterSpacing: '0.06em',
      }}
    >
      {abbreviateAddress(account.address)}
    </button>
  ) : (
    <button
      onClick={handleConnect}
      className="font-mono text-[11px] uppercase px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: '0.06em',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,97,10,0.3)';
        (e.currentTarget as HTMLElement).style.color = '#ff610a';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
      }}
    >
      Connect Wallet
    </button>
  );

  return <AppHeader homeHref="/" right={walletBtn} />;
}
