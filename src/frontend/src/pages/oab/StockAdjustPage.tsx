import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { t } from '@lingui/core/macro';
import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Textarea
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { MovementConfirmModal } from '../../components/oab/MovementConfirm';
import {
  LocationSelect,
  MaterialSelect,
  useAvailableQuantity
} from '../../components/oab/MovementFields';
import { OAB_COLOR_SAIDA } from '../../defaults/oab';
import { useMovementSubmit } from '../../hooks/UseMovementSubmit';

/**
 * **Ajuste de Saldo** - correção de inventário / estorno.
 *
 * Nenhuma movimentação é apagada: o ajuste gera uma nova entrada no histórico,
 * com justificativa obrigatória.
 */
export default function StockAdjustPage() {
  const [part, setPart] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [counted, setCounted] = useState<number | string>('');
  const [document, setDocument] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [confirmOpened, confirmHandlers] = useDisclosure(false);
  const [formKey, setFormKey] = useState<number>(0);

  const { available, refetch } = useAvailableQuantity(
    part?.pk ?? null,
    location?.pk ?? null
  );

  const { submit, loading, fieldError } = useMovementSubmit({
    endpoint: ApiEndpoints.oab_adjust,
    successTitle: t`Ajuste registrado`
  });

  const numericCounted = Number(counted) || 0;
  const delta = numericCounted - available;

  const canSubmit =
    !!part?.pk && !!location?.pk && counted !== '' && notes.trim().length > 0;

  const resetForm = useCallback(() => {
    setPart(null);
    setLocation(null);
    setCounted('');
    setDocument('');
    setNotes('');
    setFormKey((key) => key + 1);
  }, []);

  const onConfirm = useCallback(async () => {
    const result = await submit({
      part: part?.pk,
      quantity: numericCounted,
      location: location?.pk,
      document: document,
      notes: notes
    });

    confirmHandlers.close();

    if (result) {
      resetForm();
      refetch();
    }
  }, [
    submit,
    part,
    numericCounted,
    location,
    document,
    notes,
    confirmHandlers,
    resetForm,
    refetch
  ]);

  const summaryRows = useMemo(
    () => [
      { label: t`Material`, value: part?.name ?? '' },
      { label: t`Local`, value: location?.name ?? '' },
      { label: t`Saldo registrado`, value: available },
      { label: t`Saldo contado`, value: numericCounted },
      {
        label: t`Diferença`,
        value: `${delta > 0 ? '+' : ''}${delta}`
      },
      { label: t`Justificativa`, value: notes }
    ],
    [part, location, available, numericCounted, delta, notes]
  );

  return (
    <>
      <PageTitle title={t`Ajuste de Saldo`} />
      <PageDetail
        title={t`Ajuste de Saldo`}
        subtitle={t`Correção de inventário com registro de auditoria`}
      />

      <MovementConfirmModal
        opened={confirmOpened}
        onClose={confirmHandlers.close}
        title={t`Confirmar ajuste`}
        confirmLabel={t`Confirmar Ajuste`}
        rows={summaryRows}
        loading={loading}
        onConfirm={onConfirm}
      />

      <Grid mt='md'>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius='md' p='lg'>
            <Stack gap='md' key={formKey}>
              <MaterialSelect
                activeOnly={false}
                onChange={(_pk, record) => setPart(record)}
              />

              <LocationSelect
                fieldName='location'
                label={t`Local`}
                description={t`Local onde a contagem foi realizada`}
                onChange={(_pk, record) => setLocation(record)}
              />

              <NumberInput
                label={t`Quantidade contada`}
                description={t`Quantidade fisicamente encontrada no local`}
                required
                min={0}
                value={counted}
                onChange={setCounted}
                error={fieldError('quantity')}
              />

              <TextInput
                label={t`Documento`}
                description={t`Termo de inventário ou protocolo (opcional)`}
                value={document}
                onChange={(event) => setDocument(event.currentTarget.value)}
              />

              <Textarea
                label={t`Justificativa`}
                description={t`Obrigatória - ficará registrada no histórico`}
                required
                autosize
                minRows={3}
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
                error={fieldError('notes')}
              />

              <Group justify='flex-end'>
                <Button
                  disabled={!canSubmit}
                  onClick={confirmHandlers.open}
                  size='md'
                  color={OAB_COLOR_SAIDA}
                >
                  {t`Confirmar Ajuste`}
                </Button>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap='md'>
            <Card withBorder radius='md' p='sm'>
              <Stack gap={6}>
                <Group justify='space-between'>
                  <Text size='sm' c='dimmed'>
                    {t`Saldo registrado`}
                  </Text>
                  <Text size='sm' fw={500}>
                    {available}
                  </Text>
                </Group>
                <Group justify='space-between'>
                  <Text size='sm' c='dimmed'>
                    {t`Saldo contado`}
                  </Text>
                  <Text size='sm' fw={500}>
                    {numericCounted}
                  </Text>
                </Group>
                <Group justify='space-between'>
                  <Text size='sm' c='dimmed'>
                    {t`Diferença`}
                  </Text>
                  <Text
                    size='sm'
                    fw={700}
                    c={delta === 0 ? undefined : delta > 0 ? 'green' : 'red'}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </Text>
                </Group>
              </Stack>
            </Card>

            <Alert
              color='blue'
              icon={<IconInfoCircle />}
              title={t`Sobre o ajuste`}
            >
              <Text size='sm'>
                {t`O ajuste não apaga movimentações anteriores. A diferença é registrada como uma nova movimentação, vinculada ao seu usuário.`}
              </Text>
            </Alert>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
