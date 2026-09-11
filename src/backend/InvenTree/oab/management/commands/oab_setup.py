"""Configuração inicial do sistema de estoque da OAB-MA.

Cria (de forma idempotente) os perfis de acesso, as unidades de medida usadas
por um almoxarifado brasileiro e, opcionalmente, uma lista inicial de setores.

Uso::

    python manage.py oab_setup
    python manage.py oab_setup --with-sectors
"""

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand
from django.db import transaction

from common.models import CustomUnit
from common.settings import set_global_setting
from oab.models import Sector
from users.models import RuleSet
from users.ruleset import RuleSetEnum

# Nome institucional exibido na interface e no título do navegador.
INSTANCE_NAME = 'Estoque OAB-MA'

# Moeda da instituição. O padrão do InvenTree não inclui o Real, então o
# seletor de moeda aparece sem a opção brasileira até que a lista de moedas
# suportadas seja redefinida. USD e EUR permanecem para material importado.
# Formato de data brasileiro (dia-mês-ano).
DATE_FORMAT = 'DD-MM-YYYY'

DEFAULT_CURRENCY = 'BRL'
CURRENCY_CODES = 'BRL,USD,EUR'

# Perfis de acesso do almoxarifado.
# Cada entrada mapeia um ruleset nativo do InvenTree para as permissões do perfil.
PROFILES: dict[str, dict[str, str]] = {
    'Administrador': {
        RuleSetEnum.ADMIN: 'vacd',
        RuleSetEnum.PART_CATEGORY: 'vacd',
        RuleSetEnum.PART: 'vacd',
        RuleSetEnum.STOCK_LOCATION: 'vacd',
        RuleSetEnum.STOCK: 'vacd',
    },
    'Almoxarifado': {
        RuleSetEnum.PART_CATEGORY: 'va',
        RuleSetEnum.PART: 'vac',
        RuleSetEnum.STOCK_LOCATION: 'vac',
        RuleSetEnum.STOCK: 'vac',
    },
    'Consulta': {
        RuleSetEnum.PART_CATEGORY: 'v',
        RuleSetEnum.PART: 'v',
        RuleSetEnum.STOCK_LOCATION: 'v',
        RuleSetEnum.STOCK: 'v',
    },
}

# Unidades de medida comuns em almoxarifados (definições no formato do pint).
UNITS: list[tuple[str, str, str]] = [
    ('unidade', '1 * count', 'un'),
    ('caixa', '1 * count', 'cx'),
    ('pacote', '1 * count', 'pct'),
    ('resma', '500 * count', 'rsm'),
    ('rolo', '1 * count', 'rl'),
    ('fardo', '1 * count', 'fd'),
    ('bloco', '1 * count', 'bl'),
    ('par', '2 * count', 'par'),
    ('duzia', '12 * count', 'dz'),
]

# Sugestões iniciais de setores - todas editáveis pela interface.
SECTORS: list[tuple[str, str]] = [
    ('Presidência', 'PRES'),
    ('Secretaria', 'SEC'),
    ('Financeiro', 'FIN'),
    ('Tecnologia da Informação', 'TI'),
    ('Comunicação', 'COM'),
    ('Eventos', 'EVE'),
    ('Comissões', 'CMS'),
    ('Jurídico', 'JUR'),
    ('Recursos Humanos', 'RH'),
    ('Almoxarifado', 'ALM'),
    ('Outros', ''),
]


class Command(BaseCommand):
    """Prepara a instância para uso pela OAB-MA."""

    help = 'Cria os perfis de acesso, unidades de medida e setores da OAB-MA'

    def add_arguments(self, parser):
        """Argumentos do comando."""
        parser.add_argument(
            '--with-sectors',
            action='store_true',
            help='Também cadastra a lista inicial de setores sugeridos',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Executa a configuração inicial."""
        self.apply_branding()
        self.apply_date_format()
        self.apply_currency()
        self.apply_stock_policy()
        self.create_profiles()
        self.create_units()

        if options['with_sectors']:
            self.create_sectors()

        self.stdout.write(self.style.SUCCESS('Configuração da OAB-MA concluída.'))

    def apply_branding(self):
        """Define o nome institucional apresentado na interface."""
        set_global_setting('INVENTREE_INSTANCE', INSTANCE_NAME)
        set_global_setting('INVENTREE_INSTANCE_TITLE', True)

        # Faixas de aviso da plataforma: ruido para o operador do almoxarifado,
        # que nao decide nada a respeito de privilegios elevados.
        set_global_setting('INVENTREE_SHOW_SUPERUSER_BANNER', False)
        set_global_setting('INVENTREE_SHOW_ADMIN_BANNER', False)

        self.stdout.write(f'Nome da instância definido como: {INSTANCE_NAME}')

    def apply_date_format(self):
        """Aplica o formato de data brasileiro aos usuários já cadastrados.

        O formato é uma preferência de cada usuário. Alterar o padrão atende
        quem for criado daqui em diante; quem já existe mantém o valor antigo
        até ser atualizado aqui.
        """
        from common.models import InvenTreeUserSetting

        for user in User.objects.all():
            InvenTreeUserSetting.set_setting(
                'DATE_DISPLAY_FORMAT', DATE_FORMAT, None, user=user
            )

        self.stdout.write(f'Formato de data aplicado: {DATE_FORMAT}')

    def apply_currency(self):
        """Define o Real como moeda da instituição.

        A lista de moedas suportadas MUST ser gravada antes da moeda padrão:
        as opções de ``INVENTREE_DEFAULT_CURRENCY`` são derivadas de
        ``CURRENCY_CODES``, e o Real não consta no padrão do InvenTree.
        """
        set_global_setting('CURRENCY_CODES', CURRENCY_CODES)
        set_global_setting('INVENTREE_DEFAULT_CURRENCY', DEFAULT_CURRENCY)

        self.stdout.write(f'Moeda padrão definida como: {DEFAULT_CURRENCY}')

    def apply_stock_policy(self):
        """Ajusta as regras de estoque para um almoxarifado institucional.

        Por padrão o InvenTree *apaga* um item de estoque quando ele chega a
        zero. Num almoxarifado isso quebra a rastreabilidade: o histórico perde
        o vínculo com o item movimentado. Mantemos o item com saldo zero.
        """
        set_global_setting('STOCK_DELETE_DEPLETED_DEFAULT', False)

        self.stdout.write('Itens de estoque zerados serão preservados (sem exclusão)')

    def create_profiles(self):
        """Cria os grupos de usuários e respectivas permissões."""
        flags = {'v': 'can_view', 'a': 'can_add', 'c': 'can_change', 'd': 'can_delete'}

        for name, rulesets in PROFILES.items():
            group, created = Group.objects.get_or_create(name=name)

            for ruleset_name, permissions in rulesets.items():
                rule, _created = RuleSet.objects.get_or_create(
                    group=group, name=ruleset_name
                )

                for flag, field in flags.items():
                    setattr(rule, field, flag in permissions)

                rule.save()

            # Reaplica as permissões do django para o grupo
            group.save()

            self.stdout.write(
                f'{"Criado" if created else "Atualizado"} perfil de acesso: {name}'
            )

    def create_units(self):
        """Cria as unidades de medida do almoxarifado."""
        for name, definition, symbol in UNITS:
            if CustomUnit.objects.filter(name=name).exists():
                continue

            unit = CustomUnit(name=name, definition=definition, symbol=symbol)

            try:
                unit.full_clean()
                unit.save()
                self.stdout.write(f'Criada unidade de medida: {name}')
            except Exception as exc:  # pragma: no cover
                self.stderr.write(f'Falha ao criar a unidade "{name}": {exc}')

    def create_sectors(self):
        """Cria a lista inicial de setores (apenas se ainda não existirem)."""
        for name, code in SECTORS:
            _sector, created = Sector.objects.get_or_create(
                name=name, defaults={'code': code}
            )

            if created:
                self.stdout.write(f'Criado setor: {name}')
