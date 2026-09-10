import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react';
import {
  MantineProvider,
  type MantineThemeOverride,
  createTheme
} from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { ContextMenuProvider } from 'mantine-contextmenu';
import type { JSX } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AboutInvenTreeModal } from '../components/modals/AboutInvenTreeModal';
import { HotkeyModal } from '../components/modals/HotkeyModal';
import { LicenseModal } from '../components/modals/LicenseModal';
import { QrModal } from '../components/modals/QrModal';
import { ServerInfoModal } from '../components/modals/ServerInfoModal';
import { OAB_FONT_FAMILY, oabBlue, oabRed } from '../defaults/oab';
import { useLocalState } from '../states/LocalState';
import { LanguageContext } from './LanguageContext';
import { colorSchema } from './colorSchema';

export function ThemeContext({
  children
}: Readonly<{ children: JSX.Element }>) {
  const [userTheme] = useLocalState(useShallow((state) => [state.userTheme]));

  let customUserTheme: MantineThemeOverride | undefined = undefined;

  // Theme
  try {
    customUserTheme = createTheme({
      // Paleta institucional da OAB-MA (ver defaults/oab.tsx)
      colors: {
        oabBlue: oabBlue,
        oabRed: oabRed
      },
      primaryColor: userTheme.primaryColor,
      // O índice 6 das paletas carrega o Pantone oficial
      primaryShade: 6,
      fontFamily: OAB_FONT_FAMILY,
      fontFamilyMonospace: "'Barlow', ui-monospace, monospace",
      white: userTheme.whiteColor,
      black: userTheme.blackColor,
      defaultRadius: userTheme.radius,
      // Sombras discretas no lugar de bordas duras: o sistema e usado o dia
      // inteiro, entao o contorno dos blocos precisa ser suave.
      shadows: {
        xs: '0 1px 2px rgba(13, 63, 124, 0.06), 0 1px 3px rgba(13, 63, 124, 0.04)',
        sm: '0 1px 3px rgba(13, 63, 124, 0.08), 0 4px 12px rgba(13, 63, 124, 0.05)'
      },
      headings: {
        fontFamily: OAB_FONT_FAMILY,
        fontWeight: '600'
      },
      components: {
        Card: { defaultProps: { shadow: 'xs', radius: 'md' } },
        Paper: { defaultProps: { shadow: 'xs', radius: 'md' } },
        Button: { defaultProps: { radius: 'md' } }
      },
      breakpoints: {
        xs: '30em',
        sm: '48em',
        md: '64em',
        lg: '74em',
        xl: '90em'
      }
    });
  } catch (error) {
    console.error('Error creating theme with user settings:', error);
    // Fallback to default theme if there's an error
    customUserTheme = undefined;
  }

  return (
    <MantineProvider theme={customUserTheme} colorSchemeManager={colorSchema}>
      <ContextMenuProvider>
        <LanguageContext>
          <ModalsProvider
            labels={{
              confirm: <Trans id={msg`Submit`.id} />,
              cancel: <Trans id={msg`Cancel`.id} />
            }}
            modals={{
              info: ServerInfoModal,
              about: AboutInvenTreeModal,
              license: LicenseModal,
              qr: QrModal,
              hotkey: HotkeyModal
            }}
          >
            <Notifications />
            {children}
          </ModalsProvider>
        </LanguageContext>
      </ContextMenuProvider>
    </MantineProvider>
  );
}
