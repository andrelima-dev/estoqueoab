import { t } from '@lingui/core/macro';

import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { MovementTable } from '../../tables/oab/MovementTable';

/**
 * **Histórico de Movimentações** - trilha de auditoria do almoxarifado.
 */
export default function MovementHistoryPage() {
  return (
    <>
      <PageTitle title={t`Histórico de Movimentações`} />
      <PageDetail
        title={t`Histórico de Movimentações`}
        subtitle={t`Clique em uma linha para ver todos os detalhes da operação`}
      />
      <MovementTable showPeriodFilter />
    </>
  );
}
