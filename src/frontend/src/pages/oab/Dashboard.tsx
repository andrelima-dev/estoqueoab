import { ApiEndpoints } from '@lib/enums/ApiEndpoints';
import { UserRoles } from '@lib/enums/Roles';
import { apiUrl } from '@lib/functions/Api';
import { t } from '@lingui/core/macro';
import {
  Anchor,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconBoxSeam,
  IconCircleMinus,
  IconCirclePlus,
  IconPackages,
  IconTransfer
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../App';
import PageTitle from '../../components/nav/PageTitle';
import { formatDate } from '../../defaults/formatters';
import {
  OAB_COLOR_ENTRADA,
  OAB_COLOR_SAIDA,
  OAB_SYSTEM_NAME
} from '../../defaults/oab';
import * as classes from '../../main.css';
import { useUserState } from '../../states/UserState';
import { MovementTypeBadge } from '../../tables/oab/MovementTable';
import { StockSituationBadge } from '../../tables/oab/StockSituation';

function SummaryCard({
  label,
  value,
  icon,
  color,
  to
}: Readonly<{
  label: string;
  value: ReactNode;
  icon: ReactNode;
  color: string;
  to?: string;
}>) {
  const content = (
    <Card p='lg' pl='xl' h='100%' c={color} className={classes.kpiCard}>
      <Group justify='space-between' align='center' wrap='nowrap'>
        <Stack gap={6}>
          <Text c='dimmed' className={classes.kpiLabel}>
            {label}
          </Text>
          <Text c='var(--mantine-color-text)' className={classes.kpiValue}>
            {value}
          </Text>
        </Stack>
        <ThemeIcon variant='light' color={color} size={42} radius='md'>
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );

  return to ? (
    <Anchor component={Link} to={to} underline='never' c='inherit'>
      {content}
    </Anchor>
  ) : (
    content
  );
}

export default function OabDashboard() {
  const user = useUserState();
  const canMove = user.hasAddRole(UserRoles.stock);

  const summary = useQuery({
    queryKey: ['oab-summary'],
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.oab_summary));
      return response.data;
    }
  });

  const movements = useQuery({
    queryKey: ['oab-recent-movements'],
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.oab_movement_list), {
        params: { limit: 8, ordering: '-date' }
      });
      return response.data?.results ?? response.data ?? [];
    }
  });

  const lowStock = useQuery({
    queryKey: ['oab-low-stock'],
    queryFn: async () => {
      const response = await api.get(apiUrl(ApiEndpoints.part_list), {
        params: { low_stock: true, active: true, limit: 8, ordering: 'name' }
      });
      return response.data?.results ?? response.data ?? [];
    }
  });

  const data = summary.data ?? {};

  return (
    <Stack gap='lg'>
      <PageTitle title={t`Início`} />

      <Group justify='space-between' align='flex-end' wrap='wrap'>
        <div className={classes.pageHeading}>
          <Title order={2}>{t`Painel do Almoxarifado`}</Title>
          <Text size='sm' c='dimmed'>
            {OAB_SYSTEM_NAME}
          </Text>
        </div>

        {canMove && (
          <Group gap='sm'>
            <Button
              component={Link}
              to='/movimentacoes/entrada'
              color={OAB_COLOR_ENTRADA}
              size='md'
              leftSection={<IconCirclePlus size={20} />}
            >
              {t`Nova Entrada`}
            </Button>
            <Button
              component={Link}
              to='/movimentacoes/saida'
              color={OAB_COLOR_SAIDA}
              size='md'
              leftSection={<IconCircleMinus size={20} />}
            >
              {t`Nova Saída`}
            </Button>
            <Button
              component={Link}
              to='/movimentacoes/transferencia'
              variant='default'
              size='md'
              leftSection={<IconTransfer size={20} />}
            >
              {t`Transferir`}
            </Button>
          </Group>
        )}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing='md'>
        <SummaryCard
          label={t`Materiais cadastrados`}
          value={
            summary.isLoading ? <Loader size='sm' /> : (data.materials ?? 0)
          }
          icon={<IconBoxSeam />}
          color='oabBlue'
          to='/materiais'
        />
        <SummaryCard
          label={t`Quantidade em estoque`}
          value={
            summary.isLoading ? (
              <Loader size='sm' />
            ) : (
              (data.total_quantity ?? 0)
            )
          }
          icon={<IconPackages />}
          color='oabBlue'
          to='/estoque/atual'
        />
        <SummaryCard
          label={t`Entradas hoje`}
          value={
            summary.isLoading ? <Loader size='sm' /> : (data.entries_today ?? 0)
          }
          icon={<IconArrowDown />}
          color={OAB_COLOR_ENTRADA}
          to='/movimentacoes/historico'
        />
        <SummaryCard
          label={t`Saídas hoje`}
          value={
            summary.isLoading ? <Loader size='sm' /> : (data.issues_today ?? 0)
          }
          icon={<IconArrowUp />}
          color={OAB_COLOR_SAIDA}
          to='/movimentacoes/historico'
        />
        <SummaryCard
          label={t`Estoque baixo`}
          value={
            summary.isLoading ? (
              <Loader size='sm' />
            ) : (
              (data.low_stock ?? 0) + (data.out_of_stock ?? 0)
            )
          }
          icon={<IconAlertTriangle />}
          color={OAB_COLOR_SAIDA}
          to='/materiais?low_stock=true'
        />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card withBorder radius='md' p='md' h='100%'>
            <Group justify='space-between' mb='sm'>
              <Title order={5}>{t`Movimentações recentes`}</Title>
              <Anchor component={Link} to='/movimentacoes/historico' size='sm'>
                {t`Ver histórico`}
              </Anchor>
            </Group>

            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing='xs' highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t`Data`}</Table.Th>
                    <Table.Th>{t`Material`}</Table.Th>
                    <Table.Th>{t`Operação`}</Table.Th>
                    <Table.Th ta='right'>{t`Quantidade`}</Table.Th>
                    <Table.Th>{t`Responsável`}</Table.Th>
                    <Table.Th>{t`Destino / Origem`}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(movements.data ?? []).map((record: any) => (
                    <Table.Tr key={record.pk}>
                      <Table.Td>
                        <Text size='xs'>
                          {formatDate(record.date, { showTime: true })}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {record.part_detail?.name ?? record.part_name}
                      </Table.Td>
                      <Table.Td>
                        <MovementTypeBadge value={record.movement_type} />
                      </Table.Td>
                      <Table.Td ta='right'>{Number(record.quantity)}</Table.Td>
                      <Table.Td>
                        {record.handler || record.user_detail?.username || '-'}
                      </Table.Td>
                      <Table.Td>
                        {record.sector_detail?.name ??
                          record.location_to_detail?.name ??
                          record.location_from_detail?.name ??
                          record.source ??
                          '-'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {!movements.isLoading &&
                    (movements.data ?? []).length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text size='sm' c='dimmed' ta='center'>
                            {t`Nenhuma movimentação registrada`}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card withBorder radius='md' p='md' h='100%'>
            <Group justify='space-between' mb='sm'>
              <Title order={5}>{t`Materiais com estoque baixo`}</Title>
              <Anchor component={Link} to='/materiais' size='sm'>
                {t`Ver materiais`}
              </Anchor>
            </Group>

            <Table.ScrollContainer minWidth={420}>
              <Table verticalSpacing='xs' highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t`Material`}</Table.Th>
                    <Table.Th ta='right'>{t`Atual`}</Table.Th>
                    <Table.Th ta='right'>{t`Mínimo`}</Table.Th>
                    <Table.Th>{t`Situação`}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(lowStock.data ?? []).map((record: any) => (
                    <Table.Tr key={record.pk}>
                      <Table.Td>{record.name}</Table.Td>
                      <Table.Td ta='right'>
                        {record.total_in_stock ?? 0}
                      </Table.Td>
                      <Table.Td ta='right'>
                        {record.minimum_stock ?? 0}
                      </Table.Td>
                      <Table.Td>
                        <StockSituationBadge record={record} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {!lowStock.isLoading &&
                    (lowStock.data ?? []).length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text size='sm' c='dimmed' ta='center'>
                            {t`Nenhum material com estoque baixo`}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
