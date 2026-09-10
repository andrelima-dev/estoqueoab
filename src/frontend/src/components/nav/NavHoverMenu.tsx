import { UnstyledButton } from '@mantine/core';

import { OabLogo } from '../items/OabLogo';

export function NavHoverMenu({
  openDrawer
}: Readonly<{
  openDrawer: () => void;
}>) {
  return (
    <UnstyledButton onClick={() => openDrawer()} aria-label='navigation-menu'>
      <OabLogo />
    </UnstyledButton>
  );
}
