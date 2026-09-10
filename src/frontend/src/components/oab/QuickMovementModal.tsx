import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { t } from '@lingui/core/macro';
import {
  Alert,
  Button,
  Collapse,
  Divider,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconInfoCircle
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import { OAB_COLOR_SAIDA } from '../../defaults/oab';
import { useMovementSubmit } from '../../hooks/UseMovementSubmit';
import { LocationSelect, useAvailableQuantity } from './MovementFields';
import { SectorInput } from './SectorInput';

export type QuickMovementOperation = 'in' | 'out';

/**
 * Movimentação rápida de um material, a partir da tela de Materiais.
 *
 * O material já está definido, e o local vem preenchido com o local padrão do
 * material: no caso comum o operador só digita a quantidade e confirma. Os
 * campos institucionais continuam disponíveis atrás de "mais opções", com as
 * mesmas regras de obrigatoriedade das telas completas.
 */
export function QuickMovementModal({
  opened,
  onClose,
  operation,
  material,
  intro,
  onSuccess
}: Readonly<{
  opened: boolean;
  onClose: () => void;
  operation: QuickMovementOperation;
  material: any;
  /** Mensagem exibida no topo (ex.: logo após cadastrar o material). */
  intro?: string;
  onSuccess?: () => void;
}>) {
  const isEntry = operation === 'in';

  const [quantity, setQuantity] = useState<number | string>('');
  const [location, setLocation] = useState<number | null>(null);
  const [sector, setSector] = useState<string>('');
  const [requester, setRequester] = useState<string>('');
  const [handler, setHandler] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [document, setDocument] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [extraOpened, extraHandlers] = useDisclosure(false);

  const { submit, loading, fieldError } = useMovementSubmit({
    endpoint: isEntry ? ApiEndpoints.oab_entry : ApiEndpoints.oab_issue,
    successTitle: isEntry ? t`Entrada registrada` : t`Saída registrada`
  });

  const { available, refetch } = useAvailableQuantity(
    material?.pk ?? null,
    location
  );

  // Limpa o formulário sempre que o modal é aberto para um novo material
  useEffect(() => {
    if (opened) {
      setQuantity('');
      setLocation(material?.default_location ?? null);
      setSector('');
      setRequester('');
      setHandler('');
      setSource('');
      setDocument('');
      setNotes('');
      extraHandlers.close();
    }
  }, [opened, material?.pk]);

  const numericQuantity = Number(quantity) || 0;
  const insufficient = !isEntry && numericQuantity > available;

  const canSubmit =
    numericQuantity > 0 &&
    !!location &&
    (isEntry || (!!sector.trim() && !!handler.trim())) &&
    !insufficient;

  const onConfirm = useCallback(async () => {
    const payload: Record<string, any> = {
      part: material?.pk,
      quantity: numericQuantity,
      location: location,
      document: document,
      notes: notes
    };

    if (isEntry) {
      payload.source = source;
      payload.handler = handler;
    } else {
      payload.sector_name = sector;
      payload.requester = requester;
      payload.handler = handler;
    }

    const result = await submit(payload);

    if (result) {
      refetch();
      onSuccess?.();
      onClose();
    }
  }, [
    submit,
    material,
    numericQuantity,
    location,
    sector,
    source,
    requester,
    handler,
    document,
    notes,
    isEntry,
    refetch,
    onSuccess,
    onClose
  ]);

  if (!material) {
    return null;
  }

  const resulting = isEntry
    ? available + numericQuantity
    : available - numericQuantity;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size='md'
      title={
        <div>
          <Title order={4}>{isEntry ? t`Entrada` : t`Saída`}</Title>
          <Text size='sm' c='dimmed'>
            {material.name}
            {material.IPN ? ` · ${material.IPN}` : ''}
          </Text>
        </div>
      }
    >
      <Stack gap='md'>
        {intro && (
          <Alert color='blue' icon={<IconInfoCircle />} p='xs'>
            <Text size='sm'>{intro}</Text>
          </Alert>
        )}

        <NumberInput
          label={t`Quantidade`}
          required
          min={0}
          data-autofocus
          value={quantity}
          onChange={setQuantity}
          rightSection={
            material.units ? (
              <Text size='xs' c='dimmed' pr='xs'>
                {material.units}
              </Text>
            ) : null
          }
          rightSectionWidth={material.units ? 70 : undefined}
          error={fieldError('quantity')}
        />

        <LocationSelect
          fieldName='location'
          label={isEntry ? t`Local de destino` : t`Local de origem`}
          onChange={(pk) => setLocation(pk)}
          defaultValue={material.default_location ?? undefined}
        />

        {!isEntry && (
          <>
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
          </>
        )}

        <UnstyledButton onClick={extraHandlers.toggle}>
          <Group gap={4}>
            {extraOpened ? (
              <IconChevronDown size={16} />
            ) : (
              <IconChevronRight size={16} />
            )}
            <Text size='sm' c='dimmed'>
              {t`Mais opções`}
            </Text>
          </Group>
        </UnstyledButton>

        <Collapse expanded={extraOpened}>
          <Stack gap='sm'>
            {isEntry ? (
              <>
                <TextInput
                  label={t`Origem`}
                  description={t`Fornecedor, doação, devolução...`}
                  value={source}
                  onChange={(event) => setSource(event.currentTarget.value)}
                />
                <TextInput
                  label={t`Responsável pelo recebimento`}
                  value={handler}
                  onChange={(event) => setHandler(event.currentTarget.value)}
                />
              </>
            ) : (
              <TextInput
                label={t`Solicitante`}
                description={t`Quem pediu o material, se for outra pessoa`}
                value={requester}
                onChange={(event) => setRequester(event.currentTarget.value)}
              />
            )}

            <TextInput
              label={t`Documento`}
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
          </Stack>
        </Collapse>

        {insufficient && (
          <Alert color={OAB_COLOR_SAIDA} icon={<IconAlertTriangle />} p='xs'>
            <Text size='sm'>
              {t`Quantidade superior ao disponível no local selecionado.`}
            </Text>
          </Alert>
        )}

        <Divider />

        <Group justify='space-between'>
          <Text size='sm' c='dimmed'>
            {t`Saldo`}: {available}
            {numericQuantity > 0 && ` → ${resulting}`}
          </Text>
          <Group gap='xs'>
            <Button variant='default' onClick={onClose} disabled={loading}>
              {t`Cancelar`}
            </Button>
            <Button
              onClick={onConfirm}
              loading={loading}
              disabled={!canSubmit}
              color={isEntry ? 'green' : 'red'}
            >
              {t`Confirmar`}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
