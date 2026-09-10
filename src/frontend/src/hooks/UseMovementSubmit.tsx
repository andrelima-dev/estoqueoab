import type { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import { notifications } from '@mantine/notifications';
import { IconCircleCheck } from '@tabler/icons-react';
import { useCallback, useState } from 'react';

import { api } from '../App';

export type MovementErrors = Record<string, string[]>;

/**
 * Envia uma operação de estoque do almoxarifado (entrada, saída, transferência
 * ou ajuste) e trata a resposta.
 *
 * Erros de validação retornados pelo backend são devolvidos por campo, para que
 * a página possa exibi-los junto ao respectivo controle - o backend continua
 * sendo a autoridade sobre o que é permitido.
 */
export function useMovementSubmit({
  endpoint,
  successTitle
}: {
  endpoint: ApiEndpoints;
  successTitle: string;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<MovementErrors>({});

  const clearErrors = useCallback(() => setErrors({}), []);

  const submit = useCallback(
    async (payload: Record<string, any>): Promise<any | null> => {
      setLoading(true);
      setErrors({});

      try {
        const response = await api.post(apiUrl(endpoint), payload);

        notifications.show({
          title: successTitle,
          message: t`Operação registrada no histórico.`,
          color: 'green',
          icon: <IconCircleCheck />
        });

        return response.data;
      } catch (error: any) {
        const data = error?.response?.data;

        if (error?.response?.status === 400 && data) {
          setErrors(
            Object.fromEntries(
              Object.entries(data).map(([key, value]) => [
                key,
                Array.isArray(value) ? value.map(String) : [String(value)]
              ])
            )
          );

          notifications.show({
            title: t`Não foi possível concluir a operação`,
            message: t`Verifique os campos destacados.`,
            color: 'red'
          });
        } else if (error?.response?.status === 403) {
          notifications.show({
            title: t`Permissão negada`,
            message: t`Seu perfil não permite realizar esta operação.`,
            color: 'red'
          });
        } else {
          notifications.show({
            title: t`Erro ao registrar a operação`,
            message: t`Tente novamente. Se o problema persistir, contate o administrador.`,
            color: 'red'
          });
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, successTitle]
  );

  const fieldError = useCallback(
    (field: string): string | undefined => errors[field]?.join(' '),
    [errors]
  );

  return { submit, loading, errors, fieldError, clearErrors };
}
