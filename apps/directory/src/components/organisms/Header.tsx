/**
 * Directory app header — wraps the shared AppHeader with a wallet
 * connect/disconnect button. Shows abbreviated wallet address when connected.
 */
import { AppHeader } from '@eve-frontier-space/ui';
import { useConnection, abbreviateAddress } from '@evefrontier/dapp-kit';
import { useCurrentAccount } from '@mysten/dapp-kit-react';

export function Header() {
  const { isConnected, handleConnect, handleDisconnect } = useConnection();
  const account = useCurrentAccount();

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
