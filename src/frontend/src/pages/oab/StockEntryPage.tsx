import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { t } from '@lingui/core/macro';
import {
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
import { useCallback, useMemo, useState } from 'react';
import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import { MovementConfirmModal } from '../../components/oab/MovementConfirm';
import {
  DateSelect,
  LocationSelect,
  MaterialSelect,
  StockBalancePanel,
  useAvailableQuantity
} from '../../components/oab/MovementFields';
import { useMovementSubmit } from '../../hooks/UseMovementSubmit';

/**
 * **Nova Entrada** - recebimento de material no almoxarifado.
 */
export default function StockEntryPage() {
  const [part, setPart] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [quantity, setQuantity] = useState<number | string>('');
  const [source, setSource] = useState<string>('');
  const [document, setDocument] = useState<string>('');
  const [handler, setHandler] = useState<string>('');
  const [referenceDate, setReferenceDate] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  const [confirmOpened, confirmHandlers] = useDisclosure(false);

  // Incrementado após uma operação bem-sucedida, para remontar (e limpar) o formulário
  const [formKey, setFormKey] = useState<number>(0);

  const { available, refetch } = useAvailableQuantity(
    part?.pk ?? null,
    location?.pk ?? null
  );

  const { submit, loading, fieldError } = useMovementSubmit({
    endpoint: ApiEndpoints.oab_entry,
    successTitle: t`Entrada registrada`
  });

  const numericQuantity = Number(quantity) || 0;

  const canSubmit = !!part?.pk && !!location?.pk && numericQuantity > 0;

  const resetForm = useCallback(() => {
    setPart(null);
    setLocation(null);
    setQuantity('');
    setSource('');
    setDocument('');
    setHandler('');
    setReferenceDate(null);
    setNotes('');
    setFormKey((key) => key + 1);
  }, []);

  const onConfirm = useCallback(async () => {
    const result = await submit({
      part: part?.pk,
      quantity: numericQuantity,
      location: location?.pk,
      source: source,
      document: document,
      handler: handler,
      reference_date: referenceDate,
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
    source,
    document,
    handler,
    referenceDate,
    notes,
    confirmHandlers,
    resetForm,
    refetch
  ]);

  const summaryRows = useMemo(
    () => [
      { label: t`Material`, value: part?.name ?? '' },
      { label: t`Quantidade`, value: numericQuantity },
      { label: t`Local de destino`, value: location?.name ?? '' },
      { label: t`Origem / Fornecedor`, value: source },
      { label: t`Documento`, value: document },
      { label: t`Responsável pelo recebimento`, value: handler },
      { label: t`Saldo após a operação`, value: available + numericQuantity }
    ],
    [part, numericQuantity, location, source, document, handler, available]
  );

  return (
    <>
      <PageTitle title={t`Nova Entrada`} />
      <PageDetail
        title={t`Nova Entrada`}
        subtitle={t`Registrar o recebimento de material no almoxarifado`}
      />

      <MovementConfirmModal
        opened={confirmOpened}
        onClose={confirmHandlers.close}
        title={t`Confirmar entrada`}
        confirmLabel={t`Confirmar Entrada`}
        rows={summaryRows}
        loading={loading}
        onConfirm={onConfirm}
      />

      <Grid mt='md'>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius='md' p='lg'>
            <Stack gap='md' key={formKey}>
              <MaterialSelect onChange={(_pk, record) => setPart(record)} />

              <NumberInput
                label={t`Quantidade`}
                required
                min={0}
                value={quantity}
                onChange={setQuantity}
                error={fieldError('quantity')}
              />

              <LocationSelect
                fieldName='location'
                label={t`Local de destino`}
                description={t`Onde o material será armazenado`}
                onChange={(_pk, record) => setLocation(record)}
              />

              <TextInput
                label={t`Origem`}
                description={t`Fornecedor, doação, devolução...`}
                value={source}
                onChange={(event) => setSource(event.currentTarget.value)}
              />

              <TextInput
                label={t`Número do documento`}
                description={t`Nota fiscal, empenho ou protocolo`}
                value={document}
                onChange={(event) => setDocument(event.currentTarget.value)}
              />

              <DateSelect
                fieldName='reference_date'
                label={t`Data do documento`}
                description={t`Opcional - a data do registro é sempre automática`}
                onChange={setReferenceDate}
              />

              <TextInput
                label={t`Responsável pelo recebimento`}
                description={t`Quem recebeu fisicamente o material`}
                value={handler}
                onChange={(event) => setHandler(event.currentTarget.value)}
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
                  disabled={!canSubmit}
                  onClick={confirmHandlers.open}
                  size='md'
                >
                  {t`Confirmar Entrada`}
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
              operation='in'
            />

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
