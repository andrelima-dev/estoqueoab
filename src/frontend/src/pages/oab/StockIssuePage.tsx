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
  Textarea,
  TextInput
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { MovementConfirmModal } from '../../components/oab/MovementConfirm';
import {
  MaterialSelect,
  StockBalancePanel,
  useAvailableQuantity
} from '../../components/oab/MovementFields';
import { OriginSelect } from '../../components/oab/OriginSelect';
import { SectorInput } from '../../components/oab/SectorInput';
import { OAB_COLOR_SAIDA } from '../../defaults/oab';
import { useMovementSubmit } from '../../hooks/UseMovementSubmit';

/**
 * **Nova Saída** - entrega de material a um setor da OAB-MA.
 */
export default function StockIssuePage() {
  const [part, setPart] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [sector, setSector] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [requester, setRequester] = useState<string>('');
  const [handler, setHandler] = useState<string>('');
  const [document, setDocument] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [confirmOpened, confirmHandlers] = useDisclosure(false);
  const [formKey, setFormKey] = useState<number>(0);

  const { available, refetch } = useAvailableQuantity(
    part?.pk ?? null,
    location?.pk ?? null
  );

  const { submit, loading, fieldError } = useMovementSubmit({
    endpoint: ApiEndpoints.oab_issue,
    successTitle: t`Saída registrada`
  });

  const numericQuantity = Number(quantity) || 0;
  const insufficient = numericQuantity > available;

  const canSubmit =
    !!part?.pk &&
    !!location?.pk &&
    !!sector.trim() &&
    !!handler.trim() &&
    numericQuantity > 0;

  const resetForm = useCallback(() => {
    setPart(null);
    setLocation(null);
    setSector('');
    setQuantity('');
    setRequester('');
    setHandler('');
    setDocument('');
    setNotes('');
    setFormKey((key) => key + 1);
  }, []);

  const onConfirm = useCallback(async () => {
    const result = await submit({
      part: part?.pk,
      quantity: numericQuantity,
      location: location?.pk,
      sector_name: sector,
      requester: requester,
      handler: handler,
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
    numericQuantity,
    location,
    sector,
    requester,
    handler,
    document,
    notes,
    confirmHandlers,
    resetForm,
    refetch
  ]);

  const summaryRows = useMemo(
    () => [
      { label: t`Material`, value: part?.name ?? '' },
      { label: t`Quantidade`, value: numericQuantity },
      { label: t`Local de origem`, value: location?.name ?? '' },
      { label: t`Destino`, value: sector },
      { label: t`Solicitante`, value: requester },
      { label: t`Entregue a`, value: handler },
      { label: t`Documento`, value: document },
      { label: t`Saldo após a operação`, value: available - numericQuantity }
    ],
    [
      part,
      numericQuantity,
      location,
      sector,
      requester,
      handler,
      document,
      available
    ]
  );

  return (
    <>
      <PageTitle title={t`Nova Saída`} />
      <PageDetail
        title={t`Nova Saída`}
        subtitle={t`Registrar a entrega de material a um setor`}
      />

      <MovementConfirmModal
        opened={confirmOpened}
        onClose={confirmHandlers.close}
        title={t`Confirmar saída`}
        confirmLabel={t`Confirmar Saída`}
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

              <OriginSelect
                partId={part?.pk}
                value={location}
                onChange={setLocation}
                label={t`Local de origem`}
                description={t`Locais que têm este material, com o saldo de cada um`}
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

              <SectorInput
                value={sector}
                onChange={setSector}
                error={fieldError('sector_name')}
              />

              <TextInput
                label={t`Entregue a`}
                description={t`Quem retirou o material — é o responsável pela retirada`}
                required
                value={handler}
                onChange={(event) => setHandler(event.currentTarget.value)}
                error={fieldError('handler')}
              />

              <TextInput
                label={t`Solicitante`}
                description={t`Quem pediu o material, se for outra pessoa`}
                value={requester}
                onChange={(event) => setRequester(event.currentTarget.value)}
              />

              <TextInput
                label={t`Documento / Protocolo`}
                description={t`Opcional`}
                value={document}
                onChange={(event) => setDocument(event.currentTarget.value)}
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
                  {t`Confirmar Saída`}
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

            {insufficient && numericQuantity > 0 && (
              <Alert
                color={OAB_COLOR_SAIDA}
                icon={<IconAlertTriangle />}
                title={t`Estoque insuficiente`}
              >
                <Text size='sm'>
                  {t`A quantidade solicitada é maior do que a disponível no local de origem. Ajuste a quantidade ou escolha outro local.`}
                </Text>
              </Alert>
            )}

            {part && (
              <Card withBorder radius='md' p='md'>
                <Stack gap={4}>
                  <Text size='sm' fw={600}>
                    {part.name}
                  </Text>
                  {part.IPN && (
                    <Text size='xs' c='dimmed'>
                      {t`Código`}: {part.IPN}
                    </Text>
                  )}
                  {part.units && (
                    <Text size='xs' c='dimmed'>
                      {t`Unidade`}: {part.units}
                    </Text>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
