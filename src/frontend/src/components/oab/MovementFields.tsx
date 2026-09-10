import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { ModelType } from '@lib/enums/ModelType';
import { apiUrl } from '@lib/functions/Api';
import type { ApiFormFieldType } from '@lib/types/Forms';
import { t } from '@lingui/core/macro';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from '../../App';
import { StandaloneField } from '../forms/StandaloneField';

/**
 * Campo de seleção de **Material**, com pesquisa por nome, código e categoria.
 */
export function MaterialSelect({
  onChange,
  required = true,
  activeOnly = true
}: Readonly<{
  onChange: (pk: number | null, record?: any) => void;
  required?: boolean;
  /** Restringe a busca a materiais ativos (usado apenas nas entradas). */
  activeOnly?: boolean;
}>) {
  const definition: ApiFormFieldType = useMemo(
    () => ({
      field_type: 'related field',
      api_url: apiUrl(ApiEndpoints.part_list),
      model: ModelType.part,
      label: t`Material`,
      description: t`Pesquise pelo nome ou pelo código do material`,
      required: required,
      filters: activeOnly ? { active: true } : undefined,
      onValueChange: onChange
    }),
    [onChange, required, activeOnly]
  );

  return <StandaloneField fieldName='part' fieldDefinition={definition} />;
}

/**
 * Campo de seleção de **Local de Estoque**.
 */
export function LocationSelect({
  fieldName,
  label,
  description,
  onChange,
  required = true,
  defaultValue
}: Readonly<{
  fieldName: string;
  label: string;
  description?: string;
  onChange: (pk: number | null, record?: any) => void;
  required?: boolean;
  /** Local pré-selecionado (ex.: o local padrão do material). */
  defaultValue?: number;
}>) {
  const definition: ApiFormFieldType = useMemo(
    () => ({
      field_type: 'related field',
      api_url: apiUrl(ApiEndpoints.stock_location_list),
      model: ModelType.stocklocation,
      label: label,
      description: description,
      required: required,
      filters: { structural: false },
      onValueChange: onChange
    }),
    [label, description, onChange, required]
  );

  return (
    <StandaloneField
      fieldName={fieldName}
      fieldDefinition={definition}
      defaultValue={defaultValue}
    />
  );
}

/**
 * Campo de data, reutilizando o componente de data do InvenTree.
 */
export function DateSelect({
  fieldName,
  label,
  description,
  onChange
}: Readonly<{
  fieldName: string;
  label: string;
  description?: string;
  onChange: (value: string | null) => void;
}>) {
  const definition: ApiFormFieldType = useMemo(
    () => ({
      field_type: 'date',
      label: label,
      description: description,
      required: false,
      onValueChange: onChange
    }),
    [label, description, onChange]
  );

  return <StandaloneField fieldName={fieldName} fieldDefinition={definition} />;
}

/**
 * Quantidade disponível de um material em um local (incluindo sublocais).
 *
 * Usa o mesmo critério do backend, de modo que o valor exibido ao operador
 * corresponda exatamente ao que será validado na confirmação.
 */
export function useAvailableQuantity(
  partId: number | null,
  locationId: number | null
) {
  const query = useQuery({
    queryKey: ['oab-available', partId, locationId],
    enabled: !!partId,
    queryFn: async () => {
      if (!partId) {
        return 0;
      }

      const params: Record<string, any> = {
        part: partId,
        in_stock: true,
        limit: 250
      };

      if (locationId) {
        params.location = locationId;
        params.cascade = true;
      }

      const response = await api.get(apiUrl(ApiEndpoints.stock_item_list), {
        params
      });

      const items = response.data?.results ?? response.data ?? [];

      return items.reduce(
        (total: number, item: any) => total + Number(item.quantity ?? 0),
        0
      );
    }
  });

  return {
    available: query.data ?? 0,
    isLoading: query.isFetching,
    refetch: query.refetch
  };
}

/**
 * Painel com o saldo antes / durante / depois da operação.
 */
export function StockBalancePanel({
  available,
  quantity,
  operation
}: Readonly<{
  available: number;
  quantity: number;
  operation: 'in' | 'out';
}>) {
  const delta = operation === 'in' ? quantity : -quantity;
  const resulting = available + delta;
  const insufficient = operation === 'out' && quantity > available;

  return (
    <Paper withBorder p='sm' radius='md'>
      <Stack gap={6}>
        <Group justify='space-between'>
          <Text size='sm' c='dimmed'>
            {t`Disponível`}
          </Text>
          <Text size='sm' fw={500}>
            {available}
          </Text>
        </Group>
        <Group justify='space-between'>
          <Text size='sm' c='dimmed'>
            {operation === 'in' ? t`Entrada` : t`Saída`}
          </Text>
          <Text
            size='sm'
            fw={500}
            c={
              quantity > 0 ? (operation === 'in' ? 'green' : 'red') : undefined
            }
          >
            {quantity > 0 && (operation === 'in' ? '+' : '-')}
            {quantity}
          </Text>
        </Group>
        <Group justify='space-between'>
          <Text size='sm' c='dimmed'>
            {t`Saldo após a operação`}
          </Text>
          <Text size='sm' fw={700} c={insufficient ? 'red' : undefined}>
            {insufficient ? t`Insuficiente` : resulting}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
