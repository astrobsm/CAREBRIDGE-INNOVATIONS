import { useOutletContext } from 'react-router-dom';
import type { ChildSession } from '../../../../services/childAuth';

export function useChildCtx(): { session: ChildSession } {
  return useOutletContext<{ session: ChildSession }>();
}
