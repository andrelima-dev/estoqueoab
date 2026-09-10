import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import { Autocomplete } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { api } from '../../App';

/**
 * Campo de **local de estoque** com digitação livre.
 *
 * Escolher numa lista trava a operação quando o local ainda não existe — era o
 * caso de uma instalação nova, com um único local cadastrado: não havia para
 * onde transferir. Aqui o operador digita o nome; os locais já cadastrados
 * aparecem como sugestão, e um nome novo é criado pelo backend junto com a
 * movimentação.
 *
 * Locais estruturais ficam fora das sugestões: eles organizam a árvore de
 * locais e não armazenam material.
 */
export function LocationInput({
  label,
  description,
  value,
  onChange,
  error,
  required = true
}: Readonly<{
  label: string;
  description?: string;
  value: string;
  /**
   * `record` vem preenchido quando o texto digitado corresponde a um local já
   * cadastrado - útil para consultar o saldo daquele local. Um nome novo ainda
   * não tem registro, e o saldo ali é zero de qualquer forma.
   */
  onChange: (value: string, record?: any) => void;
  error?: string;
  required?: boolean;
}>) {
  const locations = useQuery({
    queryKey: ['oab-location-suggestions'],
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.stock_location_list), {
        params: { structural: false, ordering: 'name', limit: 250 }
      });
      return response.data?.results ?? response.data ?? [];
    }
  });

  const options: string[] = useMemo(
    () => (locations.data ?? []).map((location: any) => location.name),
    [locations.data]
  );

  const aoDigitar = useCallback(
    (texto: string) => {
      const alvo = texto.trim().toLocaleLowerCase();

      const conhecido = (locations.data ?? []).find(
        (location: any) => String(location.name).toLocaleLowerCase() === alvo
      );

      onChange(texto, conhecido ?? null);
    },
    [locations.data, onChange]
  );

  return (
    <Autocomplete
      label={label}
      description={description}
      placeholder={t`Digite o nome do local`}
      required={required}
      data={options}
      value={value}
      onChange={aoDigitar}
      error={error}
      limit={8}
    />
  );
}
