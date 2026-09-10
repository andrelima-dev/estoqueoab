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
  Textarea
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { LocationInput } from '../../components/oab/LocationInput';
import { MovementConfirmModal } from '../../components/oab/MovementConfirm';
import {
  LocationSelect,
  MaterialSelect,
  StockBalancePanel,
  useAvailableQuantity
} from '../../components/oab/MovementFields';
import { OAB_COLOR_SAIDA } from '../../defaults/oab';
import { useMovementSubmit } from '../../hooks/UseMovementSubmit';

/**
 * **Transferir Material** - movimentação entre locais de estoque.
 */
export default function StockTransferPage() {
  const [part, setPart] = useState<any>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [notes, setNotes] = useState<string>('');

  const [confirmOpened, confirmHandlers] = useDisclosure(false);
  const [formKey, setFormKey] = useState<number>(0);

  const { available, refetch } = useAvailableQuantity(
    part?.pk ?? null,
    origin?.pk ?? null
  );

  const { submit, loading, fieldError } = useMovementSubmit({
    endpoint: ApiEndpoints.oab_transfer,
    successTitle: t`Transferência registrada`
  });

  const numericQuantity = Number(quantity) || 0;
  const insufficient = numericQuantity > available;
  // O destino é digitado, então a comparação com a origem é feita pelo nome -
  // a mesma regra que o backend aplica antes de resolver o local.
  const sameLocation =
    !!origin?.name &&
    destination.trim().toLocaleLowerCase() ===
      String(origin.name).toLocaleLowerCase();

  const canSubmit =
    !!part?.pk &&
    !!origin?.pk &&
    !!destination.trim() &&
    !sameLocation &&
    numericQuantity > 0;

  const resetForm = useCallback(() => {
    setPart(null);
    setOrigin(null);
    setDestination('');
    setQuantity('');
    setNotes('');
    setFormKey((key) => key + 1);
  }, []);

  const onConfirm = useCallback(async () => {
    const result = await submit({
      part: part?.pk,
      quantity: numericQuantity,
      location_from: origin?.pk,
      location_to_name: destination.trim(),
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
    numericQuantity,
    origin,
    destination,
    notes,
    confirmHandlers,
    resetForm,
    refetch
  ]);

  const summaryRows = useMemo(
    () => [
      { label: t`Material`, value: part?.name ?? '' },
      { label: t`Quantidade`, value: numericQuantity },
      { label: t`Local de origem`, value: origin?.name ?? '' },
      { label: t`Local de destino`, value: destination },
      { label: t`Saldo na origem após`, value: available - numericQuantity }
    ],
    [part, numericQuantity, origin, destination, available]
  );

  return (
    <>
      <PageTitle title={t`Transferir Material`} />
      <PageDetail
        title={t`Transferir Material`}
        subtitle={t`Movimentar material entre locais de estoque`}
      />

      <MovementConfirmModal
        opened={confirmOpened}
        onClose={confirmHandlers.close}
        title={t`Confirmar transferência`}
        confirmLabel={t`Confirmar Transferência`}
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
                fieldName='location_from'
                label={t`Local de origem`}
                description={t`De onde o material sairá`}
                onChange={(_pk, record) => setOrigin(record)}
              />

              <LocationInput
                label={t`Local de destino`}
                description={t`Para onde o material será movido - digite para criar um local novo`}
                value={destination}
                onChange={setDestination}
              />

              <NumberInput
                label={t`Quantidade`}
                required
                min={0}
                value={quantity}
                onChange={setQuantity}
                error={
                  fieldError('quantity') ??
                  (insufficient && numericQuantity > 0
                    ? t`Quantidade superior ao disponível`
                    : undefined)
                }
              />

              <Textarea
                label={t`Observações`}
                autosize
                minRows={2}
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
              />

              <Group justify='flex-end'>
                <Button
                  disabled={!canSubmit || insufficient}
                  onClick={confirmHandlers.open}
                  size='md'
                >
                  {t`Confirmar Transferência`}
                </Button>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap='md'>
            <StockBalancePanel
              available={available}
              quantity={numericQuantity}
              operation='out'
            />

            {sameLocation && (
              <Alert
                color={OAB_COLOR_SAIDA}
                icon={<IconAlertTriangle />}
                title={t`Locais iguais`}
              >
                <Text size='sm'>
                  {t`O local de destino deve ser diferente do local de origem.`}
                </Text>
              </Alert>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
