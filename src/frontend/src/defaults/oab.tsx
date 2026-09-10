/**
 * Identidade institucional do Sistema de Estoque da OAB-MA.
 *
 * Este arquivo concentra tudo que é específico da Seccional: nomes exibidos,
 * paleta e rótulos de navegação. Manter isso em um único lugar facilita
 * acompanhar atualizações futuras do InvenTree.
 */
import type { MantineColorsTuple } from '@mantine/core';

/** Nome completo do sistema (usado em títulos e no login). */
export const OAB_SYSTEM_NAME = 'Sistema de Estoque — OAB Maranhão';

/** Nome curto (usado na barra lateral e no título da aba). */
export const OAB_SYSTEM_SHORT_NAME = 'Estoque OAB-MA';

/** Nome da instituição. */
export const OAB_ORGANIZATION = 'OAB Maranhão';

/** Subtítulo da tela de login. */
export const OAB_LOGIN_SUBTITLE = 'Sistema de Controle de Estoque';

/**
 * Paleta institucional da OAB.
 *
 * Valores retirados do Manual de Identidade Visual. A identidade é composta
 * por **azul, vermelho e preto** — não há dourado nem qualquer outra cor de
 * marca.
 *
 * Cores sólidas:  Azul Pantone 301 C · Vermelho Pantone 200 C · Preto
 * Gradiente azul:    escuro R.0 G.53 B.82   · claro R.101 G.193 B.227
 * Gradiente vermelho: escuro R.145 G.13 B.17 · claro Pantone 485 C (R.215 G.25 B.32)
 */

/** Azul institucional — o índice 6 é o Pantone 301 C, o 9 é o escuro do gradiente. */
export const oabBlue: MantineColorsTuple = [
  '#e8f1f8',
  '#cbdeee',
  '#a0c1de',
  '#72a2cd',
  '#4d88bf',
  '#2a6ea6',
  '#004b87',
  '#004375',
  '#003c63',
  '#003552'
];

/** Vermelho institucional — o índice 6 é o Pantone 200 C, o 5 é o Pantone 485 C. */
export const oabRed: MantineColorsTuple = [
  '#fdeaee',
  '#f8ccd4',
  '#eda0ac',
  '#e27385',
  '#d94f64',
  '#d71920',
  '#ba0c2f',
  '#a30a29',
  '#910d11',
  '#7a0a0e'
];

/** Azul claro do gradiente (R.101 G.193 B.227), para realces pontuais. */
export const OAB_BLUE_LIGHT = '#65c1e3';

/** Fonte oficial da identidade visual. */
export const OAB_FONT_FAMILY =
  "'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/** Cor primária padrão da interface. */
export const OAB_PRIMARY_COLOR = 'oabBlue';

/**
 * Cor das entradas de estoque — azul da marca.
 *
 * A identidade da OAB não tem verde. Entrada e saída se distinguem pelo par
 * azul/vermelho, que é a própria dupla institucional.
 */
export const OAB_COLOR_ENTRADA = 'oabBlue';

/** Cor das saídas de estoque — vermelho da marca. */
export const OAB_COLOR_SAIDA = 'oabRed';

/**
 * Módulos industriais / comerciais do InvenTree (fabricação, ordens de compra,
 * vendas, devoluções, BOM).
 *
 * O backend permanece intacto - estes módulos apenas não são exibidos nem
 * roteados na interface do almoxarifado. Alterar para `true` restaura o
 * comportamento original do InvenTree.
 */
export const OAB_ENABLE_INDUSTRIAL_MODULES: boolean = false;

/**
 * Imagens padrão do InvenTree.
 *
 * O servidor sempre preenche `customize.logo` e `customize.splash`: quando não
 * há personalização, ele devolve estes arquivos. Precisamos distingui-los de um
 * arquivo realmente enviado pelo administrador, para não exibir a marca da
 * plataforma no lugar da identidade da OAB-MA.
 */
const INVENTREE_DEFAULT_ASSETS = [
  'img/inventree.png',
  'img/inventree_splash.jpg'
];

export function isDefaultInvenTreeAsset(url?: string | null): boolean {
  if (!url) {
    return true;
  }

  return INVENTREE_DEFAULT_ASSETS.some((asset) => url.includes(asset));
}

/**
 * Painéis exibidos na ficha de um material.
 *
 * O almoxarifado da OAB-MA é de uso próprio: não há compras, vendas,
 * fabricação, estrutura de produto nem precificação. Os demais painéis do
 * InvenTree continuam existindo no código - apenas não são apresentados.
 */
export const OAB_PART_PANELS = [
  'details',
  'stock',
  'movements',
  'attachments',
  'notes'
];

/**
 * Enxugamento das telas de configuração.
 *
 * O InvenTree expõe dezenas de painéis de configuração voltados a indústria,
 * PLM e operação de plataforma. Para um almoxarifado de duas pessoas isso é
 * ruído: esconde as poucas opções que importam. Alterar para `false` devolve
 * todos os painéis originais.
 */
export const OAB_SIMPLIFY_SETTINGS: boolean = true;

/**
 * Painéis mantidos em "Configurações do sistema".
 *
 * Fora da lista ficam produção, compras, vendas, pedidos de transferência,
 * parâmetros e extensões - nenhum deles tem uso num almoxarifado próprio.
 */
export const OAB_SYSTEM_SETTINGS_PANELS = [
  'server',
  'authentication',
  'barcode',
  'display',
  'notifications',
  'pricing',
  'reporting',
  'parts',
  'stock'
];

/**
 * Painéis mantidos no "Centro de administração".
 *
 * Ficam os modelos de etiqueta e de relatório, a gestão de usuários, as
 * unidades de medida e a importação/exportação de dados. Saem os painéis de
 * diagnóstico da plataforma (tarefas, erros, câmbio, e-mail) e todo o bloco de
 * PLM (parâmetros, listas de seleção, tipos de local, estados personalizados).
 */
export const OAB_ADMIN_CENTER_PANELS = [
  'home',
  'user',
  'import',
  'export',
  'custom-units',
  'labels',
  'reports'
];

/**
 * Painéis mantidos em "Configurações de usuário".
 *
 * Sai apenas a configuração de extensões, que trata de integrações internas da
 * plataforma e não de preferências de quem opera o estoque.
 */
export const OAB_USER_SETTINGS_PANELS = [
  'account',
  'security',
  'display',
  'search',
  'notifications',
  'reporting'
];

/**
 * Atalhos mantidos em "Ações rápidas", no Centro de administração.
 *
 * Os atalhos de código de projeto e de estado personalizado abriam telas que
 * saíram da navegação; o de abrir chamado aponta para o repositório do
 * InvenTree, que não é canal de suporte da Seccional.
 */
export const OAB_ADMIN_QUICK_ACTIONS = ['group', 'user'];

/**
 * Mantém apenas os itens cujo `id` está na lista, preservando a ordem.
 */
export function oabFilterActions<T extends { id: string }>(
  items: T[],
  allowed: string[]
): T[] {
  if (!OAB_SIMPLIFY_SETTINGS) {
    return items;
  }

  return items.filter((item) => allowed.includes(item.id));
}

/**
 * Mantém apenas os painéis da lista, preservando a ordem original.
 */
export function oabFilterPanels<T extends { name: string }>(
  panels: T[],
  allowed: string[]
): T[] {
  if (!OAB_SIMPLIFY_SETTINGS) {
    return panels;
  }

  return panels.filter((panel) => allowed.includes(panel.name));
}

/**
 * Reduz os grupos aos painéis permitidos e descarta os que ficaram vazios.
 *
 * Um grupo sem painéis visíveis continua desenhando o próprio título e a linha
 * divisória, então não basta esconder os painéis: o grupo precisa sair da lista.
 */
export function oabFilterPanelGroups<T extends { panelIDs?: string[] }>(
  groups: T[],
  allowed: string[]
): T[] {
  if (!OAB_SIMPLIFY_SETTINGS) {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      panelIDs: group.panelIDs?.filter((id) => allowed.includes(id))
    }))
    .filter((group) => (group.panelIDs?.length ?? 0) > 0);
}
