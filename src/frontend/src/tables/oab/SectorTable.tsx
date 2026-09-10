import { AddItemButton } from '@lib/components/AddItemButton';
import {
  type RowAction,
  RowDeleteAction,
  RowEditAction
} from '@lib/components/RowActions';
import { YesNoButton } from '@lib/components/YesNoButton';
import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { apiUrl } from '@lib/functions/Api';
import useTable from '@lib/hooks/UseTable';
import type { TableFilter } from '@lib/types/Filters';
import type { TableColumn } from '@lib/types/Tables';
import { t } from '@lingui/core/macro';
import { useCallback, useMemo, useState } from 'react';
import { InvenTreeTable } from '../../components/tables/InvenTreeTable';
import { useSectorFields } from '../../forms/OabForms';
import {
  useCreateApiFormModal,
  useDeleteApiFormModal,
  useEditApiFormModal
} from '../../hooks/UseForm';
import { useUserState } from '../../states/UserState';

/**
 * Tabela de **Setores / Departamentos** da OAB-MA.
 *
 * Cadastro administrável: nenhum setor é definido em código.
 */
export function SectorTable() {
  const user = useUserState();
  const table = useTable('oab-sectors');

  const [selected, setSelected] = useState<any>({});

  const fields = useSectorFields();

  const createSector = useCreateApiFormModal({
    url: ApiEndpoints.oab_sector_list,
    title: t`Novo Setor`,
    fields: fields,
    onFormSuccess: table.refreshTable
  });

  const editSector = useEditApiFormModal({
    url: ApiEndpoints.oab_sector_list,
    pk: selected.pk,
    title: t`Editar Setor`,
    fields: fields,
    onFormSuccess: table.refreshTable
  });

  const deleteSector = useDeleteApiFormModal({
    url: ApiEndpoints.oab_sector_list,
    pk: selected.pk,
    title: t`Excluir Setor`,
    preFormWarning: t`Setores já utilizados em movimentações devem ser desativados, e não excluídos.`,
    onFormSuccess: table.refreshTable
  });

  const columns: TableColumn[] = useMemo(
    () => [
      {
        accessor: 'code',
        title: t`Sigla`,
        sortable: true
      },
      {
        accessor: 'name',
        title: t`Setor`,
        sortable: true
      },
      {
        accessor: 'description',
        title: t`Descrição`,
        sortable: false
      },
      {
        accessor: 'active',
        title: t`Ativo`,
        sortable: true,
        render: (record: any) => <YesNoButton value={record.active} />
      }
    ],
    []
  );

  const filters: TableFilter[] = useMemo(
    () => [
      {
        name: 'active',
        label: t`Ativo`,
        description: t`Mostrar apenas setores ativos`,
        type: 'boolean'
      }
    ],
    []
  );

  const rowActions = useCallback(
    (record: any): RowAction[] => [
      RowEditAction({
        hidden: !user.isStaff(),
        onClick: () => {
          setSelected(record);
          editSector.open();
        }
      }),
      RowDeleteAction({
        hidden: !user.isStaff(),
        onClick: () => {
          setSelected(record);
          deleteSector.open();
        }
      })
    ],
    [user, editSector, deleteSector]
  );

  const tableActions = useMemo(
    () => [
      <AddItemButton
        key='add-sector'
        hidden={!user.isStaff()}
        tooltip={t`Novo Setor`}
        onClick={() => createSector.open()}
      />
    ],
    [user, createSector]
  );

  return (
    <>
      {createSector.modal}
      {editSector.modal}
      {deleteSector.modal}
      <InvenTreeTable
        url={apiUrl(ApiEndpoints.oab_sector_list)}
        tableState={table}
        columns={columns}
        props={{
          enableDownload: true,
          enableSelection: false,
          tableFilters: filters,
          tableActions: tableActions,
          rowActions: rowActions,
          noRecordsText: t`Nenhum setor cadastrado`
        }}
      />
    </>
  );
}
