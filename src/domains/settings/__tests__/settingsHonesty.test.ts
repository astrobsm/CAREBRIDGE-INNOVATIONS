// ---------------------------------------------------------------------------
// Settings do what they say. Saving the profile used to wait a second and
// report success without writing anything; notification, appearance, sync,
// password, 2FA, session, import and delete controls changed nothing at all;
// and the button that throws away unsynced work had no confirmation.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(process.cwd(), 'src/domains/settings/pages/SettingsPage.tsx'), 'utf8');

describe('Settings page', () => {
  it('saves the profile for real, and leaves the sign-in email to administrators', () => {
    expect(src).toMatch(/await updateUser\(\{\s*firstName,\s*lastName,/);
    expect(src).not.toMatch(/Simulate API call/);
    expect(src).not.toMatch(/setTimeout\(resolve, (500|1000)\)/);
    expect(src).not.toMatch(/setProfileSettings\(\{ \.\.\.profileSettings, email:/);
  });

  it('has no controls that change nothing', () => {
    for (const dead of [
      'notificationSettings', 'appearanceSettings', 'offlineSettings',
      'Enable 2FA', 'Sign Out All Other Devices', 'Lagos, Nigeria',
      'Change Password', 'Import Data', 'Delete All Local Data',
    ]) {
      expect(src, dead).not.toContain(dead);
    }
    expect(src).not.toMatch(/id: 'appearance'/);
  });

  it('asks before discarding unsynced changes, and will not clear the app cache offline', () => {
    expect(src).not.toMatch(/onClick=\{\(\) => offlineDataManager\.clearAllPending\(\)\}/);
    expect(src).toMatch(/handleDiscardPending[\s\S]*window\.confirm\([\s\S]*clearAllPending\(\)/);
    expect(src).toMatch(/handleClearCache = async \(\) => \{\s*\/\/[^\n]*\n[^\n]*\n\s*if \(!offlineState\.isOnline\)/);
  });

  it('sign-out on this device is real', () => {
    expect(src).toMatch(/onClick=\{logout\}/);
  });
});

describe('Header', () => {
  it('shows no permanent unread dot over an always-empty notifications panel', () => {
    const header = readFileSync(join(process.cwd(), 'src/components/navigation/Header.tsx'), 'utf8');
    expect(header).not.toMatch(/absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full/);
  });
});
