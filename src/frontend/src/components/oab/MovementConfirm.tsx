import { t } from '@lingui/core/macro';
import { Button, Group, Modal, Stack, Table, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export type SummaryRow = {
  label: string;
  value: ReactNode;
};

/**
 * Resumo da operação, exibido antes da confirmação definitiva.
 */
export function MovementConfirmModal({
  opened,
  onClose,
  title,
  confirmLabel,
  rows,
  loading = false,
  onConfirm
}: Readonly<{
  opened: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  rows: SummaryRow[];
  loading?: boolean;
  onConfirm: () => void;
}>) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size='md'
      title={<Title order={4}>{title}</Title>}
    >
      <Stack gap='md'>
        <Text size='sm' c='dimmed'>
          {t`Confira os dados abaixo antes de confirmar. A operação será registrada no histórico.`}
        </Text>

        <Table withRowBorders={false} verticalSpacing={4}>
          <Table.Tbody>
            {rows
              .filter((row) => row.value !== null && row.value !== '')
              .map((row) => (
                <Table.Tr key={row.label}>
                  <Table.Td>
                    <Text size='sm' c='dimmed'>
                      {row.label}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size='sm' fw={500}>
                      {row.value}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>

        <Group justify='flex-end'>
          <Button variant='default' onClick={onClose} disabled={loading}>
            {t`Voltar`}
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
