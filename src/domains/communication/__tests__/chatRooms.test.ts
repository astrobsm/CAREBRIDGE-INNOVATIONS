// ---------------------------------------------------------------------------
// Chat rooms appear once created, a direct conversation is reused rather than
// duplicated, and a direct room is named after the other person.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { findDirectRoom, isListedRoom, roomDisplayName } from '../utils/chatRooms';

const p = (userId: string, userName = userId) => ({ userId, userName });
const room = (over: Record<string, unknown>) => ({
  type: 'group', isArchived: false, name: 'Room', participants: [p('me'), p('ada', 'Ada Obi')], ...over,
}) as never;

describe('isListedRoom', () => {
  it('lists rooms stored with isArchived false (the value the app writes)', () => {
    expect(isListedRoom({ isArchived: false })).toBe(true);
    expect(isListedRoom({ isArchived: 0 as unknown as boolean })).toBe(true);
    expect(isListedRoom({ isArchived: true })).toBe(false);
  });

  it('the chat page no longer queries a boolean through the index', () => {
    const page = readFileSync(join(process.cwd(), 'src/domains/communication/pages/ChatPage.tsx'), 'utf8');
    expect(page).not.toMatch(/where\('isArchived'\)\s*\.equals\(0\)/);
    expect(page).toMatch(/db\.chatRooms\.filter\(isListedRoom\)/);
    expect(page).toMatch(/findDirectRoom\(chatRooms \|\| \[\], user\.id, participantIds\[0\]\)/);
  });
});

describe('findDirectRoom', () => {
  const rooms = [
    room({ id: 'g', type: 'group', participants: [p('me'), p('ada')] }),
    room({ id: 'old', type: 'direct', isArchived: true, participants: [p('me'), p('ada')] }),
    room({ id: 'd', type: 'direct', participants: [p('ada'), p('me')] }),
    room({ id: 'other', type: 'direct', participants: [p('me'), p('bayo')] }),
  ];

  it('finds the live one-to-one room for the pair, in either order', () => {
    expect((findDirectRoom(rooms, 'me', 'ada') as { id: string } | undefined)?.id).toBe('d');
    expect((findDirectRoom(rooms, 'ada', 'me') as { id: string } | undefined)?.id).toBe('d');
  });

  it('ignores groups, archived rooms and other pairs', () => {
    expect(findDirectRoom(rooms, 'me', 'chidi')).toBeUndefined();
  });
});

describe('roomDisplayName', () => {
  it('names a direct room after the other person, whoever started it', () => {
    const r = room({ type: 'direct', name: 'Ada Obi', participants: [p('me', 'Me Myself'), p('ada', 'Ada Obi')] });
    expect(roomDisplayName(r, 'ada')).toBe('Me Myself');
    expect(roomDisplayName(r, 'me')).toBe('Ada Obi');
  });

  it('keeps the room name for groups', () => {
    expect(roomDisplayName(room({ type: 'group', name: 'Theatre list' }), 'me')).toBe('Theatre list');
  });
});
