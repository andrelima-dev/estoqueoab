import { t } from '@lingui/core/macro';

import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { StockBalanceTable } from '../../tables/oab/StockBalanceTable';

/**
 * **Estoque Atual** - saldo de cada material em cada local.
 */
export default function CurrentStockPage() {
  return (
    <>
      <PageTitle title={t`Estoque Atual`} />
      <PageDetail
        title={t`Estoque Atual`}
        subtitle={t`Saldo por material e local`}
      />
      <StockBalanceTable />
    </>
  );
}
