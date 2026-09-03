import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { getConfig, engineLabel } from '@/lib/config';

/**
 * The clinical workspace shell.
 *
 * Engine status is resolved on the server so the operator can see, before
 * starting a run, whether the reasoning stages will be model-backed or running
 * on the on-device fallback. Silently degrading would be the wrong behaviour in
 * a medical context.
 */
export default function ProductLayout({ children }: { children: ReactNode }) {
  const config = getConfig();

  return (
    <AppShell
      engineLabel={engineLabel(config.engine)}
      engineReady={config.engine === 'mistral'}
    >
      {children}
    </AppShell>
  );
}
