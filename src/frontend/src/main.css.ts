import { rem } from '@mantine/core';
import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from './theme';

/**
 * Barra superior institucional.
 *
 * Azul Pantone 301 C com filete no vermelho Pantone 200 C -- a dupla azul e
 * vermelho e a propria identidade da OAB. Como o cabecalho e escuro nos dois
 * esquemas de cor, o conteudo dentro dele e forcado para branco.
 */
export const layoutHeader = style({
  paddingTop: vars.spacing.sm,
  marginBottom: 18,
  borderBottom: `${rem(3)} solid ${vars.colors.oabRed[6]}`,

  [vars.lightSelector]: { backgroundColor: vars.colors.oabBlue[9] },
  [vars.darkSelector]: { backgroundColor: vars.colors.oabBlue[9] }
});

export const layoutFooter = style({
  marginTop: 10,
  [vars.lightSelector]: { borderTop: `1px solid ${vars.colors.gray[2]}` },
  [vars.darkSelector]: { borderTop: `1px solid ${vars.colors.dark[5]}` }
});

export const layoutHeaderSection = style({
  paddingBottom: vars.spacing.sm
});

// A faixa de navegacao e escura, entao tudo dentro dela precisa ser claro --
// inclusive os icones herdados do InvenTree. O escopo para aqui de proposito:
// alertas que moram no mesmo cabecalho mantem as proprias cores.
globalStyle(
  `${layoutHeaderSection} button, ${layoutHeaderSection} a, ${layoutHeaderSection} svg, ${layoutHeaderSection} .mantine-Text-root`,
  { color: vars.colors.white }
);

export const layoutHeaderUser = style({
  padding: `${vars.spacing.xs}px ${vars.spacing.sm}px`,
  borderRadius: vars.radiusDefault,
  transition: 'background-color 100ms ease',

  [vars.lightSelector]: { color: vars.colors.black },
  [vars.darkSelector]: { color: vars.colors.dark[0] },

  '@media': {
    [vars.smallerThan('xs')]: {
      display: 'none'
    }
  }
});

export const headerDropdownFooter = style({
  margin: `calc(${vars.spacing.md} * -1)`,
  marginTop: vars.spacing.sm,
  padding: `${vars.spacing.md} calc(${vars.spacing.md} * 2)`,
  paddingBottom: vars.spacing.xl,

  [vars.lightSelector]: {
    backgroundColor: vars.colors.gray[0],
    borderTop: `${rem(1)} solid ${vars.colors.gray[1]}`
  },
  [vars.darkSelector]: {
    backgroundColor: vars.colors.dark[7],
    borderTop: `${rem(1)} solid ${vars.colors.dark[5]}`
  }
});

export const link = style({
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  paddingLeft: vars.spacing.md,
  paddingRight: vars.spacing.md,
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: vars.fontSizes.sm,

  [vars.lightSelector]: { color: vars.colors.black },
  [vars.darkSelector]: { color: vars.colors.white },

  '@media': {
    [vars.smallerThan('sm')]: {
      height: rem(42),
      display: 'flex',
      alignItems: 'center',
      width: '100%'
    }
  },

  ':hover': {
    [vars.lightSelector]: { backgroundColor: vars.colors.gray[0] },
    [vars.darkSelector]: { backgroundColor: vars.colors.dark[6] }
  }
});

export const docHover = style({
  border: '1px dashed '
});

export const layoutContent = style({
  flex: 1,
  width: '100%'
});

export const tabs = style({
  '@media': {
    [vars.smallerThan('sm')]: {
      display: 'none'
    }
  }
});

export const tabsList = style({
  borderBottom: '0 !important'
});

export const tab = style({
  fontWeight: 500,
  height: 40,
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: 0,
  color: 'rgba(255, 255, 255, 0.78)',
  borderBottom: '3px solid transparent',
  transition: 'color 120ms ease, border-color 120ms ease',

  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: vars.colors.white
  },

  selectors: {
    '&[data-active]': {
      backgroundColor: 'transparent',
      color: vars.colors.white,
      fontWeight: 600,
      borderBottom: `3px solid ${vars.colors.oabRed[5]}`
    }
  }
});

export const error = style({
  backgroundColor: vars.colors.gray[0],
  color: vars.colors.red[6]
});

export const dashboardItemValue = style({
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1
});

export const dashboardItemTitle = style({
  fontWeight: 700
});

export const card = style({
  [vars.lightSelector]: { backgroundColor: vars.colors.white },
  [vars.darkSelector]: { backgroundColor: vars.colors.dark[7] }
});

/** Cartao de indicador do painel: numero grande e faixa de acento a esquerda. */
export const kpiCard = style({
  position: 'relative',
  overflow: 'hidden',
  height: '100%',
  border: `${rem(1)} solid ${vars.colors.gray[2]}`,

  '::before': {
    content: '""',
    position: 'absolute',
    insetBlock: 0,
    insetInlineStart: 0,
    width: rem(4),
    backgroundColor: 'currentColor',
    opacity: 0.9
  }
});

export const kpiValue = style({
  fontSize: rem(30),
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: '-0.02em'
});

export const kpiLabel = style({
  fontSize: rem(11),
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
});

/** Cabecalho de pagina com titulo em destaque e acento dourado. */
export const pageHeading = style({
  paddingInlineStart: rem(12),
  borderInlineStart: `${rem(3)} solid ${vars.colors.oabRed[6]}`
});

export const itemTopBorder = style({
  [vars.lightSelector]: { borderTop: `1px solid ${vars.colors.gray[2]}` },
  [vars.darkSelector]: { borderTop: `1px solid ${vars.colors.dark[4]}` }
});

export const navigationDrawer = style({
  padding: 0
});
