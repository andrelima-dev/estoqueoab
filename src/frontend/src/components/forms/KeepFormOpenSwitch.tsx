import { t } from '@lingui/core/macro';
import { Switch } from '@mantine/core';
import { useEffect, useState } from 'react';

export function KeepFormOpenSwitch({
  onChange
}: {
  onChange?: (v: boolean) => void;
}) {
  const [keepOpen, setKeepOpen] = useState(false);

  useEffect(() => {
    onChange?.(keepOpen);
  }, [keepOpen]);

  return (
    <Switch
      checked={keepOpen}
      radius='lg'
      size='sm'
      label={t`Manter o formulário aberto`}
      description={t`Continuar no formulário depois de salvar, para cadastrar outro`}
      onChange={(e) => setKeepOpen(e.currentTarget.checked)}
    />
  );
}
