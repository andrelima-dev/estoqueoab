import { t } from '@lingui/core/macro';
import { Alert, Stack, Tabs, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { MaterialTable } from '../../tables/oab/MaterialTable';
import { MOVEMENT_TYPES, MovementTable } from '../../tables/oab/MovementTable';

/**
 * **Relatórios** operacionais do almoxarifado.
 *
 * Cada aba é uma consulta filtrável, com exportação (CSV / Excel) fornecida
 * pelo mecanismo de exportação nativo do sistema.
 */
export default function ReportsPage() {
  const navigate = useNavigate();
  const { report } = useParams();

  const active = report ?? 'estoque';

  return (
    <>
      <PageTitle title={t`Relatórios`} />
      <PageDetail
        title={t`Relatórios`}
        subtitle={t`Consultas operacionais com filtro por período e exportação`}
      />

      <Stack gap='md' mt='md'>
        <Alert color='blue' icon={<IconInfoCircle />} title={t`Como exportar`}>
          <Text size='sm'>
            {t`Aplique os filtros desejados e utilize o botão de download acima da tabela para exportar o resultado em CSV ou Excel.`}
          </Text>
        </Alert>

        <Tabs
          value={active}
          onChange={(value) => navigate(`/relatorios/${value ?? 'estoque'}`)}
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab value='estoque'>{t`Estoque Atual`}</Tabs.Tab>
            <Tabs.Tab value='entradas'>{t`Entradas`}</Tabs.Tab>
            <Tabs.Tab value='saidas'>{t`Saídas`}</Tabs.Tab>
            <Tabs.Tab value='movimentacoes'>{t`Movimentações`}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='estoque' pt='md'>
            <MaterialTable />
          </Tabs.Panel>

          <Tabs.Panel value='entradas' pt='md'>
            <MovementTable
              tableName='oab-report-entries'
              params={{ movement_type: MOVEMENT_TYPES.IN }}
            />
          </Tabs.Panel>

          <Tabs.Panel value='saidas' pt='md'>
            <MovementTable
              tableName='oab-report-issues'
              params={{ movement_type: MOVEMENT_TYPES.OUT }}
            />
          </Tabs.Panel>

          <Tabs.Panel value='movimentacoes' pt='md'>
            <MovementTable tableName='oab-report-movements' />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </>
  );
}
