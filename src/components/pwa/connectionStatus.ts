/**
 * What the header should say about connectivity.
 *
 * "Online" (green) used to mean only that the device had a network. With an
 * offline (device-only) sign-in or no Supabase, nothing syncs even with full
 * signal, so a green wifi icon was false reassurance. Three honest states:
 *   - cloud:    network + a real online session + Supabase: work syncs.
 *   - local:    network, but an offline session (or no cloud configured):
 *               work stays on this device until an online sign-in.
 *   - offline:  no network at all.
 */
export type ConnectionKind = 'cloud' | 'local' | 'offline';

export interface ConnectionInput {
  networkOnline: boolean;
  sessionMode: 'online' | 'offline' | null;
  cloudConfigured: boolean;
}

export interface ConnectionStatus {
  kind: ConnectionKind;
  /** Short label (header chip on wider screens). */
  label: string;
  /** One-sentence explanation (tooltip / popover). */
  detail: string;
}

export function describeConnection({ networkOnline, sessionMode, cloudConfigured }: ConnectionInput): ConnectionStatus {
  if (!networkOnline) {
    return {
      kind: 'offline',
      label: 'Offline',
      detail: 'No network. Your work is saved on this device and syncs when you are back online and signed in online.',
    };
  }
  if (!cloudConfigured) {
    return {
      kind: 'local',
      label: 'Local only',
      detail: 'Cloud sync is not set up on this installation. Work is saved on this device only.',
    };
  }
  if (sessionMode !== 'online') {
    return {
      kind: 'local',
      label: 'Not syncing',
      detail: 'Signed in offline: your work is saved on this device. Sign in online to sync it.',
    };
  }
  return {
    kind: 'cloud',
    label: 'Online',
    detail: 'Online and signed in. Changes sync to the cloud.',
  };
}
