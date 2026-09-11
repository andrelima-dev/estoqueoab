import type { RowAction } from '@lib/components/RowActions';
import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { ModelType } from '@lib/enums/ModelType';
import { apiUrl } from '@lib/functions/Api';
import useTable from '@lib/hooks/UseTable';
import type { TableFilter } from '@lib/types/Filters';
import type { TableColumn } from '@lib/types/Tables';
import { t } from '@lingui/core/macro';
import { Badge, Button, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFileText } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { api } from '../../App';
import { MovementDetailModal } from '../../components/oab/MovementDetailModal';
import {
  useDeliveryNote,
  useMovementReport
} from '../../components/oab/MovementDocuments';
import { MovementPeriodFilter } from '../../components/oab/MovementPeriodFilter';
import { InvenTreeTable } from '../../components/tables/InvenTreeTable';
import { formatDate } from '../../defaults/formatters';
import { OAB_COLOR_ENTRADA, OAB_COLOR_SAIDA } from '../../defaults/oab';

/** Tipos de movimentação, conforme o backend (`oab.models.MovementType`). */
export const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  TRANSFER: 'TRANSFER',
  ADJUST: 'ADJUST'
} as const;

export function movementTypeLabel(value: string): string {
  switch (value) {
    case MOVEMENT_TYPES.IN:
      return t`Entrada`;
    case MOVEMENT_TYPES.OUT:
      return t`Saída`;
    case MOVEMENT_TYPES.TRANSFER:
      return t`Transferência`;
    case MOVEMENT_TYPES.ADJUST:
      return t`Ajuste`;
    default:
      return value;
  }
}

export function movementTypeColor(value: string): string {
  switch (value) {
    case MOVEMENT_TYPES.IN:
      return OAB_COLOR_ENTRADA;
    case MOVEMENT_TYPES.OUT:
      return OAB_COLOR_SAIDA;
    case MOVEMENT_TYPES.TRANSFER:
      return 'oabBlue';
    default:
      return 'gray';
  }
}

export function MovementTypeBadge({ value }: Readonly<{ value: string }>) {
  return (
    <Badge color={movementTypeColor(value)} variant='light' size='sm'>
      {movementTypeLabel(value)}
    </Badge>
  );
}

/**
 * Tabela do **Histórico de Movimentações**.
 *
 * Registros são somente leitura: correções são feitas por meio de uma nova
 * movimentação de ajuste, preservando a rastreabilidade.
 */
export function MovementTable({
  params,
  tableName = 'oab-movements',
  showPeriodFilter = false
}: Readonly<{
  params?: Record<string, any>;
  tableName?: string;
  /** Exibe os atalhos de período acima da tabela. */
  showPeriodFilter?: boolean;
}>) {
  const table = useTable(tableName);

  const [selected, setSelected] = useState<any>(null);
  const { emitir, emitindo, disponivel } = useDeliveryNote();

  // Os mesmos filtros que a tabela está aplicando, para o relatório sair
  // exatamente com o que está sendo exibido.
  const filtrosAtuais = useMemo(() => {
    const consulta: Record<string, any> = { ...(params ?? {}) };

    table.filterSet.activeFilters?.forEach((filtro: any) => {
      consulta[filtro.name] = filtro.value;
    });

    if (table.searchTerm) {
      consulta.search = table.searchTerm;
    }

    return consulta;
  }, [params, table.filterSet.activeFilters, table.searchTerm]);

  const relatorio = useMovementReport(filtrosAtuais);
  const [detailOpened, detailHandlers] = useDisclosure(false);

  // Opções do filtro por setor (lista curta, carregada de uma só vez)
  const sectors = useQuery({
    queryKey: ['oab-sector-options'],
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.oab_sector_list), {
        params: { active: true, ordering: 'name' }
      });
      return response.data?.results ?? response.data ?? [];
    }
  });

  const columns: TableColumn[] = useMemo(
    () => [
      {
        accessor: 'date',
        title: t`Data / Hora`,
        sortable: true,
        render: (record: any) => formatDate(record.date, { showTime: true })
      },
      {
        accessor: 'movement_type',
        title: t`Tipo`,
        sortable: true,
        render: (record: any) => (
          <MovementTypeBadge value={record.movement_type} />
        )
      },
      {
        accessor: 'part_name',
        title: t`Material`,
        sortable: true,
        render: (record: any) => (
          <div>
            <Text size='sm'>
              {record.part_detail?.name ?? record.part_name}
            </Text>
            {record.part_detail?.IPN && (
              <Text size='xs' c='dimmed'>
                {record.part_detail.IPN}
              </Text>
            )}
          </div>
        )
      },
      {
        accessor: 'quantity',
        title: t`Quantidade`,
        sortable: true,
        textAlign: 'right',
        render: (record: any) => Number(record.quantity)
      },
      {
        accessor: 'location_from',
        title: t`Origem`,
        sortable: false,
        render: (record: any) =>
          record.location_from_detail?.name ?? record.source ?? '-'
      },
      {
        accessor: 'location_to',
        title: t`Destino`,
        sortable: false,
        render: (record: any) =>
          record.location_to_detail?.name ?? record.sector_detail?.name ?? '-'
      },
      {
        // Quem recebeu / retirou fisicamente o material
        accessor: 'handler',
        title: t`Responsável`,
        sortable: false,
        render: (record: any) => record.handler || '-'
      },
      {
        // Usuário do sistema que registrou a operação - nunca se confunde
        // com o responsável físico acima
        accessor: 'user',
        title: t`Registrado por`,
        sortable: false,
        render: (record: any) => record.user_detail?.username ?? '-'
      },
      {
        accessor: 'document',
        title: t`Documento`,
        sortable: false,
        defaultVisible: false
      }
    ],
    []
  );

  const filters: TableFilter[] = useMemo(
    () => [
      {
        name: 'movement_type',
        label: t`Tipo de movimentação`,
        description: t`Filtrar por tipo de movimentação`,
        type: 'choice',
        choices: [
          { value: MOVEMENT_TYPES.IN, label: t`Entrada` },
          { value: MOVEMENT_TYPES.OUT, label: t`Saída` },
          { value: MOVEMENT_TYPES.TRANSFER, label: t`Transferência` },
          { value: MOVEMENT_TYPES.ADJUST, label: t`Ajuste` }
        ]
      },
      {
        name: 'part',
        label: t`Material`,
        description: t`Filtrar por material`,
        apiUrl: apiUrl(ApiEndpoints.part_list),
        model: ModelType.part,
        modelRenderer: (instance: any) => instance.name
      },
      {
        name: 'category',
        label: t`Categoria`,
        description: t`Filtrar por categoria de material`,
        apiUrl: apiUrl(ApiEndpoints.category_list),
        model: ModelType.partcategory,
        modelRenderer: (instance: any) => instance.name
      },
      {
        name: 'sector',
        label: t`Setor`,
        description: t`Filtrar por setor de destino`,
        type: 'choice',
        choices: (sectors.data ?? []).map((sector: any) => ({
          value: String(sector.pk),
          label: sector.code ? `${sector.code} - ${sector.name}` : sector.name
        }))
      },
      {
        name: 'location',
        label: t`Local`,
        description: t`Filtrar por local de origem ou destino`,
        apiUrl: apiUrl(ApiEndpoints.stock_location_list),
        model: ModelType.stocklocation,
        modelRenderer: (instance: any) => instance.name
      },
      {
        name: 'user',
        label: t`Usuário`,
        description: t`Filtrar pelo usuário que registrou a operação`,
        apiUrl: apiUrl(ApiEndpoints.user_list),
        apiFilter: { is_active: true },
        model: ModelType.user,
        modelRenderer: (instance: any) => instance.username
      },
      {
        name: 'min_date',
        label: t`Data inicial`,
        description: t`Movimentações a partir desta data`,
        type: 'date'
      },
      {
        name: 'max_date',
        label: t`Data final`,
        description: t`Movimentações até esta data`,
        type: 'date'
      }
    ],
    [sectors.data]
  );

  const onRowClick = useCallback(
    (record: any) => {
      setSelected(record);
      detailHandlers.open();
    },
    [detailHandlers]
  );

  return (
    <>
      <MovementDetailModal
        opened={detailOpened}
        onClose={detailHandlers.close}
        movement={selected}
      />
      {showPeriodFilter && (
        <Stack gap='xs' mb='sm'>
          <MovementPeriodFilter filterSet={table.filterSet} />
        </Stack>
      )}
      <InvenTreeTable
        url={apiUrl(ApiEndpoints.oab_movement_list)}
        tableState={table}
        columns={columns}
        props={{
          params: params,
          enableDownload: true,
          enableSelection: false,
          enableSearch: true,
          tableFilters: filters,
          tableActions: relatorio.disponivel
            ? [
                <Button
                  key='oab-relatorio-pdf'
                  variant='light'
                  size='compact-sm'
                  leftSection={<IconFileText size={16} />}
                  loading={relatorio.gerando}
                  onClick={relatorio.gerarRelatorio}
                >
                  {t`Relatório em PDF`}
                </Button>
              ]
            : [],
          rowActions: (record: any): RowAction[] =>
            // Só a saída gera termo: é a operação em que alguém retira o
            // material e assume a responsabilidade por ele.
            disponivel && record.movement_type === MOVEMENT_TYPES.OUT
              ? [
                  {
                    title: t`Emitir termo de entrega`,
                    tooltip: t`Gerar o documento em PDF para assinatura`,
                    icon: <IconFileText />,
                    disabled: emitindo,
                    onClick: () => emitir(record.pk)
                  }
                ]
              : [],
          onRowClick: onRowClick,
          noRecordsText: t`Nenhuma movimentação encontrada`
        }}
      />
    </>
  );
}
