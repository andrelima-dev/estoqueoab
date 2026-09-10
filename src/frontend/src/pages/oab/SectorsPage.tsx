import { t } from '@lingui/core/macro';

import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { SectorTable } from '../../tables/oab/SectorTable';

/**
 * **Setores** - cadastro dos departamentos que requisitam materiais.
 */
export default function SectorsPage() {
  return (
    <>
      <PageTitle title={t`Setores`} />
      <PageDetail
        title={t`Setores`}
        subtitle={t`Departamentos da OAB-MA que requisitam materiais`}
      />
      <SectorTable />
    </>
  );
}
