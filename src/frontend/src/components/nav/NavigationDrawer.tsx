import { ModelType } from '@lib/enums/ModelType';
import { UserRoles } from '@lib/enums/Roles';
import { t } from '@lingui/core/macro';
import {
  Container,
  Divider,
  Drawer,
  Flex,
  Group,
  Space,
  Text
} from '@mantine/core';
import { useMemo } from 'react';
import { AboutLinks } from '../../defaults/links';
import * as classes from '../../main.css';
import { useGlobalSettingsState } from '../../states/SettingsStates';
import { useUserState } from '../../states/UserState';
import { type MenuLinkItem, MenuLinks } from '../items/MenuLinks';
import { OabBrand } from '../items/OabLogo';

export function NavigationDrawer({
  opened,
  close
}: Readonly<{
  opened: boolean;
  close: () => void;
}>) {
  return (
    <Drawer
      opened={opened}
      onClose={close}
      size='lg'
      withCloseButton={false}
      classNames={{
        body: classes.navigationDrawer
      }}
    >
      <DrawerContent closeFunc={close} />
    </Drawer>
  );
}

/**
 * Barra lateral do Sistema de Estoque da OAB-MA.
 *
 * A estrutura é organizada pelos fluxos do almoxarifado, e não pelos módulos do
 * InvenTree. A seção "Administração" só aparece para usuários autorizados.
 */
function DrawerContent({ closeFunc }: Readonly<{ closeFunc?: () => void }>) {
  const user = useUserState();
  const globalSettings = useGlobalSettingsState();

  const menuStart: MenuLinkItem[] = useMemo(
    () => [
      {
        id: 'home',
        title: t`Dashboard`,
        link: '/',
        icon: 'dashboard'
      }
    ],
    []
  );

  const menuStock: MenuLinkItem[] = useMemo(
    () => [
      {
        id: 'materials',
        title: t`Materiais`,
        link: '/materiais',
        icon: 'part',
        hidden: !user.hasViewPermission(ModelType.part)
      },
      {
        id: 'categories',
        title: t`Categorias`,
        link: '/part/category/index/',
        icon: 'category',
        hidden: !user.hasViewPermission(ModelType.partcategory)
      },
      {
        id: 'locations',
        title: t`Locais de Estoque`,
        link: '/stock/location/index/',
        icon: 'location',
        hidden: !user.hasViewPermission(ModelType.stocklocation)
      },
      {
        id: 'current-stock',
        title: t`Estoque Atual`,
        link: '/estoque/atual',
        icon: 'stock',
        hidden: !user.hasViewPermission(ModelType.stockitem)
      }
    ],
    [user]
  );

  const menuMovements: MenuLinkItem[] = useMemo(() => {
    const canMove = user.hasAddRole(UserRoles.stock);

    return [
      {
        id: 'entry',
        title: t`Nova Entrada`,
        link: '/movimentacoes/entrada',
        icon: 'add',
        hidden: !canMove
      },
      {
        id: 'issue',
        title: t`Nova Saída`,
        link: '/movimentacoes/saida',
        icon: 'remove',
        hidden: !canMove
      },
      {
        id: 'transfer',
        title: t`Transferência`,
        link: '/movimentacoes/transferencia',
        icon: 'transfer',
        hidden: !canMove
      },
      {
        id: 'adjust',
        title: t`Ajuste de Saldo`,
        link: '/movimentacoes/ajuste',
        icon: 'stocktake',
        hidden: !user.isStaff()
      },
      {
        id: 'history',
        title: t`Histórico`,
        link: '/movimentacoes/historico',
        icon: 'history',
        hidden: !user.hasViewRole(UserRoles.stock)
      }
    ];
  }, [user]);

  const menuReports: MenuLinkItem[] = useMemo(
    () => [
      {
        id: 'reports',
        title: t`Relatórios`,
        link: '/relatorios',
        icon: 'reports',
        hidden: !user.hasViewRole(UserRoles.stock)
      }
    ],
    [user]
  );

  const menuAdmin: MenuLinkItem[] = useMemo(
    () => [
      {
        id: 'users',
        title: t`Usuários`,
        link: '/core/index/users',
        icon: 'user'
      },
      {
        id: 'groups',
        title: t`Grupos e Permissões`,
        link: '/core/index/groups',
        icon: 'group'
      },
      {
        id: 'sectors',
        title: t`Setores`,
        link: '/administracao/setores',
        icon: 'sitemap'
      },
      {
        id: 'system-settings',
        title: t`Configurações`,
        link: '/settings/system',
        icon: 'system'
      },
      {
        id: 'admin-center',
        title: t`Central de Administração`,
        link: '/settings/admin',
        icon: 'admin'
      }
    ],
    []
  );

  const menuAccount: MenuLinkItem[] = useMemo(
    () => [
      {
        id: 'notifications',
        title: t`Notificações`,
        link: '/notifications',
        icon: 'notification'
      },
      {
        id: 'user-settings',
        title: t`Minhas Preferências`,
        link: '/settings/user',
        icon: 'user'
      },
      {
        id: 'barcode',
        title: t`Ler Código de Barras`,
        link: '/scan',
        icon: 'barcode',
        hidden: !globalSettings.isSet('BARCODE_ENABLE')
      },
      {
        id: 'logout',
        title: t`Sair`,
        link: '/logout',
        icon: 'reject'
      }
    ],
    [globalSettings]
  );

  const menuItemsAbout: MenuLinkItem[] = useMemo(
    () => AboutLinks(globalSettings, user),
    [globalSettings, user]
  );

  return (
    <Flex direction='column' mih='100vh' p={16}>
      <OabBrand />
      <Space h='xs' />
      <Container className={classes.layoutContent} p={0}>
        <MenuLinks
          title={t`Início`}
          links={menuStart}
          beforeClick={closeFunc}
        />
        <MenuLinks
          title={t`Estoque`}
          links={menuStock}
          beforeClick={closeFunc}
        />
        <MenuLinks
          title={t`Movimentações`}
          links={menuMovements}
          beforeClick={closeFunc}
        />
        <MenuLinks
          title={t`Relatórios`}
          links={menuReports}
          beforeClick={closeFunc}
        />
        {user.isStaff() && (
          <MenuLinks
            title={t`Administração`}
            links={menuAdmin}
            beforeClick={closeFunc}
          />
        )}
        <MenuLinks
          title={t`Minha Conta`}
          links={menuAccount}
          beforeClick={closeFunc}
        />
      </Container>
      <div>
        <Space h='md' />
        <Divider />
        <Group justify='space-between' py='xs'>
          <Text size='xs' c='dimmed'>
            {t`Usuário conectado`}
          </Text>
          <Text size='xs' fw={500}>
            {user.username()}
          </Text>
        </Group>
        <MenuLinks
          title={t`Sobre`}
          links={menuItemsAbout}
          beforeClick={closeFunc}
        />
      </div>
    </Flex>
  );
}
