import { BackgroundImage } from '@mantine/core';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { isDefaultInvenTreeAsset } from '../defaults/oab';
import { generateUrl } from '../functions/urls';
import { useServerApiState } from '../states/ServerApiState';
import { useUserState } from '../states/UserState';

/**
 * Render content within a "splash screen" container.
 */
export default function SplashScreen({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [server, fetchServerApiState] = useServerApiState(
    useShallow((state) => [state.server, state.fetchServerApiState])
  );
  const [checked_login] = useUserState(
    useShallow((state) => [state.login_checked])
  );

  // Fetch server data on mount if no server data is present
  useEffect(() => {
    if (server.server === null) {
      fetchServerApiState();
    }
  }, [server]);

  // Só exibimos uma imagem de fundo quando o administrador enviou uma:
  // a imagem padrão da plataforma não faz parte da identidade da OAB-MA.
  const splash = server.customize?.splash;

  if (!!splash && !isDefaultInvenTreeAsset(splash) && checked_login) {
    return (
      <BackgroundImage src={generateUrl(splash)}>{children}</BackgroundImage>
    );
  } else {
    return <>{children}</>;
  }
}
