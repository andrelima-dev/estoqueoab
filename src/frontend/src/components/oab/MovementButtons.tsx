import { cancelEvent } from '@lib/functions/Events';
import { t } from '@lingui/core/macro';
import { Button, Group } from '@mantine/core';
import { IconCircleMinus, IconCirclePlus } from '@tabler/icons-react';

import { OAB_COLOR_ENTRADA, OAB_COLOR_SAIDA } from '../../defaults/oab';

import type { QuickMovementOperation } from './QuickMovementModal';

/**
 * Botões de **Entrada** e **Saída** exibidos em cada linha das tabelas do
 * almoxarifado.
 *
 * São o caminho mais curto para movimentar estoque: o material (e, quando
 * houver, o local) já estão definidos pela linha.
 */
export function MovementButtons({
  material,
  stock,
  onOpen
}: Readonly<{
  /** Registro do material (para desabilitar materiais inativos). */
  material?: any;
  /** Saldo disponível, usado para desabilitar a saída. */
  stock: number;
  onOpen: (operation: QuickMovementOperation) => void;
}>) {
  return (
    <Group gap={6} justify='center' wrap='nowrap'>
      <Button
        size='compact-sm'
        variant='light'
        color={OAB_COLOR_ENTRADA}
        aria-label='entrada'
        leftSection={<IconCirclePlus size={16} />}
        disabled={material?.active === false}
        onClick={(event: any) => {
          cancelEvent(event);
          onOpen('in');
        }}
      >
        {t`Entrada`}
      </Button>
      <Button
        size='compact-sm'
        variant='light'
        color={OAB_COLOR_SAIDA}
        aria-label='saida'
        leftSection={<IconCircleMinus size={16} />}
        disabled={stock <= 0}
        onClick={(event: any) => {
          cancelEvent(event);
          onOpen('out');
        }}
      >
        {t`Saída`}
      </Button>
    </Group>
  );
}
