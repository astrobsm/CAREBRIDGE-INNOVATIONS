// ---------------------------------------------------------------------------
// Unsaved-changes guard.
//
// The app mounts a <BrowserRouter> (src/bootEmr.tsx), not a data router, so
// react-router's useBlocker is not available (it throws outside a data
// router). The guard therefore covers what it can:
//   - closing / reloading the tab: a beforeunload prompt while dirty;
//   - the page's own navigation buttons: call confirmLeave() before navigating.
// Sidebar links and the browser Back button are not intercepted, which is
// why pages using this should also autosave a draft.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef } from 'react';

export const DEFAULT_UNSAVED_MESSAGE =
  'You have unsaved changes. They are kept as a draft on this device and restored when you come back. Leave this page?';

export function useUnsavedChangesGuard(isDirty: boolean, message: string = DEFAULT_UNSAVED_MESSAGE) {
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by some browsers to show the prompt; the text is not shown.
      e.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, message]);

  /** true when it is fine to leave (nothing unsaved, or the user agreed). */
  const confirmLeave = useCallback(
    () => !dirtyRef.current || window.confirm(message),
    [message],
  );

  return { confirmLeave };
}
