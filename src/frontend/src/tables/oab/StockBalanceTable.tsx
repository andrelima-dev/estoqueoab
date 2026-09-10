import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { ModelType } from '@lib/enums/ModelType';
import { UserRoles } from '@lib/enums/Roles';
import { apiUrl } from '@lib/functions/Api';
import useTable from '@lib/hooks/UseTable';
import type { TableFilter } from '@lib/types/Filters';
import type { TableColumn } from '@lib/types/Tables';
import { t } from '@lingui/core/macro';
import { Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useMemo, useState } from 'react';

import { MovementButtons } from '../../components/oab/MovementButtons';
import {
  QuickMovementModal,
  type QuickMovementOperation
} from '../../components/oab/QuickMovementModal';
import { InvenTreeTable } from '../../components/tables/InvenTreeTable';
import { useUserState } from '../../states/UserState';

/**
 * **Estoque Atual** - saldo de cada material em cada local.
 *
 * Substitui a tabela de itens de estoque do InvenTree, que expunha conceitos
 * sem uso no almoxarifado (lote, número de série, status, inventário, preço).
 * Aqui ficam apenas as colunas que o operador precisa, e as duas ações que
 * ele realmente executa.
 */
export function StockBalanceTable() {
  const user = useUserState();
  const table = useTable('oab-stock-balance');

  const canMove = user.hasAddRole(UserRoles.stock);

  const [movementMaterial, setMovementMaterial] = useState<any>(null);
  const [movementOperation, setMovementOperation] =
    useState<QuickMovementOperation>('in');
  const [movementOpened, movementHandlers] = useDisclosure(false);

  const openMovement = useCallback(
    (record: any, operation: QuickMovementOperation) => {
      // O material herda o local desta linha, para que o modal já venha pronto
      setMovementMaterial({
        ...record.part_detail,
        default_location:
          record.location ?? record.part_detail?.default_location
      });
      setMovementOperation(operation);
      movementHandlers.open();
    },
    [movementHandlers]
  );

  const columns: TableColumn[] = useMemo(
    () => [
      {
        accessor: 'part_detail.IPN',
        title: t`Código`,
        ordering: 'part',
        sortable: true
      },
      {
        accessor: 'part_detail.name',
        title: t`Material`,
        ordering: 'part',
        sortable: true,
        render: (record: any) => (
          <div>
            <Text size='sm'>{record.part_detail?.name}</Text>
            {record.part_detail?.description && (
              <Text size='xs' c='dimmed'>
                {record.part_detail.description}
              </Text>
            )}
          </div>
        )
      },
      {
        accessor: 'location_detail.name',
        title: t`Local`,
        ordering: 'location',
        sortable: true,
        render: (record: any) => record.location_detail?.name ?? t`Sem local`
      },
      {
        accessor: 'quantity',
        title: t`Saldo`,
        sortable: true,
        textAlign: 'right',
        render: (record: any) => (
          <Text size='sm' fw={500}>
            {Number(record.quantity)}
          </Text>
        )
      },
      {
        accessor: 'part_detail.units',
        title: t`Unidade`,
        sortable: false,
        render: (record: any) => record.part_detail?.units ?? '-'
      },
      {
        accessor: 'movimentar',
        title: t`Movimentar`,
        sortable: false,
        switchable: false,
        noContext: true,
        textAlign: 'center',
        width: 210,
        render: (record: any) =>
          canMove ? (
            <MovementButtons
              material={record.part_detail}
              stock={Number(record.quantity ?? 0)}
              onOpen={(operation) => openMovement(record, operation)}
            />
          ) : null
      }
    ],
    [canMove, openMovement]
  );

  const filters: TableFilter[] = useMemo(
    () => [
      {
        name: 'location',
        label: t`Local`,
        description: t`Filtrar por local de estoque`,
        apiUrl: apiUrl(ApiEndpoints.stock_location_list),
        model: ModelType.stocklocation,
        modelRenderer: (instance: any) => instance.name
      },
      {
        name: 'category',
        label: t`Categoria`,
        description: t`Filtrar por categoria de material`,
        apiUrl: apiUrl(ApiEndpoints.category_list),
        model: ModelType.partcategory,
        modelRenderer: (instance: any) => instance.name
      }
    ],
    []
  );

  return (
    <>
      <QuickMovementModal
        opened={movementOpened}
        onClose={movementHandlers.close}
        operation={movementOperation}
        material={movementMaterial}
        onSuccess={table.refreshTable}
      />
      <InvenTreeTable
        url={apiUrl(ApiEndpoints.stock_item_list)}
        tableState={table}
        columns={columns}
        props={{
          enableDownload: true,
          enableSelection: false,
          tableFilters: filters,
          params: {
            part_detail: true,
            location_detail: true,
            in_stock: true
          },
          noRecordsText: t`Nenhum material em estoque`
        }}
      />
    </>
  );
}
