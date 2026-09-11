import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import {
  Button,
  Card,
  Divider,
  Grid,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text
} from '@mantine/core';
import { DateInput, type DateValue } from '@mantine/dates';
import { IconFileText } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';

import { api } from '../../App';
import { PageDetail } from '../../components/nav/PageDetail';
import PageTitle from '../../components/nav/PageTitle';
import {
  useMovementReport,
  useSpreadsheetExport
} from '../../components/oab/MovementDocuments';
import { useUserSettingsState } from '../../states/SettingsStates';
import { MaterialTable } from '../../tables/oab/MaterialTable';
import { MOVEMENT_TYPES, MovementTable } from '../../tables/oab/MovementTable';

/**
 * **Relatórios** do almoxarifado.
 *
 * A tela é um gerador: o operador escolhe o relatório, o período, os filtros e
 * o formato, vê a prévia do que vai sair e então gera o arquivo.
 *
 * O desenho anterior era o inverso — quatro abas de tabela, filtros escondidos
 * numa gaveta lateral e um ícone de download —, e obrigava a descobrir o
 * caminho antes de conseguir um relatório.
 */

type Tipo = 'movimentacoes' | 'entradas' | 'saidas' | 'estoque';

const TIPOS: { valor: Tipo; rotulo: string; movimentacao: boolean }[] = [
  { valor: 'movimentacoes', rotulo: 'Movimentações', movimentacao: true },
  { valor: 'entradas', rotulo: 'Entradas', movimentacao: true },
  { valor: 'saidas', rotulo: 'Saídas', movimentacao: true },
  { valor: 'estoque', rotulo: 'Estoque atual', movimentacao: false }
];

/** Dias subtraídos de hoje. Contam o próprio dia. */
const PERIODOS = [
  { valor: 'hoje', dias: 0 },
  { valor: '7d', dias: 6 },
  { valor: '30d', dias: 29 }
];

function inicioDe(dias: number): string {
  return dayjs().subtract(dias, 'day').format('YYYY-MM-DD');
}

export default function ReportsPage() {
  const [tipo, setTipo] = useState<Tipo>('movimentacoes');
  const [periodo, setPeriodo] = useState<string>('30d');
  const [de, setDe] = useState<string>('');
  const [ate, setAte] = useState<string>('');
  const [material, setMaterial] = useState<string | null>(null);
  const [setor, setSetor] = useState<string | null>(null);
  const [formato, setFormato] = useState<string>('pdf');

  const relatorioDeMovimentacao = useMemo(
    () => TIPOS.find((item) => item.valor === tipo)?.movimentacao ?? true,
    [tipo]
  );

  const formatoData =
    useUserSettingsState((estado) => estado.lookup?.DATE_DISPLAY_FORMAT) ||
    'DD-MM-YYYY';

  const materiais = useQuery({
    queryKey: ['oab-report-materials'],
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.part_list), {
        params: { ordering: 'name', limit: 500 }
      });
      return response.data?.results ?? response.data ?? [];
    }
  });

  const setores = useQuery({
    queryKey: ['oab-report-sectors'],
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.oab_sector_list), {
        params: { active: true, ordering: 'name', limit: 250 }
      });
      return response.data?.results ?? response.data ?? [];
    }
  });

  /** Filtros aplicados tanto à prévia quanto ao arquivo gerado. */
  const filtros = useMemo(() => {
    const consulta: Record<string, any> = {};

    if (!relatorioDeMovimentacao) {
      return consulta;
    }

    if (tipo === 'entradas') {
      consulta.movement_type = MOVEMENT_TYPES.IN;
    } else if (tipo === 'saidas') {
      consulta.movement_type = MOVEMENT_TYPES.OUT;
    }

    if (periodo === 'personalizado') {
      if (de) consulta.min_date = de;
      if (ate) consulta.max_date = ate;
    } else if (periodo !== 'tudo') {
      const atalho = PERIODOS.find((p) => p.valor === periodo);
      if (atalho) consulta.min_date = inicioDe(atalho.dias);
    }

    if (material) consulta.part = material;
    if (setor) consulta.sector = setor;

    return consulta;
  }, [relatorioDeMovimentacao, tipo, periodo, de, ate, material, setor]);

  const relatorio = useMovementReport(filtros);
  const planilha = useSpreadsheetExport();

  const gerar = useCallback(() => {
    if (formato === 'pdf') {
      relatorio.gerarRelatorio();
      return;
    }

    const url = relatorioDeMovimentacao
      ? ApiEndpoints.oab_movement_list
      : ApiEndpoints.part_list;

    planilha.exportar(url, filtros, formato);
  }, [formato, relatorio, planilha, relatorioDeMovimentacao, filtros]);

  // O PDF existe para movimentações; o estoque atual sai em planilha.
  const pdfDisponivel = relatorioDeMovimentacao && relatorio.disponivel;

  const comoTexto = useCallback(
    (valor: DateValue): string =>
      valor ? dayjs(valor.toString()).format('YYYY-MM-DD') : '',
    []
  );

  return (
    <>
      <PageTitle title={t`Relatórios`} />
      <PageDetail
        title={t`Relatórios`}
        subtitle={t`Escolha o relatório, confira a prévia e gere o arquivo`}
      />

      <Card withBorder radius='md' p='lg' mt='md'>
        <Stack gap='md'>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label={t`Relatório`}
                description={t`O que será listado`}
                data={TIPOS.map((item) => ({
                  value: item.valor,
                  label: item.rotulo
                }))}
                value={tipo}
                onChange={(valor) =>
                  setTipo((valor as Tipo) ?? 'movimentacoes')
                }
                allowDeselect={false}
              />
            </Grid.Col>

            {relatorioDeMovimentacao && (
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Text size='sm' fw={500}>{t`Período`}</Text>
                <Text size='xs' c='dimmed' mb={6}>
                  {t`Recorte de datas do relatório`}
                </Text>
                <SegmentedControl
                  value={periodo}
                  onChange={setPeriodo}
                  size='sm'
                  data={[
                    { value: 'hoje', label: t`Hoje` },
                    { value: '7d', label: t`7 dias` },
                    { value: '30d', label: t`30 dias` },
                    { value: 'tudo', label: t`Tudo` },
                    { value: 'personalizado', label: t`Escolher datas` }
                  ]}
                />
              </Grid.Col>
            )}

            {relatorioDeMovimentacao && periodo === 'personalizado' && (
              <>
                <Grid.Col span={{ base: 6, md: 3 }}>
                  <DateInput
                    label={t`De`}
                    value={de || null}
                    onChange={(valor) => setDe(comoTexto(valor))}
                    valueFormat={formatoData}
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}>
                  <DateInput
                    label={t`Até`}
                    value={ate || null}
                    onChange={(valor) => setAte(comoTexto(valor))}
                    valueFormat={formatoData}
                    clearable
                  />
                </Grid.Col>
              </>
            )}

            {relatorioDeMovimentacao && (
              <>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label={t`Material`}
                    description={t`Deixe em branco para todos`}
                    placeholder={t`Todos os materiais`}
                    searchable
                    clearable
                    data={(materiais.data ?? []).map((m: any) => ({
                      value: String(m.pk),
                      label: m.full_name ?? m.name
                    }))}
                    value={material}
                    onChange={setMaterial}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label={t`Setor de destino`}
                    description={t`Deixe em branco para todos`}
                    placeholder={t`Todos os setores`}
                    searchable
                    clearable
                    data={(setores.data ?? []).map((s: any) => ({
                      value: String(s.pk),
                      label: s.name
                    }))}
                    value={setor}
                    onChange={setSetor}
                  />
                </Grid.Col>
              </>
            )}

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label={t`Formato`}
                description={t`Como o arquivo será gerado`}
                data={[
                  {
                    value: 'pdf',
                    label: t`PDF (para imprimir e arquivar)`,
                    disabled: !pdfDisponivel
                  },
                  { value: 'xlsx', label: t`Excel (para planilha)` },
                  { value: 'csv', label: t`CSV` }
                ]}
                value={pdfDisponivel ? formato : 'xlsx'}
                onChange={(valor) => setFormato(valor ?? 'pdf')}
                allowDeselect={false}
              />
            </Grid.Col>
          </Grid>

          <Divider />

          <Group justify='space-between'>
            <Text size='sm' c='dimmed'>
              {relatorioDeMovimentacao
                ? t`A prévia abaixo mostra exatamente o que entrará no arquivo.`
                : t`O estoque atual sai em planilha; o PDF é dos relatórios de movimentação.`}
            </Text>
            <Button
              leftSection={<IconFileText size={16} />}
              loading={relatorio.gerando || planilha.exportando}
              onClick={gerar}
              size='md'
            >
              {t`Gerar relatório`}
            </Button>
          </Group>
        </Stack>
      </Card>

      <Stack gap='xs' mt='lg'>
        <Text fw={600}>{t`Prévia`}</Text>
        {relatorioDeMovimentacao ? (
          <MovementTable tableName='oab-report-preview' params={filtros} />
        ) : (
          <MaterialTable tableName='oab-report-stock' />
        )}
      </Stack>
    </>
  );
}
