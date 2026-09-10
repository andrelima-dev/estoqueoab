import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import { Autocomplete } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from '../../App';

/**
 * Campo de **Destino** de uma saída.
 *
 * É um campo de digitação livre: o operador escreve para onde o material foi
 * (um setor, uma comissão, um evento, uma pessoa). Os destinos já usados
 * aparecem como sugestão enquanto ele digita, e um destino novo passa a fazer
 * parte da lista - assim o histórico continua agrupável sem obrigar ninguém a
 * cadastrar setores antes de trabalhar.
 */
export function SectorInput({
  value,
  onChange,
  error
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
}>) {
  const sectors = useQuery({
    queryKey: ['oab-sector-suggestions'],
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.oab_sector_list), {
        params: { active: true, ordering: 'name', limit: 250 }
      });
      return response.data?.results ?? response.data ?? [];
    }
  });

  const options: string[] = useMemo(
    () => (sectors.data ?? []).map((sector: any) => sector.name),
    [sectors.data]
  );

  return (
    <Autocomplete
      label={t`Destino`}
      description={t`Setor, comissão, evento ou pessoa que recebeu o material`}
      placeholder={t`Digite o destino`}
      required
      data={options}
      value={value}
      onChange={onChange}
      error={error}
      limit={8}
    />
  );
}
