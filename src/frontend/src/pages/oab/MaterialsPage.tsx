import { t } from '@lingui/core/macro';

import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { MaterialTable } from '../../tables/oab/MaterialTable';

/**
 * **Materiais** - cadastro dos itens controlados pelo almoxarifado.
 */
export default function MaterialsPage() {
  return (
    <>
      <PageTitle title={t`Materiais`} />
      <PageDetail
        title={t`Materiais`}
        subtitle={t`Cadastro de materiais do almoxarifado`}
      />
      <MaterialTable />
    </>
  );
}
