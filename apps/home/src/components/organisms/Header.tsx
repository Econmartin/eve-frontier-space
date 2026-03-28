import { AppHeader } from '@eve-frontier-space/ui';

interface HeaderProps {
  hideActions?: boolean;
}

export function Header({ hideActions: _hideActions = false }: HeaderProps) {
  return <AppHeader />;
}
