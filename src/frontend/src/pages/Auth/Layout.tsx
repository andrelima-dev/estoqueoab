import { StylishText } from '@lib/components/StylishText';
import { Trans } from '@lingui/react/macro';
import {
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text
} from '@mantine/core';
import { Outlet, useNavigate } from 'react-router-dom';
import SplashScreen from '../../components/SplashScreen';
import { OabLogo } from '../../components/items/OabLogo';
import { OAB_LOGIN_SUBTITLE, OAB_ORGANIZATION } from '../../defaults/oab';
import { doLogout } from '../../functions/auth';

export default function LoginLayoutComponent() {
  return (
    <SplashScreen>
      <Center mih='100vh' p='lg'>
        <Container>
          <Stack align='center' gap='lg'>
            <Stack align='center' gap={4}>
              <OabLogo height={64} />
              <StylishText size='xl'>{OAB_ORGANIZATION}</StylishText>
              <Text size='sm' c='dimmed'>
                {OAB_LOGIN_SUBTITLE}
              </Text>
            </Stack>
            <Outlet />
          </Stack>
        </Container>
      </Center>
    </SplashScreen>
  );
}

export function Wrapper({
  children,
  titleText,
  logOff = false,
  loader = false,
  smallPadding = false
}: Readonly<{
  children?: React.ReactNode;
  titleText: string;
  logOff?: boolean;
  loader?: boolean;
  smallPadding?: boolean;
}>) {
  const navigate = useNavigate();

  return (
    <Paper p='xl' withBorder miw={425} shadow='lg'>
      <Stack gap={smallPadding ? 0 : 'md'}>
        <StylishText size='xl'>{titleText}</StylishText>
        <Divider p='xs' />
        {loader && (
          <Group justify='center'>
            <Loader />
          </Group>
        )}
        {children}
        {logOff && (
          <>
            <Divider p='xs' />
            <Button onClick={() => doLogout(navigate)} color='red'>
              <Trans>Log off</Trans>
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
