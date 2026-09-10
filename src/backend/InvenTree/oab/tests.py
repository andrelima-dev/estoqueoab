"""Testes das operações de almoxarifado da OAB-MA."""

from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse

from common.settings import get_global_setting
from InvenTree.unit_test import InvenTreeAPITestCase
from part.models import Part, PartCategory
from stock.models import StockItem, StockItemTracking, StockLocation

from . import helpers
from .models import MovementType, Sector, StockMovement


class OabTestBase(InvenTreeAPITestCase):
    """Dados de base compartilhados pelos testes do almoxarifado."""

    roles = ['stock.view', 'stock.add', 'stock.change', 'part.view']

    @classmethod
    def setUpTestData(cls):
        """Cria material, locais e setor de teste."""
        super().setUpTestData()

        call_command('oab_setup')

        cls.category = PartCategory.objects.create(
            name='Material de Escritório', description='Materiais administrativos'
        )

        cls.material = Part.objects.create(
            name='Papel A4 75g',
            description='Resma com 500 folhas',
            category=cls.category,
            units='resma',
            minimum_stock=20,
        )

        cls.almoxarifado = StockLocation.objects.create(
            name='Almoxarifado Central', description='Almoxarifado da sede'
        )

        cls.prateleira = StockLocation.objects.create(
            name='Prateleira A', parent=cls.almoxarifado
        )

        cls.setor = Sector.objects.create(name='Tecnologia da Informação', code='TI')

    def entrada(self, quantity=50, **kwargs):
        """Registra uma entrada de material."""
        data = {
            'part': self.material.pk,
            'quantity': quantity,
            'location': self.almoxarifado.pk,
            **kwargs,
        }

        return self.post(reverse('api-oab-entry'), data, expected_code=201)


class StockEntryTest(OabTestBase):
    """Entrada de material."""

    def test_entry_creates_stock_and_movement(self):
        """Uma entrada deve criar saldo e registro auditável."""
        self.entrada(50, document='NF 002193', source='Fornecedor XYZ', handler='João')

        self.assertEqual(helpers.available_quantity(self.material), 50)

        movement = StockMovement.objects.get()

        self.assertEqual(movement.movement_type, MovementType.ENTRADA)
        self.assertEqual(movement.quantity, 50)
        self.assertEqual(movement.quantity_before, 0)
        self.assertEqual(movement.quantity_after, 50)
        self.assertEqual(movement.location_to, self.almoxarifado)
        self.assertEqual(movement.document, 'NF 002193')
        self.assertEqual(movement.handler, 'João')
        self.assertEqual(movement.user, self.user)
        self.assertIsNotNone(movement.tracking)

    def test_entry_reuses_existing_stock_item(self):
        """Entradas sucessivas no mesmo local não multiplicam itens de estoque."""
        self.entrada(10)
        self.entrada(15)

        self.assertEqual(helpers.available_quantity(self.material), 25)
        self.assertEqual(helpers.available_items(self.material).count(), 1)

    def test_entry_rejects_structural_location(self):
        """Locais estruturais não podem receber materiais."""
        self.almoxarifado.structural = True
        self.almoxarifado.save()

        self.post(
            reverse('api-oab-entry'),
            {'part': self.material.pk, 'quantity': 5, 'location': self.almoxarifado.pk},
            expected_code=400,
        )


class StockIssueTest(OabTestBase):
    """Saída de material."""

    def test_issue_reduces_stock(self):
        """A saída deve reduzir o saldo e registrar o setor de destino."""
        self.entrada(50)

        self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 5,
                'location': self.almoxarifado.pk,
                'sector': self.setor.pk,
                'requester': 'Maria Silva',
                'handler': 'Carlos Santos',
            },
            expected_code=201,
        )

        self.assertEqual(helpers.available_quantity(self.material), 45)

        movement = StockMovement.objects.get(movement_type=MovementType.SAIDA)

        self.assertEqual(movement.quantity_before, 50)
        self.assertEqual(movement.quantity_after, 45)
        self.assertEqual(movement.sector, self.setor)
        self.assertEqual(movement.requester, 'Maria Silva')
        self.assertEqual(movement.handler, 'Carlos Santos')
        self.assertEqual(movement.location_from, self.almoxarifado)

    def test_issue_above_available_is_rejected(self):
        """O backend deve impedir saída superior ao disponível."""
        self.entrada(10)

        response = self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 25,
                'location': self.almoxarifado.pk,
                'sector': self.setor.pk,
                'handler': 'Carlos Santos',
            },
            expected_code=400,
        )

        self.assertIn('quantity', response.data)
        self.assertEqual(helpers.available_quantity(self.material), 10)

    def test_issue_requires_destination(self):
        """O destino é obrigatório."""
        self.entrada(10)

        self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 1,
                'location': self.almoxarifado.pk,
                'handler': 'Carlos Santos',
            },
            expected_code=400,
        )

    def test_issue_requires_handler(self):
        """Toda saída precisa dizer a quem o material foi entregue.

        É o que permite responsabilizar quem retirou, mesmo que apenas duas
        pessoas tenham acesso ao sistema.
        """
        self.entrada(10)

        response = self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 1,
                'location': self.almoxarifado.pk,
                'sector': self.setor.pk,
            },
            expected_code=400,
        )

        self.assertIn('handler', response.data)

    def test_issue_accepts_typed_destination(self):
        """O destino pode ser digitado; um destino novo entra no cadastro."""
        self.entrada(10)

        self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 2,
                'location': self.almoxarifado.pk,
                'sector_name': 'Comissão da Jovem Advocacia',
                'handler': 'Carlos Santos',
            },
            expected_code=201,
        )

        setor = Sector.objects.get(name='Comissão da Jovem Advocacia')
        movement = StockMovement.objects.get(movement_type=MovementType.SAIDA)
        self.assertEqual(movement.sector, setor)

    def test_typed_destination_reuses_existing_sector(self):
        """Digitar um destino já conhecido não duplica o cadastro."""
        self.entrada(10)

        total_before = Sector.objects.count()

        self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 1,
                'location': self.almoxarifado.pk,
                # mesmo setor de teste, com outra caixa e espaços em volta
                'sector_name': '  tecnologia da informação  ',
                'handler': 'Carlos Santos',
            },
            expected_code=201,
        )

        self.assertEqual(Sector.objects.count(), total_before)

        movement = StockMovement.objects.get(movement_type=MovementType.SAIDA)
        self.assertEqual(movement.sector, self.setor)

    def test_failed_issue_does_not_create_sector(self):
        """Uma saída rejeitada não pode deixar um destino órfão no cadastro."""
        self.entrada(1)

        total_before = Sector.objects.count()

        self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 999,
                'location': self.almoxarifado.pk,
                'sector_name': 'Setor Inexistente',
                'handler': 'Carlos Santos',
            },
            expected_code=400,
        )

        self.assertEqual(Sector.objects.count(), total_before)

    def test_system_user_is_distinct_from_handler(self):
        """Quem registra a operação e quem retira o material são diferentes."""
        self.entrada(10)

        self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 1,
                'location': self.almoxarifado.pk,
                'sector': self.setor.pk,
                'requester': 'Maria Silva',
                'handler': 'Carlos Santos',
            },
            expected_code=201,
        )

        movement = StockMovement.objects.get(movement_type=MovementType.SAIDA)

        # o usuário do sistema é o que está autenticado...
        self.assertEqual(movement.user, self.user)
        # ...e o responsável pela retirada é o terceiro informado
        self.assertEqual(movement.handler, 'Carlos Santos')
        self.assertEqual(movement.requester, 'Maria Silva')
        self.assertNotEqual(movement.handler, movement.user.username)


class StockTransferTest(OabTestBase):
    """Transferência entre locais."""

    def test_transfer_moves_stock(self):
        """A transferência move o saldo sem alterar o total."""
        self.entrada(50)

        self.post(
            reverse('api-oab-transfer'),
            {
                'part': self.material.pk,
                'quantity': 10,
                'location_from': self.almoxarifado.pk,
                'location_to': self.prateleira.pk,
            },
            expected_code=201,
        )

        self.assertEqual(helpers.available_quantity(self.material), 50)
        self.assertEqual(
            helpers.available_quantity(self.material, self.prateleira, False), 10
        )

        movement = StockMovement.objects.get(movement_type=MovementType.TRANSFERENCIA)

        self.assertEqual(movement.quantity_before, movement.quantity_after)
        self.assertEqual(movement.location_from, self.almoxarifado)
        self.assertEqual(movement.location_to, self.prateleira)

    def test_transfer_requires_distinct_locations(self):
        """Origem e destino devem ser diferentes."""
        self.entrada(10)

        self.post(
            reverse('api-oab-transfer'),
            {
                'part': self.material.pk,
                'quantity': 1,
                'location_from': self.almoxarifado.pk,
                'location_to': self.almoxarifado.pk,
            },
            expected_code=400,
        )


class MovementHistoryTest(OabTestBase):
    """Histórico e indicadores."""

    def test_history_is_read_only(self):
        """O histórico não pode ser alterado nem apagado via API."""
        self.entrada(10)

        movement = StockMovement.objects.get()
        url = reverse('api-oab-movement-detail', kwargs={'pk': movement.pk})

        self.get(url, expected_code=200)
        self.delete(url, expected_code=405)
        self.patch(url, {'quantity': 999}, expected_code=405)

    def test_history_filters(self):
        """O histórico pode ser filtrado por tipo de movimentação."""
        self.entrada(10)

        url = reverse('api-oab-movement-list')

        response = self.get(url, {'movement_type': MovementType.ENTRADA})
        self.assertEqual(len(response.data), 1)

        response = self.get(url, {'movement_type': MovementType.SAIDA})
        self.assertEqual(len(response.data), 0)

    def test_summary(self):
        """Os indicadores do painel refletem as movimentações do dia."""
        self.entrada(10)

        response = self.get(reverse('api-oab-summary'), expected_code=200)

        self.assertEqual(response.data['materials'], 1)
        self.assertEqual(response.data['total_quantity'], 10)
        self.assertEqual(response.data['entries_today'], 1)
        self.assertEqual(response.data['issues_today'], 0)
        # 10 unidades para um estoque mínimo de 20
        self.assertEqual(response.data['low_stock'], 1)


class ReadOnlyUserTest(OabTestBase):
    """Perfil "Consulta": não pode alterar estoque, nem mesmo pela API."""

    roles = ['stock.view', 'part.view']

    def test_cannot_move_stock(self):
        """Operações de estoque devem ser rejeitadas pelo backend."""
        payload = {
            'part': self.material.pk,
            'quantity': 5,
            'location': self.almoxarifado.pk,
        }

        self.post(reverse('api-oab-entry'), payload, expected_code=403)
        self.post(
            reverse('api-oab-issue'),
            {**payload, 'sector': self.setor.pk, 'handler': 'Carlos Santos'},
            expected_code=403,
        )
        self.post(
            reverse('api-oab-transfer'),
            {
                'part': self.material.pk,
                'quantity': 5,
                'location_from': self.almoxarifado.pk,
                'location_to': self.prateleira.pk,
            },
            expected_code=403,
        )

    def test_can_read_history(self):
        """A consulta ao histórico continua permitida."""
        self.get(reverse('api-oab-movement-list'), expected_code=200)


class SetupCommandTest(OabTestBase):
    """Comando de configuração inicial."""

    def test_instance_is_branded(self):
        """O nome institucional deve ser aplicado à instância."""
        self.assertEqual(get_global_setting('INVENTREE_INSTANCE'), 'Estoque OAB-MA')

    def test_profiles_are_created(self):
        """Os três perfis de acesso devem existir com as permissões corretas."""
        for name in ['Administrador', 'Almoxarifado', 'Consulta']:
            self.assertTrue(Group.objects.filter(name=name).exists())

        consulta = Group.objects.get(name='Consulta')
        stock_rule = consulta.rule_sets.get(name='stock')

        self.assertTrue(stock_rule.can_view)
        self.assertFalse(stock_rule.can_add)
        self.assertFalse(stock_rule.can_change)
        self.assertFalse(stock_rule.can_delete)

        almox = Group.objects.get(name='Almoxarifado')
        self.assertTrue(almox.rule_sets.get(name='stock').can_add)
        self.assertFalse(almox.rule_sets.get(name='admin').can_view)

    def test_depleted_stock_is_preserved(self):
        """Itens zerados não podem ser apagados: o histórico perderia o vínculo."""
        self.assertFalse(get_global_setting('STOCK_DELETE_DEPLETED_DEFAULT'))

        self.entrada(10)

        self.post(
            reverse('api-oab-issue'),
            {
                'part': self.material.pk,
                'quantity': 10,
                'location': self.almoxarifado.pk,
                'sector': self.setor.pk,
                'handler': 'Carlos Santos',
            },
            expected_code=201,
        )

        self.assertEqual(helpers.available_quantity(self.material), 0)

        # O item de estoque sobrevive com saldo zero...
        item = StockItem.objects.get(part=self.material)
        self.assertEqual(item.quantity, 0)

        # ...e nenhuma entrada de auditoria fica órfã
        self.assertFalse(
            StockItemTracking.objects.filter(part=self.material, item=None).exists()
        )

    def test_command_is_idempotent(self):
        """Executar o comando novamente não duplica registros."""
        call_command('oab_setup')

        self.assertEqual(Group.objects.filter(name='Almoxarifado').count(), 1)


class SectorApiTest(OabTestBase):
    """Cadastro de setores."""

    def test_sector_listing(self):
        """Qualquer usuário autenticado consulta os setores."""
        response = self.get(reverse('api-oab-sector-list'), expected_code=200)

        self.assertEqual(len(response.data), 1)

    def test_sector_creation_requires_staff(self):
        """Somente usuários administrativos criam setores."""
        self.user.is_staff = False
        self.user.save()

        self.post(
            reverse('api-oab-sector-list'), {'name': 'Financeiro'}, expected_code=403
        )

        self.user.is_staff = True
        self.user.save()

        self.post(
            reverse('api-oab-sector-list'), {'name': 'Financeiro'}, expected_code=201
        )
