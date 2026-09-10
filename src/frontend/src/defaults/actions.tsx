import { ModelType, StylishText, UserRoles } from '@lib/index';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { openContextModal } from '@mantine/modals';
import type { SpotlightActionData } from '@mantine/spotlight';
import {
  IconBarcode,
  IconFileUpload,
  IconLink,
  IconPointer,
  IconReport,
  IconSettings,
  IconTags,
  IconUserBolt,
  IconUserCog,
  IconUsers
} from '@tabler/icons-react';
import { useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useLocalState } from '../states/LocalState';
import { useGlobalSettingsState } from '../states/SettingsStates';
import { useUserState } from '../states/UserState';
import { licenseInfo, serverInfo } from './links';

function openQrModal(navigate: NavigateFunction) {
  return openContextModal({
    modal: 'qr',
    innerProps: { navigate: navigate }
  });
}

function openHotkeys() {
  return openContextModal({
    modal: 'hotkey',
    title: (
      <StylishText size='xl'>
        <Trans>Hotkeys</Trans>
      </StylishText>
    ),
    size: 'xl',
    innerProps: {}
  });
}

export function getActions(navigate: NavigateFunction) {
  const setNavigationOpen = useLocalState(
    useShallow((state) => state.setNavigationOpen)
  );
  const globalSettings = useGlobalSettingsState();
  const user = useUserState();

  const actions: SpotlightActionData[] = useMemo(() => {
    const staff = user?.isStaff() ?? false;

    const _actions: SpotlightActionData[] = [
      {
        id: 'dashboard',
        label: t`Dashboard`,
        description: t`Ir para a tela inicial`,
        onClick: () => navigate('/'),
        leftSection: <IconLink size='1.2rem' />
      },
      {
        id: 'server-info',
        label: t`Informações do sistema`,
        description: t`Dados técnicos desta instalação`,
        onClick: () => serverInfo(),
        leftSection: <IconLink size='1.2rem' />
      },
      {
        id: 'license-info',
        label: t`Informações de licença`,
        description: t`Licenças do software utilizado por este sistema`,
        onClick: () => licenseInfo(),
        leftSection: <IconLink size='1.2rem' />
      },
      {
        id: 'navigation',
        label: t`Open Navigation`,
        description: t`Open the main navigation menu`,
        onClick: () => setNavigationOpen(true),
        leftSection: <IconPointer size='1.2rem' />
      },
      {
        id: 'user-settings',
        label: t`User Settings`,
        description: t`Go to your user settings`,
        onClick: () => navigate('/settings/user'),
        leftSection: <IconUserCog size='1.2rem' />
      },
      {
        id: 'hotkeys',
        label: t`Hotkeys`,
        description: t`View a list of available hotkeys`,
        onClick: () => openHotkeys(),
        leftSection: <IconSettings size='1.2rem' />
      }
    ];

    staff &&
      _actions.push({
        id: 'data-import',
        label: t`Import Data`,
        description: t`Import data from a file`,
        onClick: () => navigate('/settings/admin/import'),
        leftSection: <IconFileUpload size='1.2rem' />
      });

    // Fluxos do almoxarifado
    user?.hasViewRole(UserRoles.part) &&
      _actions.push({
        id: 'materials',
        label: t`Materiais`,
        description: t`Ir para o cadastro de materiais`,
        onClick: () => navigate('/materiais'),
        leftSection: <IconLink size='1.2rem' />
      });

    user?.hasViewRole(UserRoles.stock) &&
      _actions.push(
        {
          id: 'current-stock',
          label: t`Estoque Atual`,
          description: t`Consultar o saldo de materiais`,
          onClick: () => navigate('/estoque/atual'),
          leftSection: <IconLink size='1.2rem' />
        },
        {
          id: 'movement-history',
          label: t`Histórico de Movimentações`,
          description: t`Consultar todas as movimentações registradas`,
          onClick: () => navigate('/movimentacoes/historico'),
          leftSection: <IconLink size='1.2rem' />
        },
        {
          id: 'reports',
          label: t`Relatórios`,
          description: t`Gerar relatórios do almoxarifado`,
          onClick: () => navigate('/relatorios'),
          leftSection: <IconReport size='1.2rem' />
        }
      );

    user?.hasAddRole(UserRoles.stock) &&
      _actions.push(
        {
          id: 'stock-entry',
          label: t`Nova Entrada`,
          description: t`Registrar o recebimento de material`,
          onClick: () => navigate('/movimentacoes/entrada'),
          leftSection: <IconLink size='1.2rem' />
        },
        {
          id: 'stock-issue',
          label: t`Nova Saída`,
          description: t`Registrar a entrega de material a um setor`,
          onClick: () => navigate('/movimentacoes/saida'),
          leftSection: <IconLink size='1.2rem' />
        },
        {
          id: 'stock-transfer',
          label: t`Transferir Material`,
          description: t`Movimentar material entre locais de estoque`,
          onClick: () => navigate('/movimentacoes/transferencia'),
          leftSection: <IconLink size='1.2rem' />
        }
      );

    globalSettings.isSet('BARCODE_ENABLE') &&
      _actions.push({
        id: 'scan',
        label: t`Scan`,
        description: t`Scan a barcode or QR code`,
        onClick: () => openQrModal(navigate),
        leftSection: <IconBarcode size='1.2rem' />
      });

    staff &&
      _actions.push({
        id: 'system-settings',
        label: t`System Settings`,
        description: t`Go to System Settings`,
        onClick: () => navigate('/settings/system'),
        leftSection: <IconSettings size='1.2rem' />
      });

    staff &&
      _actions.push({
        id: 'admin-center',
        label: t`Admin Center`,
        description: t`Go to the Admin Center`,
        onClick: () => navigate('/settings/admin'),
        leftSection: <IconUserBolt size='1.2rem' />
      });

    staff &&
      user?.hasViewPermission(ModelType.user) &&
      _actions.push({
        id: 'users',
        label: t`Users`,
        description: t`Manage user accounts`,
        onClick: () => navigate('/settings/admin/user'),
        leftSection: <IconUsers size='1.2rem' />
      });

    staff &&
      user?.hasViewPermission(ModelType.reporttemplate) &&
      _actions.push({
        id: 'report-templates',
        label: t`Report Templates`,
        description: t`Manage report templates`,
        onClick: () => navigate('/settings/admin/reports'),
        leftSection: <IconReport size='1.2rem' />
      });

    staff &&
      user?.hasViewPermission(ModelType.labeltemplate) &&
      _actions.push({
        id: 'label-templates',
        label: t`Label Templates`,
        description: t`Manage label templates`,
        onClick: () => navigate('/settings/admin/labels'),
        leftSection: <IconTags size='1.2rem' />
      });

    return _actions;
  }, [navigate, setNavigationOpen, globalSettings, user]);

  return actions.sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));
}
