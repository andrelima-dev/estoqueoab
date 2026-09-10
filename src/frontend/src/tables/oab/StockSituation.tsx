import { t } from '@lingui/core/macro';
import { Badge } from '@mantine/core';
import type { ReactNode } from 'react';

export type StockSituation = {
  key: 'inactive' | 'empty' | 'low' | 'ok';
  label: string;
  color: string;
  variant: 'filled' | 'light' | 'outline';
};

/**
 * Situação de estoque de um material, conforme a regra do almoxarifado:
 *
 * - Sem estoque: saldo zerado;
 * - Estoque baixo: saldo menor ou igual ao estoque mínimo definido;
 * - Normal: demais casos.
 *
 * A identidade da OAB é azul, vermelho e preto — não há âmbar nem verde para
 * escalonar gravidade. A escala é feita pelo **peso** do mesmo vermelho:
 * preenchido no caso crítico, suave no alerta, e neutro no normal.
 */
export function getStockSituation(record: any): StockSituation {
  if (record?.active === false) {
    return {
      key: 'inactive',
      label: t`Inativo`,
      color: 'gray',
      variant: 'outline'
    };
  }

  const stock = Number(record?.total_in_stock ?? 0);
  const minimum = Number(record?.minimum_stock ?? 0);

  if (stock <= 0) {
    return {
      key: 'empty',
      label: t`Sem estoque`,
      color: 'oabRed',
      variant: 'filled'
    };
  }

  if (minimum > 0 && stock <= minimum) {
    return {
      key: 'low',
      label: t`Estoque baixo`,
      color: 'oabRed',
      variant: 'light'
    };
  }

  return { key: 'ok', label: t`Normal`, color: 'gray', variant: 'light' };
}

export function StockSituationBadge({
  record
}: Readonly<{ record: any }>): ReactNode {
  const situation = getStockSituation(record);

  return (
    <Badge color={situation.color} variant={situation.variant} size='sm'>
      {situation.label}
    </Badge>
  );
}
