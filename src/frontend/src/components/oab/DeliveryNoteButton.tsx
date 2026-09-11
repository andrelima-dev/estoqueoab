import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { api } from '../../App';

/**
 * Emissão do **Termo de Entrega** de uma saída de material.
 *
 * O termo é o documento que acompanha a entrega: traz o material, a
 * quantidade, o destino e as duas assinaturas — quem recebeu e quem registrou.
 * É a peça que permite responsabilizar um terceiro pelo material retirado.
 *
 * O modelo do documento é instalado por `oab_setup`; se ele não estiver
 * presente, o botão não aparece, em vez de falhar ao ser acionado.
 */

const MODELO = 'stockmovement';

/** Modelos de relatório disponíveis para uma movimentação. */
export function useDeliveryNoteTemplate() {
  return useQuery({
    queryKey: ['oab-delivery-note-template'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await api.get(apiUrl('report/template/'), {
        params: { model_type: MODELO, enabled: true }
      });

      const modelos = response.data?.results ?? response.data ?? [];

      return modelos[0] ?? null;
    }
  });
}

export function useDeliveryNote() {
  const modelo = useDeliveryNoteTemplate();
  const [emitindo, setEmitindo] = useState<boolean>(false);

  const emitir = useCallback(
    async (movementId: number) => {
      if (!modelo.data?.pk) {
        return;
      }

      setEmitindo(true);

      try {
        const response = await api.post(apiUrl('report/print/'), {
          template: modelo.data.pk,
          items: [movementId]
        });

        const arquivo = response.data?.output;

        if (arquivo) {
          // Abre em outra aba: o termo é para conferir, imprimir e assinar.
          window.open(arquivo, '_blank', 'noopener,noreferrer');
        } else {
          notifications.show({
            title: t`Termo de entrega`,
            message: t`O documento não foi gerado`,
            color: 'red'
          });
        }
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
    [modelo.data]
  );

  return { emitir, emitindo, disponivel: !!modelo.data?.pk };
}
