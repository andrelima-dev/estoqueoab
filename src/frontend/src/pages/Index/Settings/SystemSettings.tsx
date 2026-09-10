import { PluginPanelKey } from '@lib/enums/ModelType';
import type { PanelType } from '@lib/types/Panel';
import { t } from '@lingui/core/macro';
import { Skeleton, Stack } from '@mantine/core';
import {
  IconBellCog,
  IconBox,
  IconBuildingFactory2,
  IconCurrencyDollar,
  IconDeviceDesktop,
  IconFileAnalytics,
  IconFingerprint,
  IconList,
  IconPackages,
  IconPlugConnected,
  IconQrcode,
  IconServerCog,
  IconShoppingCart,
  IconTransfer,
  IconTruckDelivery
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import PermissionDenied from '../../../components/errors/PermissionDenied';
import PageTitle from '../../../components/nav/PageTitle';
import { SettingsHeader } from '../../../components/nav/SettingsHeader';
import { PanelGroup } from '../../../components/panels/PanelGroup';
import { GlobalSettingList } from '../../../components/settings/SettingList';
import {
  OAB_SYSTEM_SETTINGS_PANELS,
  oabFilterPanels
} from '../../../defaults/oab';
import { useServerApiState } from '../../../states/ServerApiState';
import { useUserState } from '../../../states/UserState';
import PluginSettingsGroup from './PluginSettingsGroup';

/**
 * System settings page
 */
export default function SystemSettings() {
  const systemSettingsPanels: PanelType[] = useMemo(() => {
    return oabFilterPanels(
      [
        {
          name: 'server',
          label: t`Server`,
          icon: <IconServerCog />,
          content: (
            <>
              {/*
                Fora da lista ficam as chaves internas da plataforma: ID da
                instância, verificação de novas versões, faixas de privilégio
                (desligadas por `oab_setup`) e as rotinas de descarte de
                registros antigos.
              */}
              <GlobalSettingList
                heading={t`Identificação`}
                keys={[
                  'INVENTREE_BASE_URL',
                  'INVENTREE_COMPANY_NAME',
                  'INVENTREE_INSTANCE',
                  'INVENTREE_INSTANCE_TITLE',
                  'INVENTREE_UPLOAD_MAX_SIZE'
                ]}
              />
              <GlobalSettingList
                heading={t`Cópia de segurança`}
                keys={['INVENTREE_BACKUP_ENABLE', 'INVENTREE_BACKUP_DAYS']}
              />
            </>
          )
        },
        {
          name: 'authentication',
          label: t`Authentication`,
          icon: <IconFingerprint />,
          content: (
            <Stack gap='xs'>
              <GlobalSettingList
                keys={[
                  'LOGIN_ENABLE_PWD_FORGOT',
                  'LOGIN_MAIL_REQUIRED',
                  'LOGIN_ENFORCE_MFA',
                  'LOGIN_ENABLE_REG',
                  'LOGIN_SIGNUP_MAIL_TWICE',
                  'LOGIN_SIGNUP_PWD_TWICE'
                ]}
              />
              <GlobalSettingList
                heading={t`Single Sign-On (SSO) Settings`}
                keys={[
                  'LOGIN_ENABLE_SSO',
                  'LOGIN_ENABLE_SSO_REG',
                  'LOGIN_SIGNUP_SSO_AUTO',
                  'LOGIN_ENABLE_SSO_GROUP_SYNC',
                  'SSO_GROUP_MAP',
                  'SSO_GROUP_KEY',
                  'SSO_REMOVE_GROUPS',
                  'SIGNUP_GROUP',
                  'LOGIN_SIGNUP_MAIL_RESTRICTION'
                ]}
              />
            </Stack>
          )
        },
        {
          name: 'barcode',
          label: t`Barcodes`,
          icon: <IconQrcode />,
          content: (
            <GlobalSettingList
              keys={[
                'BARCODE_ENABLE',
                'BARCODE_INPUT_DELAY',
                'BARCODE_WEBCAM_SUPPORT',
                'BARCODE_SHOW_TEXT',
                'BARCODE_GENERATION_PLUGIN',
                'BARCODE_STORE_RESULTS',
                'BARCODE_RESULTS_MAX_NUM'
              ]}
            />
          )
        },
        {
          name: 'display',
          label: t`Display`,
          icon: <IconDeviceDesktop />,
          content: (
            <GlobalSettingList
              keys={[
                'DISPLAY_FULL_NAMES',
                'DISPLAY_PROFILE_INFO',
                'WEEK_STARTS_ON',
                'CALENDAR_HORIZON_MONTHS'
              ]}
            />
          )
        },
        {
          name: 'notifications',
          label: t`Notifications`,
          icon: <IconBellCog />,
          content: (
            <PluginSettingsGroup
              mixin='notification'
              global={true}
              message={t`The settings below are specific to each available notification method`}
            />
          )
        },
        {
          name: 'pricing',
          label: t`Pricing`,
          icon: <IconCurrencyDollar />,
          content: (
            <>
              <GlobalSettingList
                keys={[
                  'INVENTREE_DEFAULT_CURRENCY',
                  'CURRENCY_CODES',
                  'PART_INTERNAL_PRICE',
                  'PART_BOM_USE_INTERNAL_PRICE',
                  'PRICING_DECIMAL_PLACES_MIN',
                  'PRICING_DECIMAL_PLACES',
                  'PRICING_AUTO_UPDATE',
                  'PRICING_UPDATE_DAYS'
                ]}
              />
              <br />
              <GlobalSettingList
                keys={[
                  'PRICING_USE_SUPPLIER_PRICING',
                  'PRICING_PURCHASE_HISTORY_OVERRIDES_SUPPLIER',
                  'PRICING_USE_STOCK_PRICING',
                  'PRICING_STOCK_ITEM_AGE_DAYS',
                  'PRICING_USE_VARIANT_PRICING',
                  'PRICING_ACTIVE_VARIANTS'
                ]}
              />
              <br />
              <GlobalSettingList
                keys={['CURRENCY_UPDATE_PLUGIN', 'CURRENCY_UPDATE_INTERVAL']}
              />
            </>
          )
        },
        {
          name: 'reporting',
          label: t`Reporting`,
          icon: <IconFileAnalytics />,
          content: (
            <GlobalSettingList
              keys={[
                'REPORT_ENABLE',
                'REPORT_DEFAULT_PAGE_SIZE',
                'REPORT_DEBUG_MODE',
                'REPORT_FETCH_URLS',
                'REPORT_LOG_ERRORS',
                'LABEL_ENABLE',
                'LABEL_DPI'
              ]}
            />
          )
        },
        {
          name: 'parameters',
          label: t`Parameters`,
          icon: <IconList />,
          content: <GlobalSettingList keys={['PARAMETER_ENFORCE_UNITS']} />
        },
        {
          name: 'parts',
          label: t`Materiais`,
          icon: <IconBox />,
          content: (
            // Fora da lista ficam as opções de BOM, montagem, revisão, compra e
            // venda: o material do almoxarifado não é fabricado nem revendido.
            <Stack gap='xs'>
              <GlobalSettingList
                heading={t`Código interno`}
                keys={[
                  'PART_IPN_REGEX',
                  'PART_ALLOW_DUPLICATE_IPN',
                  'PART_ALLOW_EDIT_IPN'
                ]}
              />
              <GlobalSettingList
                heading={t`Cadastro de material`}
                keys={['PART_CREATE_INITIAL']}
              />
            </Stack>
          )
        },
        {
          name: 'stock',
          label: t`Estoque`,
          icon: <IconPackages />,
          content: (
            // As opções de descarte de histórico (STOCK_TRACKING_DELETE_*) ficam
            // de fora de propósito: o histórico de movimentação é a prova de
            // quem entregou o quê, e não deve ser apagável pela interface.
            <Stack gap='xs'>
              <GlobalSettingList
                keys={[
                  'STOCK_DELETE_DEPLETED_DEFAULT',
                  'STOCK_ALLOW_OUT_OF_STOCK_TRANSFER',
                  'STOCK_MERGE_ON_TRANSFER'
                ]}
              />
              <GlobalSettingList
                heading={t`Validade`}
                keys={['STOCK_ENABLE_EXPIRY', 'STOCK_STALE_DAYS']}
              />
            </Stack>
          )
        },
        {
          name: 'manufacturing',
          label: t`Manufacturing`,
          icon: <IconBuildingFactory2 />,
          content: (
            <>
              <GlobalSettingList
                heading={t`Build Orders`}
                keys={[
                  'BUILDORDER_REFERENCE_PATTERN',
                  'BUILDORDER_REQUIRE_RESPONSIBLE',
                  'BUILDORDER_REQUIRE_ACTIVE_PART',
                  'BUILDORDER_REQUIRE_LOCKED_PART',
                  'BUILDORDER_REQUIRE_VALID_BOM',
                  'BUILDORDER_REQUIRE_CLOSED_CHILDS',
                  'PREVENT_BUILD_COMPLETION_HAVING_INCOMPLETED_TESTS'
                ]}
              />
              <GlobalSettingList
                heading={t`External Build Orders`}
                keys={[
                  'BUILDORDER_EXTERNAL_BUILDS',
                  'BUILDORDER_EXTERNAL_REQUIRED'
                ]}
              />
            </>
          )
        },
        {
          name: 'purchasing',
          label: t`Purchasing`,
          icon: <IconShoppingCart />,
          content: (
            <GlobalSettingList
              heading={t`Purchase Orders`}
              keys={[
                'PURCHASEORDER_REFERENCE_PATTERN',
                'PURCHASEORDER_REQUIRE_RESPONSIBLE',
                'PURCHASEORDER_CONVERT_CURRENCY',
                'PURCHASEORDER_EDIT_COMPLETED_ORDERS',
                'PURCHASEORDER_AUTO_COMPLETE'
              ]}
            />
          )
        },
        {
          name: 'sales',
          label: t`Sales`,
          icon: <IconTruckDelivery />,
          content: (
            <Stack gap='xs'>
              <GlobalSettingList
                heading={t`Sales Orders`}
                keys={[
                  'SALESORDER_REFERENCE_PATTERN',
                  'SALESORDER_REQUIRE_RESPONSIBLE',
                  'SALESORDER_DEFAULT_SHIPMENT',
                  'SALESORDER_EDIT_COMPLETED_ORDERS',
                  'SALESORDER_SHIP_COMPLETE',
                  'SALESORDER_SHIPMENT_REQUIRES_CHECK',
                  'SALESORDER_BLOCK_INCOMPLETE_ITEM_TESTS'
                ]}
              />
              <GlobalSettingList
                heading={t`Return Orders`}
                keys={[
                  'RETURNORDER_ENABLED',
                  'RETURNORDER_REFERENCE_PATTERN',
                  'RETURNORDER_REQUIRE_RESPONSIBLE',
                  'RETURNORDER_EDIT_COMPLETED_ORDERS'
                ]}
              />
            </Stack>
          )
        },
        {
          name: 'transferorders',
          label: t`Transfer Orders`,
          icon: <IconTransfer />,
          content: (
            <GlobalSettingList
              keys={[
                'TRANSFERORDER_ENABLED',
                'TRANSFERORDER_REFERENCE_PATTERN',
                'TRANSFERORDER_REQUIRE_RESPONSIBLE',
                'TRANSFERORDER_EDIT_COMPLETED_ORDERS'
              ]}
            />
          )
        },
        {
          name: 'plugins',
          label: t`Plugins`,
          icon: <IconPlugConnected />,
          content: (
            <PluginSettingsGroup global={true} includeBaseSettings={true} />
          )
        }
      ],
      OAB_SYSTEM_SETTINGS_PANELS
    );
  }, []);

  const user = useUserState();

  const [server] = useServerApiState(useShallow((state) => [state.server]));

  if (!user.isLoggedIn()) {
    return <Skeleton />;
  }

  return (
    <>
      <PageTitle title={t`System Settings`} />
      {user.isStaff() ? (
        <Stack gap='xs'>
          <SettingsHeader
            label='system'
            title={t`System Settings`}
            subtitle={server.instance || ''}
          />
          <PanelGroup
            pageKey='system-settings'
            panels={systemSettingsPanels}
            pluginPanelWithoutId
            pluginPanelKey={PluginPanelKey.systemsettings}
          />
        </Stack>
      ) : (
        <PermissionDenied />
      )}
    </>
  );
}
