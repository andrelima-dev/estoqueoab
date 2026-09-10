import { ActionIcon, Group, Text } from '@mantine/core';
import { type ReactNode, forwardRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import OabPlaceholder from '../../assets/oab-ma.svg';
import {
  OAB_ORGANIZATION,
  OAB_SYSTEM_SHORT_NAME,
  isDefaultInvenTreeAsset
} from '../../defaults/oab';
import { useServerApiState } from '../../states/ServerApiState';

/**
 * Logotipo da OAB-MA.
 *
 * Ordem de prioridade:
 *  1. Logotipo enviado pelo administrador (mecanismo nativo do servidor);
 *  2. Arquivo `src/assets/oab-ma.svg`, onde o logotipo oficial deve ser
 *     colocado - o arquivo atual é apenas um marcador neutro.
 */
export function OabLogo({
  height = 28
}: Readonly<{ height?: number }>): ReactNode {
  const [server] = useServerApiState(useShallow((state) => [state.server]));

  // O servidor devolve o logotipo padrão da plataforma quando nenhum foi
  // enviado - nesse caso usamos a marca da OAB-MA.
  const custom = server.customize?.logo;
  const source =
    server.server && !isDefaultInvenTreeAsset(custom) ? custom : OabPlaceholder;

  return <img src={source} alt={OAB_ORGANIZATION} height={height} />;
}

/**
 * Logotipo + nome do sistema, usado no cabeçalho da barra lateral.
 */
export function OabBrand({
  height = 32
}: Readonly<{ height?: number }>): ReactNode {
  return (
    <Group gap='sm' wrap='nowrap'>
      <OabLogo height={height} />
      <div>
        <Text fw={600} size='sm' lh={1.2}>
          {OAB_SYSTEM_SHORT_NAME}
        </Text>
        <Text size='xs' c='dimmed' lh={1.2}>
          {OAB_ORGANIZATION}
        </Text>
      </div>
    </Group>
  );
}

export const OabLogoHomeButton = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div ref={ref} {...props}>
      <NavLink to={'/'}>
        <ActionIcon size={28} variant='transparent' aria-label='inicio'>
          <OabLogo />
        </ActionIcon>
      </NavLink>
    </div>
  );
});
