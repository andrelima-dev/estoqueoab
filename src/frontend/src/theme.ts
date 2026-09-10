import { createTheme } from '@mantine/core';
import { themeToVars } from '@mantine/vanilla-extract';

import { oabBlue, oabRed } from './defaults/oab';

/**
 * Tema base usado para gerar as variáveis CSS consumidas pelos arquivos
 * `*.css.ts`. A paleta institucional precisa estar declarada aqui para que
 * `vars.colors.oabBlue[...]` exista no CSS estático — o tema de execução, em
 * `contexts/ThemeContext.tsx`, declara as mesmas cores.
 */
export const theme = createTheme({
  colors: {
    oabBlue: oabBlue,
    oabRed: oabRed
  }
});

export const vars = themeToVars(theme);
