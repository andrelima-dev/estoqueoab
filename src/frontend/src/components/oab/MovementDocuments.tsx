import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { api } from '../../App';

/**
 * Documentos em PDF gerados a partir das movimentações.
 *
 * O termo é o documento que acompanha a entrega: traz o material, a
 * quantidade, o destino e as duas assinaturas — quem recebeu e quem registrou.
 * É a peça que permite responsabilizar um terceiro pelo material retirado.
 *
 * O modelo do documento é instalado por `oab_setup`; se ele não estiver
 * presente, o botão não aparece, em vez de falhar ao ser acionado.
 */

const MODELO = 'stockmovement';

const TERMO = 'Termo de Entrega';
const RELATORIO = 'Relatório de Movimentações';

/** Modelos de documento instalados para movimentações. */
function useTemplates() {
  return useQuery({
    queryKey: ['oab-movement-templates'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await api.get(apiUrl('report/template/'), {
        params: { model_type: MODELO, enabled: true }
      });

      return response.data?.results ?? response.data ?? [];
    }
  });
}

function acharModelo(modelos: any[], prefixo: string) {
  return modelos?.find((m: any) => String(m.name).startsWith(prefixo)) ?? null;
}

/** Dispara a geração de um documento e abre o PDF resultante. */
async function gerar(templateId: number, items: number[]) {
  const response = await api.post(apiUrl('report/print/'), {
    template: templateId,
    items: items
  });

  const arquivo = response.data?.output;

  if (!arquivo) {
    throw new Error('sem arquivo');
  }

  // Abre em outra aba: o documento é para conferir, imprimir e arquivar.
  window.open(arquivo, '_blank', 'noopener,noreferrer');
}

/** Termo de entrega de uma saída. */
export function useDeliveryNote() {
  const modelos = useTemplates();
  const [emitindo, setEmitindo] = useState<boolean>(false);

  const modelo = acharModelo(modelos.data, TERMO);

  const emitir = useCallback(
    async (movementId: number) => {
      if (!modelo?.pk) {
        return;
      }

      setEmitindo(true);

      try {
        await gerar(modelo.pk, [movementId]);
      } catch (_error) {
        notifications.show({
          title: t`Termo de entrega`,
          message: t`Não foi possível gerar o documento`,
          color: 'red'
        });
      } finally {
        setEmitindo(false);
      }
    },
    [modelo]
  );

  return { emitir, emitindo, disponivel: !!modelo?.pk };
}

/**
 * Relatório do período, com as movimentações que estão sendo exibidas.
 *
 * Os itens são buscados com os mesmos filtros da tabela, e não apenas os da
 * página aberta: o relatório precisa cobrir o período inteiro que o operador
 * escolheu, não os vinte registros visíveis.
 */
export function useMovementReport(filtros: Record<string, any>) {
  const modelos = useTemplates();
  const [gerando, setGerando] = useState<boolean>(false);

  const modelo = acharModelo(modelos.data, RELATORIO);

  const gerarRelatorio = useCallback(async () => {
    if (!modelo?.pk) {
      return;
    }

    setGerando(true);

    try {
      const lista = await api.get(apiUrl(ApiEndpoints.oab_movement_list), {
        params: { ...filtros, limit: 1000, ordering: '-date' }
      });

      const itens = lista.data?.results ?? lista.data ?? [];
      const ids = itens.map((m: any) => m.pk);

      if (ids.length === 0) {
        notifications.show({
          title: t`Relatório de movimentações`,
          message: t`Nenhuma movimentação no período selecionado`,
          color: 'orange'
        });
        return;
      }

      await gerar(modelo.pk, ids);
    } catch (_error) {
      notifications.show({
        title: t`Relatório de movimentações`,
        message: t`Não foi possível gerar o relatório`,
        color: 'red'
      });
    } finally {
      setGerando(false);
    }
  }, [modelo, filtros]);

  return { gerarRelatorio, gerando, disponivel: !!modelo?.pk };
}

/**
 * Exportação para planilha a partir de um conjunto de filtros.
 *
 * O mecanismo nativo é ligado a uma tabela; aqui os filtros vêm do formulário
 * de relatório, para que o arquivo saia com o mesmo recorte da prévia.
 */
export function useSpreadsheetExport() {
  const [exportando, setExportando] = useState<boolean>(false);

  const exportar = useCallback(
    async (url: string, filtros: Record<string, any>, formato: string) => {
      setExportando(true);

      try {
        const response = await api.get(apiUrl(url), {
          params: {
            ...filtros,
            export: true,
            export_plugin: 'inventree-exporter',
            export_format: formato
          }
        });

        const arquivo = response.data?.output;

        if (arquivo) {
          window.open(arquivo, '_blank', 'noopener,noreferrer');
        } else {
          notifications.show({
            title: t`Exportação`,
            message: t`O arquivo não foi gerado`,
            color: 'red'
          });
        }
      } catch (_error) {
        notifications.show({
          title: t`Exportação`,
          message: t`Não foi possível exportar o resultado`,
          color: 'red'
        });
      } finally {
        setExportando(false);
      }
    },
    []
  );

  return { exportar, exportando };
}
