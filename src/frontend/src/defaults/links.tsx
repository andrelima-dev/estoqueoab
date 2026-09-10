import { StylishText } from '@lib/components/StylishText';
import { UserRoles } from '@lib/enums/Roles';
import type { SettingsStateProps } from '@lib/types/Settings';
import type { UserStateProps } from '@lib/types/User';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { openContextModal } from '@mantine/modals';
import {
  IconArrowsExchange,
  IconBox,
  IconDashboard,
  IconPackages,
  IconReportAnalytics,
  IconSettings
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { MenuLinkItem } from '../components/items/MenuLinks';

type NavTab = {
  name: string;
  title: string;
  icon: ReactNode;
  visible?: boolean;
};

export function getNavTabs(user: UserStateProps): NavTab[] {
  const navTabs: NavTab[] = [
    {
      name: 'home',
      title: t`Início`,
      icon: <IconDashboard />
    },
    {
      name: 'materiais',
      title: t`Materiais`,
      icon: <IconBox />,
      visible: user.hasViewRole(UserRoles.part)
    },
    {
      name: 'estoque',
      title: t`Estoque`,
      icon: <IconPackages />,
      visible: user.hasViewRole(UserRoles.stock)
    },
    {
      name: 'movimentacoes',
      title: t`Movimentações`,
      icon: <IconArrowsExchange />,
      visible: user.hasViewRole(UserRoles.stock)
    },
    {
      name: 'relatorios',
      title: t`Relatórios`,
      icon: <IconReportAnalytics />,
      visible: user.hasViewRole(UserRoles.stock)
    },
    {
      name: 'administracao',
      title: t`Administração`,
      icon: <IconSettings />,
      visible: user.isStaff()
    }
  ];

  return navTabs.filter((tab) => {
    return tab.visible !== false;
  });
}

export const docLinks = {
  docs: 'https://docs.inventree.org/',
  app: 'https://docs.inventree.org/en/latest/app/',
  getting_started: 'https://docs.inventree.org/en/latest/start/',
  api: 'https://docs.inventree.org/en/latest/api/',
  developer: 'https://docs.inventree.org/en/latest/develop/contributing/',
  faq: 'https://docs.inventree.org/en/latest/faq/',
  github: 'https://github.com/inventree/inventree',
  bug: 'https://github.com/inventree/inventree/issues',
  releases: 'https://github.com/inventree/inventree/releases',
  errorcodes: 'https://docs.inventree.org/en/latest/sref/error-codes/'
};

export function serverInfo() {
  return openContextModal({
    modal: 'info',
    title: (
      <StylishText size='xl'>
        <Trans>System Information</Trans>
      </StylishText>
    ),
    size: 'xl',
    innerProps: {}
  });
}

export function aboutInvenTree() {
  return openContextModal({
    modal: 'about',
    title: (
      <StylishText size='xl'>
        <Trans>Sobre a plataforma</Trans>
      </StylishText>
    ),
    size: 'xl',
    innerProps: {}
  });
}

export function licenseInfo() {
  return openContextModal({
    modal: 'license',
    title: (
      <StylishText size='xl'>
        <Trans>License Information</Trans>
      </StylishText>
    ),
    size: 'xl',
    innerProps: {}
  });
}

/**
 * Links de documentação da plataforma base.
 *
 * Não são exibidos na navegação do almoxarifado; permanecem disponíveis para os
 * componentes de suporte técnico (ex.: painel "Primeiros passos").
 */
export function DocumentationLinks(): MenuLinkItem[] {
  return [
    {
      id: 'getting-started',
      title: t`Primeiros passos`,
      link: docLinks.getting_started,
      external: true,
      description: t`Introdução à plataforma`
    },
    {
      id: 'api',
      title: t`API`,
      link: docLinks.api,
      external: true,
      description: t`Documentação da API`
    },
    {
      id: 'faq',
      title: t`Perguntas frequentes`,
      link: docLinks.faq,
      external: true,
      description: t`Perguntas frequentes sobre a plataforma`
    }
  ];
}

export function AboutLinks(
  settings: SettingsStateProps,
  user: UserStateProps
): MenuLinkItem[] {
  const base_items: MenuLinkItem[] = [
    {
      id: 'instance',
      title: t`Informações do sistema`,
      description: t`Dados técnicos desta instalação`,
      icon: 'info',
      action: serverInfo
    },
    {
      id: 'licenses',
      title: t`Informações de licença`,
      description: t`Licenças do software utilizado por este sistema`,
      icon: 'license',
      action: licenseInfo
    }
  ];

  // A plataforma técnica é apresentada apenas a usuários administrativos:
  // o operador do almoxarifado não precisa lidar com esse contexto, mas as
  // informações de origem e licenciamento permanecem acessíveis.
  if (user.isStaff() || !settings.isSet('INVENTREE_RESTRICT_ABOUT')) {
    base_items.push({
      id: 'about',
      title: t`Sobre a plataforma`,
      description: t`Sobre o InvenTree, plataforma base deste sistema`,
      icon: 'info',
      action: aboutInvenTree
    });
  }

  return base_items;
}
