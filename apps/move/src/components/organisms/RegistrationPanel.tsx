import { useState } from 'react';
import { useCurrentAccount, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
import { abbreviateAddress } from '@evefrontier/dapp-kit';
import { useCompleters } from '@/hooks/useCompleters';
import { buildRegisterCourse1Tx, buildRegisterCourse2Tx } from '@/lib/registry-transactions';

interface Props {
  course: 1 | 2;
}

export function RegistrationPanel({ course }: Props) {
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
  const { data: completers, refetch } = useCompleters();

  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const existingRecord = completers?.find(
    (c) => c.address === account?.address && c.courses.includes(course),
  );
  const isRegistered = !!existingRecord || status === 'success';

  const handleRegister = async () => {
    const trimmed = name.trim();
    if (!trimmed || !account) return;
    setStatus('pending');
    setErrorMsg('');
    try {
      const tx = course === 1 ? buildRegisterCourse1Tx(trimmed) : buildRegisterCourse2Tx(trimmed);
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setStatus('success');
      setTimeout(() => refetch(), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      const isJwtError = msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('nonce');
      setStatus('error');
      setErrorMsg(isJwtError
        ? 'JWT session expired — sign out of your EVE Frontier account and sign back in, then try again.'
        : msg,
      );
    }
  };

  return (
    <div className="w-full max-w-lg mt-10 pt-10 border-t border-border animate-fade-in">
      <p className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase mb-5 text-center">
        Inscribe on Stillness
      </p>

      {!isConnected ? (
        <div className="text-center">
          <p className="text-xs text-text-muted mb-5 leading-relaxed">
            Connect your EVE Frontier wallet to write your name into the Stillness chain permanently.
          </p>
          <button
            onClick={handleConnect}
            className="font-mono text-xs font-semibold tracking-wider px-6 py-2.5 rounded-lg border border-cyan/40 text-cyan bg-cyan-glow hover:bg-cyan/15 hover:border-cyan transition-all"
          >
            Connect Wallet →
          </button>
        </div>
      ) : isRegistered ? (
        <div className="text-center">
          <p className="font-mono text-[10px] text-cyan tracking-wider mb-1">
            ◈ Inscribed on Stillness
          </p>
          <p className="text-xs text-text-muted">
            Registered as <span className="text-text font-semibold">"{existingRecord?.name ?? name}"</span>
            {' '}·{' '}
            <span className="text-text-dim">{abbreviateAddress(account!.address)}</span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs text-text-muted">
              Connected as <span className="text-text font-mono text-[11px]">{abbreviateAddress(account!.address)}</span>
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('eve-dapp-connected');
                window.location.reload();
              }}
              className="font-mono text-[10px] text-text-dim hover:text-text-muted transition-colors"
            >
              (disconnect)
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 64))}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              placeholder="Your name or alias…"
              maxLength={64}
              className="flex-1 font-mono text-xs bg-panel border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-text-dim focus:outline-none focus:border-cyan/50 transition-colors"
            />
            <button
              onClick={handleRegister}
              disabled={!name.trim() || status === 'pending'}
              className="font-mono text-xs font-semibold tracking-wider px-5 py-2.5 rounded-lg border border-cyan/40 text-cyan bg-cyan-glow hover:bg-cyan/15 hover:border-cyan transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'pending' ? 'Signing…' : 'Inscribe →'}
            </button>
          </div>
          {status === 'error' && (
            <p className="font-mono text-[10px] text-red-400 text-center">{errorMsg}</p>
          )}
          <p className="font-mono text-[10px] text-text-dim text-center">
            Free to register · costs only a small amount of testnet SUI gas
          </p>
        </div>
      )}
    </div>
  );
}
