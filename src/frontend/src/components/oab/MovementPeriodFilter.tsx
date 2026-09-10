import type { FilterSetState, TableFilter } from '@lib/types/Filters';
import { t } from '@lingui/core/macro';
import { Group, SegmentedControl } from '@mantine/core';
import { DateInput, type DateValue } from '@mantine/dates';
import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';

/**
 * Atalhos de período do histórico de movimentações.
 *
 * Escrevem nos mesmos filtros `min_date` / `max_date` da gaveta de filtros, em
 * vez de manter um estado próprio: assim existe uma única fonte de verdade — a
 * gaveta mostra o período ativo e limpar o filtro por lá desmarca o atalho.
 */

type Periodo = { valor: string; rotulo: string; dias: number };

/** Dias subtraídos de hoje. Contam o próprio dia: "7 dias" = hoje e os 6 anteriores. */
function periodos(): Periodo[] {
  return [
    { valor: 'hoje', rotulo: t`Hoje`, dias: 0 },
    { valor: '7d', rotulo: t`7 dias`, dias: 6 },
    { valor: '30d', rotulo: t`30 dias`, dias: 29 }
  ];
}

function inicioDe(dias: number): string {
  return dayjs().subtract(dias, 'day').format('YYYY-MM-DD');
}

function valorDe(filtros: TableFilter[], nome: string): string {
  return String(filtros.find((f) => f.name === nome)?.value ?? '');
}

export function MovementPeriodFilter({
  filterSet
}: Readonly<{ filterSet: FilterSetState }>) {
  const { activeFilters, setActiveFilters } = filterSet;

  const dataInicial = valorDe(activeFilters, 'min_date');
  const dataFinal = valorDe(activeFilters, 'max_date');

  const opcoes = useMemo(() => periodos(), []);

  const selecionado = useMemo(() => {
    if (!dataInicial && !dataFinal) {
      return 'tudo';
    }

    if (!dataFinal) {
      const atalho = opcoes.find((p) => inicioDe(p.dias) === dataInicial);

      if (atalho) {
        return atalho.valor;
      }
    }

    return 'personalizado';
  }, [dataInicial, dataFinal, opcoes]);

  /** Substitui as datas preservando os demais filtros ativos. */
  const definirDatas = useCallback(
    (inicial: string, final: string) => {
      const outros = activeFilters.filter(
        (f) => f.name !== 'min_date' && f.name !== 'max_date'
      );

      const datas: TableFilter[] = [];

      if (inicial) {
        datas.push({ name: 'min_date', value: inicial } as TableFilter);
      }

      if (final) {
        datas.push({ name: 'max_date', value: final } as TableFilter);
      }

      setActiveFilters([...outros, ...datas]);
    },
    [activeFilters, setActiveFilters]
  );

  const aplicarAtalho = useCallback(
    (valor: string) => {
      if (valor === 'tudo') {
        definirDatas('', '');
        return;
      }

      const atalho = opcoes.find((p) => p.valor === valor);

      if (atalho) {
        definirDatas(inicioDe(atalho.dias), '');
      }
    },
    [definirDatas, opcoes]
  );

  const comoTexto = useCallback(
    (valor: DateValue): string =>
      valor ? dayjs(valor.toString()).format('YYYY-MM-DD') : '',
    []
  );

  const dados = useMemo(() => {
    const base = [
      ...opcoes.map((p) => ({ value: p.valor, label: p.rotulo })),
      { value: 'tudo', label: t`Tudo` }
    ];

    // O segmento só aparece quando há um intervalo que não corresponde a um
    // atalho — sem ele o controle ficaria sem valor válido para exibir.
    if (selecionado === 'personalizado') {
      base.push({ value: 'personalizado', label: t`Personalizado` });
    }

    return base;
  }, [opcoes, selecionado]);

  return (
    <Group gap='sm' align='flex-end' wrap='wrap'>
      <SegmentedControl
        value={selecionado}
        onChange={aplicarAtalho}
        data={dados}
        size='sm'
        aria-label='filtro-periodo'
      />
      <DateInput
        label={t`De`}
        placeholder={t`Data inicial`}
        value={dataInicial || null}
        onChange={(valor: DateValue) =>
          definirDatas(comoTexto(valor), dataFinal)
        }
        clearable
        valueFormat='DD/MM/YYYY'
        size='sm'
        w={150}
        aria-label='periodo-data-inicial'
      />
      <DateInput
        label={t`Até`}
        placeholder={t`Data final`}
        value={dataFinal || null}
        onChange={(valor: DateValue) =>
          definirDatas(dataInicial, comoTexto(valor))
        }
        clearable
        valueFormat='DD/MM/YYYY'
        size='sm'
        w={150}
        aria-label='periodo-data-final'
      />
    </Group>
  );
}
