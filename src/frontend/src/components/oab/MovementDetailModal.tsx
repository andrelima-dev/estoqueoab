import { t } from '@lingui/core/macro';
import { Divider, Grid, Modal, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

import { formatDate } from '../../defaults/formatters';
import {
  MOVEMENT_TYPES,
  MovementTypeBadge
} from '../../tables/oab/MovementTable';

function DetailRow({
  label,
  value
}: Readonly<{ label: string; value: ReactNode }>) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <Grid.Col span={{ base: 12, sm: 6 }}>
      <Text size='xs' c='dimmed'>
        {label}
      </Text>
      <Text size='sm'>{value}</Text>
    </Grid.Col>
  );
}

/**
 * Detalhe de uma movimentação.
 *
 * Distingue explicitamente **quem retirou/recebeu** o material de **qual
 * usuário do sistema registrou** a operação.
 */
export function MovementDetailModal({
  opened,
  onClose,
  movement
}: Readonly<{
  opened: boolean;
  onClose: () => void;
  movement: any;
}>) {
  if (!movement) {
    return null;
  }

  const isEntry = movement.movement_type === MOVEMENT_TYPES.IN;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size='lg'
      title={
        <Title order={4}>
          {t`Movimentação`} #{movement.pk}
        </Title>
      }
    >
      <Stack gap='sm'>
        <Grid>
          <DetailRow
            label={t`Tipo`}
            value={<MovementTypeBadge value={movement.movement_type} />}
          />
          <DetailRow
            label={t`Data e hora`}
            value={formatDate(movement.date, { showTime: true })}
          />
          <DetailRow
            label={t`Material`}
            value={movement.part_detail?.name ?? movement.part_name}
          />
          <DetailRow label={t`Código`} value={movement.part_detail?.IPN} />
        </Grid>

        <Divider label={t`Quantidades`} labelPosition='left' />

        <Grid>
          <DetailRow
            label={t`Quantidade movimentada`}
            value={Number(movement.quantity)}
          />
          <DetailRow
            label={t`Saldo anterior`}
            value={Number(movement.quantity_before)}
          />
          <DetailRow
            label={t`Saldo posterior`}
            value={Number(movement.quantity_after)}
          />
        </Grid>

        <Divider label={t`Origem e destino`} labelPosition='left' />

        <Grid>
          <DetailRow
            label={t`Local de origem`}
            value={movement.location_from_detail?.pathstring}
          />
          <DetailRow
            label={t`Local de destino`}
            value={movement.location_to_detail?.pathstring}
          />
          <DetailRow label={t`Setor`} value={movement.sector_detail?.name} />
          <DetailRow label={t`Origem / Fornecedor`} value={movement.source} />
        </Grid>

        <Divider label={t`Responsáveis`} labelPosition='left' />

        <Grid>
          <DetailRow label={t`Solicitante`} value={movement.requester} />
          <DetailRow
            label={
              isEntry
                ? t`Responsável pelo recebimento`
                : t`Responsável pela retirada`
            }
            value={movement.handler}
          />
          <DetailRow
            label={t`Registrado por`}
            value={movement.user_detail?.username}
          />
        </Grid>

        <Divider label={t`Documentação`} labelPosition='left' />

        <Grid>
          <DetailRow label={t`Documento`} value={movement.document} />
          <DetailRow
            label={t`Data do documento`}
            value={
              movement.reference_date
                ? formatDate(movement.reference_date)
                : null
            }
          />
          <DetailRow label={t`Observações`} value={movement.notes} />
        </Grid>
      </Stack>
    </Modal>
  );
}
