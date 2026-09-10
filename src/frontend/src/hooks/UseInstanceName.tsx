import { useMemo } from 'react';

import { OAB_SYSTEM_SHORT_NAME } from '../defaults/oab';
import { useGlobalSettingsState } from '../states/SettingsStates';

/**
 * Simple hook for returning the "instance name" of the Server
 */
export default function useInstanceName(): string {
  const globalSettings = useGlobalSettingsState();

  return useMemo(() => {
    return globalSettings.getSetting(
      'INVENTREE_INSTANCE',
      OAB_SYSTEM_SHORT_NAME
    );
  }, [globalSettings]);
}
