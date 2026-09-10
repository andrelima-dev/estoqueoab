import { type RowAction, RowEditAction } from '@lib/components/RowActions';
import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { ModelType } from '@lib/enums/ModelType';
import { UserRoles } from '@lib/enums/Roles';
import { apiUrl } from '@lib/functions/Api';
import useTable from '@lib/hooks/UseTable';
import type { TableFilter } from '@lib/types/Filters';
import type { TableColumn } from '@lib/types/Tables';
import { t } from '@lingui/core/macro';
import { Button, Group, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { MovementButtons } from '../../components/oab/MovementButtons';
import {
  QuickMovementModal,
  type QuickMovementOperation
} from '../../components/oab/QuickMovementModal';
import { InvenTreeTable } from '../../components/tables/InvenTreeTable';
import { useMaterialFields } from '../../forms/OabForms';
import {
  useCreateApiFormModal,
  useEditApiFormModal
} from '../../hooks/UseForm';
import { useUserState } from '../../states/UserState';
import { StockSituationBadge } from './StockSituation';

/**
 * Tabela de **Materiais** do almoxarifado.
 *
 * Consome o endpoint nativo de peças do InvenTree, exibindo apenas as colunas
 * relevantes para o controle de estoque institucional.
 */
export function MaterialTable() {
  const user = useUserState();
  const table = useTable('oab-materials');

  const [selected, setSelected] = useState<any>({});

  const canMove = user.hasAddRole(UserRoles.stock);

  // Movimentação rápida a partir da própria linha do material
  const [movementMaterial, setMovementMaterial] = useState<any>(null);
  const [movementOperation, setMovementOperation] =
    useState<QuickMovementOperation>('in');
  const [movementOpened, movementHandlers] = useDisclosure(false);

  // Mensagem exibida quando a entrada vem logo após o cadastro do material
  const [movementIntro, setMovementIntro] = useState<string | undefined>();

  const openMovement = useCallback(
    (record: any, operation: QuickMovementOperation, intro?: string) => {
      setMovementMaterial(record);
      setMovementOperation(operation);
      setMovementIntro(intro);
      movementHandlers.open();
    },
    [movementHandlers]
  );

  const createFields = useMaterialFields({ create: true });
  const editFields = useMaterialFields({ create: false });

  const createMaterial = useCreateApiFormModal({
    url: ApiEndpoints.part_list,
    title: t`Novo Material`,
    fields: createFields,
    successMessage: t`Material cadastrado`,
    // Cadastrar um material quase sempre significa que já existe alguma
    // quantidade em mãos: emendamos direto na entrada, para que o saldo
    // inicial também fique registrado no histórico.
    onFormSuccess: (data: any) => {
      table.refreshTable();

      if (data?.pk && canMove) {
        openMovement(
          data,
          'in',
          t`Material cadastrado. Informe a quantidade que já existe em estoque, ou cancele se ainda não houver nenhuma.`
        );
      }
    }
  });

  const editMaterial = useEditApiFormModal({
    url: ApiEndpoints.part_list,
    pk: selected.pk,
    title: t`Editar Material`,
    fields: editFields,
    onFormSuccess: table.refreshTable
  });

  const columns: TableColumn[] = useMemo(
    () => [
      {
        accessor: 'IPN',
        title: t`Código`,
        sortable: true,
        copyable: true
      },
      {
        accessor: 'name',
        title: t`Material`,
        sortable: true,
        render: (record: any) => (
          <div>
            <Text size='sm'>{record.name}</Text>
            {record.description && (
              <Text size='xs' c='dimmed'>
                {record.description}
              </Text>
            )}
          </div>
        )
      },
      {
        accessor: 'category_detail.name',
        title: t`Categoria`,
        sortable: false,
        render: (record: any) => record.category_detail?.name ?? '-'
      },
      {
        accessor: 'total_in_stock',
        title: t`Estoque`,
        sortable: true,
        textAlign: 'right',
        render: (record: any) => (
          <Group gap={4} justify='flex-end' wrap='nowrap'>
            <Text size='sm' fw={500}>
              {record.total_in_stock ?? 0}
            </Text>
            {Number(record.minimum_stock) > 0 && (
              <Text size='xs' c='dimmed'>
                / {t`mín.`} {record.minimum_stock}
              </Text>
            )}
          </Group>
        )
      },
      {
        accessor: 'units',
        title: t`Unidade`,
        sortable: true
      },
      {
        accessor: 'default_location_detail.name',
        title: t`Local`,
        sortable: false,
        render: (record: any) => record.default_location_detail?.name ?? '-'
      },
      {
        accessor: 'situation',
        title: t`Situação`,
        sortable: false,
        render: (record: any) => <StockSituationBadge record={record} />
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
              material={record}
              stock={Number(record.total_in_stock ?? 0)}
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
        name: 'category',
        label: t`Categoria`,
        description: t`Filtrar por categoria de material`,
        apiUrl: apiUrl(ApiEndpoints.category_list),
        model: ModelType.partcategory,
        modelRenderer: (instance: any) => instance.name
      },
      {
        name: 'location',
        label: t`Local de estoque`,
        description: t`Filtrar por local onde o material está armazenado`,
        apiUrl: apiUrl(ApiEndpoints.stock_location_list),
        model: ModelType.stocklocation,
        modelRenderer: (instance: any) => instance.name
      },
      {
        name: 'low_stock',
        label: t`Estoque baixo`,
        description: t`Mostrar apenas materiais com estoque baixo`,
        type: 'boolean'
      },
      {
        name: 'has_stock',
        label: t`Com estoque`,
        description: t`Mostrar apenas materiais com saldo disponível`,
        type: 'boolean'
      },
      {
        name: 'active',
        label: t`Ativo`,
        description: t`Mostrar apenas materiais ativos`,
        type: 'boolean'
      }
    ],
    []
  );

  const rowActions = useCallback(
    (record: any): RowAction[] => [
      RowEditAction({
        hidden: !user.hasChangePermission(ModelType.part),
        onClick: () => {
          setSelected(record);
          editMaterial.open();
        }
      })
    ],
    [user, editMaterial]
  );

  const tableActions = useMemo(
    () => [
      <Button
        key='add-material'
        hidden={!user.hasAddPermission(ModelType.part)}
        leftSection={<IconPlus size={16} />}
        onClick={() => createMaterial.open()}
      >
        {t`Novo Material`}
      </Button>
    ],
    [user, createMaterial]
  );

  return (
    <>
      {createMaterial.modal}
      {editMaterial.modal}
      <QuickMovementModal
        opened={movementOpened}
        onClose={movementHandlers.close}
        operation={movementOperation}
        material={movementMaterial}
        intro={movementIntro}
        onSuccess={table.refreshTable}
      />
      <InvenTreeTable
        url={apiUrl(ApiEndpoints.part_list)}
        tableState={table}
        columns={columns}
        props={{
          modelType: ModelType.part,
          enableDownload: true,
          enableSelection: false,
          tableFilters: filters,
          tableActions: tableActions,
          rowActions: rowActions,
          params: {
            category_detail: true,
            location_detail: true
          },
          noRecordsText: t`Nenhum material encontrado`
        }}
      />
    </>
  );
}
