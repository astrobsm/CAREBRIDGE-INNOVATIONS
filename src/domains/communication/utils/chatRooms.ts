// ---------------------------------------------------------------------------
// Chat room rules shared by the chat page and its tests.
// ---------------------------------------------------------------------------

import type { ChatRoom } from '../../../types';

/**
 * Rooms shown in the list: every room that is not archived.
 *
 * The list used `where('isArchived').equals(0)`, but rooms are created with
 * `isArchived: false` - and a boolean is not a valid IndexedDB key, so those
 * rooms were never in the index at all. No room created in the app ever
 * appeared in the list; creating one opened an empty pane.
 */
export function isListedRoom(room: Pick<ChatRoom, 'isArchived'>): boolean {
  return !room.isArchived;
}

/**
 * The existing one-to-one conversation between two people, if any.
 * "New conversation" with someone you already talk to opens that one instead
 * of starting a second, so the history stays in one place.
 */
export function findDirectRoom<T extends Pick<ChatRoom, 'type' | 'isArchived' | 'participants'>>(
  rooms: T[],
  userA: string,
  userB: string
): T | undefined {
  return rooms.find(room => {
    if (room.type !== 'direct' || room.isArchived) return false;
    const ids = new Set(room.participants.map(p => p.userId));
    return ids.size === 2 && ids.has(userA) && ids.has(userB);
  });
}

/**
 * The name to show for a room. A direct conversation is named after the
 * other person - it is stored under the name of whoever started it, which
 * showed each recipient their own name.
 */
export function roomDisplayName(room: Pick<ChatRoom, 'type' | 'name' | 'participants'>, viewerId?: string): string {
  if (room.type === 'direct') {
    const other = room.participants.find(p => p.userId !== viewerId);
    if (other?.userName) return other.userName;
  }
  return room.name;
}
