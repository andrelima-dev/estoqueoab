import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import { Select } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { api } from '../../App';

type Origem = { pk: number; name: string; quantity: number };

/**
 * Campo de **local de origem** de uma saída ou transferência.
 *
 * Lista apenas os locais que de fato têm o material, com o saldo de cada um.
 *
 * Oferecer todos os locais cadastrados era uma armadilha: o material aparecia
 * com saldo total no topo da tela, o operador escolhia um local qualquer e a
 * operação era recusada por "quantidade superior ao disponível", sem dizer onde
 * o material estava. Com a lista restrita, escolher um local impossível deixa
 * de ser uma opção.
 */
export function OriginSelect({
  partId,
  value,
  onChange,
  label,
  description
}: Readonly<{
  /** Material selecionado. Sem ele não há origem a oferecer. */
  partId?: number | null;
  value: Origem | null;
  onChange: (origem: Origem | null) => void;
  label: string;
  description?: string;
}>) {
  const origens = useQuery<Origem[]>({
    queryKey: ['oab-origins', partId],
    enabled: !!partId,
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.stock_item_list), {
        params: {
          part: partId,
          in_stock: true,
          location_detail: true,
          limit: 500
        }
      });

      const itens = response.data?.results ?? response.data ?? [];

      // Vários itens de estoque podem ocupar o mesmo local; o operador pensa
      // em locais, não em itens, então os saldos são somados por local.
      const porLocal = new Map<number, Origem>();

      for (const item of itens) {
        const pk = item.location;

        if (!pk) {
          continue;
        }

        const atual = porLocal.get(pk);
        const quantidade = Number(item.quantity) || 0;

        if (atual) {
          atual.quantity += quantidade;
        } else {
          porLocal.set(pk, {
            pk,
            name: item.location_detail?.name ?? item.location_name ?? `#${pk}`,
            quantity: quantidade
          });
        }
      }

      return [...porLocal.values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }
  });

  const dados = useMemo(
    () =>
      (origens.data ?? []).map((origem) => ({
        value: String(origem.pk),
        label: `${origem.name} (${origem.quantity})`
      })),
    [origens.data]
  );

  // Com um único local possível não há escolha a fazer: preenche sozinho.
  useEffect(() => {
    const lista = origens.data ?? [];

    if (lista.length === 1 && value?.pk !== lista[0].pk) {
      onChange(lista[0]);
    }

    if (lista.length === 0 && value) {
      onChange(null);
    }
  }, [origens.data, value, onChange]);

  const aoEscolher = useCallback(
    (escolhido: string | null) => {
      const origem = (origens.data ?? []).find(
        (o) => String(o.pk) === escolhido
      );

      onChange(origem ?? null);
    },
    [origens.data, onChange]
  );

  const semSaldo = !!partId && !origens.isFetching && dados.length === 0;

  return (
    <Select
      label={label}
      description={description}
      placeholder={
        partId ? t`Selecionar local` : t`Escolha o material primeiro`
      }
      required
      disabled={!partId}
      data={dados}
      value={value ? String(value.pk) : null}
      onChange={aoEscolher}
      error={
        semSaldo ? t`Este material não tem saldo em nenhum local` : undefined
      }
      searchable
      nothingFoundMessage={t`Nenhum local com saldo deste material`}
    />
  );
}
