"""Serializers do módulo de almoxarifado da OAB-MA."""

from decimal import Decimal

from django.db import transaction
from django.utils.translation import gettext_lazy as _

from rest_framework import serializers

import part.serializers as part_serializers
from company.models import Company
from InvenTree.mixins import DataImportExportSerializerMixin
from InvenTree.serializers import InvenTreeModelSerializer
from part.models import Part
from stock.models import StockLocation
from users.serializers import UserSerializer

from . import helpers
from .models import AdHocLocation, MovementType, Sector, StockMovement


class SectorSerializer(DataImportExportSerializerMixin, InvenTreeModelSerializer):
    """Serializer para setores/departamentos da OAB-MA."""

    class Meta:
        """Metadados do serializer."""

        model = Sector
        fields = ['pk', 'name', 'code', 'description', 'active']


class LocationBriefSerializer(serializers.Serializer):
    """Representação enxuta de um local de estoque."""

    pk = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    pathstring = serializers.CharField(read_only=True)


class StockMovementSerializer(
    DataImportExportSerializerMixin, InvenTreeModelSerializer
):
    """Serializer (somente leitura) do histórico de movimentações."""

    class Meta:
        """Metadados do serializer."""

        model = StockMovement
        fields = [
            'pk',
            'date',
            'reference_date',
            'movement_type',
            'movement_type_display',
            'part',
            'part_detail',
            'part_name',
            'quantity',
            'quantity_before',
            'quantity_after',
            'location_from',
            'location_from_detail',
            'location_to',
            'location_to_detail',
            'sector',
            'sector_detail',
            'supplier',
            'source',
            'requester',
            'handler',
            'document',
            'notes',
            'user',
            'user_detail',
            'tracking',
        ]

        read_only_fields = fields

    movement_type_display = serializers.CharField(
        source='get_movement_type_display', read_only=True
    )

    part_detail = part_serializers.PartBriefSerializer(
        source='part', many=False, read_only=True, allow_null=True
    )

    location_from_detail = LocationBriefSerializer(
        source='location_from', many=False, read_only=True, allow_null=True
    )

    location_to_detail = LocationBriefSerializer(
        source='location_to', many=False, read_only=True, allow_null=True
    )

    sector_detail = SectorSerializer(
        source='sector', many=False, read_only=True, allow_null=True
    )

    user_detail = UserSerializer(
        source='user', many=False, read_only=True, allow_null=True
    )

    @staticmethod
    def annotate_queryset(queryset):
        """Pré-carrega os relacionamentos exibidos na tabela de histórico."""
        return queryset.select_related(
            'part', 'sector', 'user', 'location_from', 'location_to'
        )


class SuggestedLocationSerializer(serializers.ModelSerializer):
    """Local oferecido como sugestão ao digitar um destino."""

    class Meta:
        """Metadados do serializer."""

        model = StockLocation
        fields = ['pk', 'name', 'description']
        read_only_fields = fields


class MovementActionSerializer(serializers.Serializer):
    """Base para as operações de estoque do almoxarifado.

    Subclasses implementam ``perform()``, que executa a operação e devolve a
    entrada de auditoria gerada. O registro institucional (``StockMovement``) é
    criado aqui, garantindo que nenhuma movimentação fique sem rastreabilidade.
    """

    movement_type: str = MovementType.AJUSTE

    part = serializers.PrimaryKeyRelatedField(
        queryset=Part.objects.all(),
        many=False,
        required=True,
        label=_('Material'),
        help_text=_('Material a ser movimentado'),
    )

    quantity = serializers.DecimalField(
        max_digits=15,
        decimal_places=5,
        min_value=Decimal('0.00001'),
        required=True,
        label=_('Quantidade'),
    )

    document = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default='',
        label=_('Documento'),
        help_text=_('Nota fiscal, protocolo ou documento de referência'),
    )

    reference_date = serializers.DateField(
        required=False, allow_null=True, default=None, label=_('Data do documento')
    )

    notes = serializers.CharField(
        max_length=512,
        required=False,
        allow_blank=True,
        default='',
        label=_('Observações'),
    )

    def validate_destination(self, location):
        """Locais estruturais não podem conter estoque."""
        if location and location.structural:
            raise serializers.ValidationError(
                _('Locais estruturais não podem armazenar materiais')
            )

        return location

    def resolve_location(
        self, field: str, name_field: str, save: bool = True
    ) -> StockLocation:
        """Resolve o local informado como texto livre.

        Mesma ideia do destino de uma saída: o operador digita o nome do local
        em vez de escolher numa lista, porque exigir cadastro prévio trava a
        operação — era o caso de uma instalação nova, com um único local.

        Um local já existente é reaproveitado (sem distinção de maiúsculas e
        espaços); um nome novo passa a fazer parte do cadastro. Executado dentro
        da transação da operação, para que um local só seja criado se a
        movimentação de fato acontecer.
        """
        data = self.validated_data

        if location := data.get(field):
            return location

        name = (data.get(name_field) or '').strip()

        if existing := StockLocation.objects.filter(name__iexact=name).first():
            return self.validate_destination(existing)

        location = StockLocation.objects.create(name=name)

        if not save:
            # Local de passagem: continua existindo enquanto guardar material,
            # mas deixa de ser sugerido assim que esvazia.
            AdHocLocation.objects.create(location=location)

        return location

    def movement_defaults(self) -> dict:
        """Campos institucionais adicionais gravados no registro."""
        return {}

    def movement_quantity(self) -> Decimal:
        """Quantidade efetivamente movimentada (registrada no histórico)."""
        return self.validated_data['quantity']

    def perform(self, user):
        """Executa a operação de estoque. Implementado pelas subclasses."""
        raise NotImplementedError

    @transaction.atomic
    def save(self):
        """Executa a operação e registra a movimentação institucional."""
        request = self.context['request']
        user = request.user

        data = self.validated_data
        part = data['part']

        quantity_before = helpers.available_quantity(part)

        tracking = self.perform(user)

        quantity_after = helpers.available_quantity(part)

        movement = StockMovement.objects.create(
            tracking=tracking,
            movement_type=self.movement_type,
            part=part,
            part_name=part.full_name,
            quantity=self.movement_quantity(),
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            document=data.get('document') or '',
            reference_date=data.get('reference_date'),
            notes=data.get('notes') or '',
            user=user,
            **self.movement_defaults(),
        )

        self.instance = movement

        return movement


class MovementEntrySerializer(MovementActionSerializer):
    """Entrada de material no almoxarifado."""

    movement_type = MovementType.ENTRADA

    part = serializers.PrimaryKeyRelatedField(
        queryset=Part.objects.filter(active=True),
        many=False,
        required=True,
        label=_('Material'),
    )

    location = serializers.PrimaryKeyRelatedField(
        queryset=StockLocation.objects.all(),
        many=False,
        required=False,
        allow_null=True,
        default=None,
        label=_('Local de destino'),
    )

    location_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default='',
        label=_('Local de destino'),
        help_text=_('Local onde o material será guardado'),
    )

    save_location = serializers.BooleanField(
        required=False,
        default=True,
        label=_('Salvar o local'),
        help_text=_(
            'Guarda o local digitado no cadastro. Desmarcado, ele serve apenas '
            'a esta movimentação e some da lista quando ficar vazio.'
        ),
    )

    supplier = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.filter(is_supplier=True),
        many=False,
        required=False,
        allow_null=True,
        default=None,
        label=_('Fornecedor'),
    )

    source = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default='', label=_('Origem')
    )

    handler = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default='',
        label=_('Responsável pelo recebimento'),
    )

    def validate_location(self, location):
        """Valida o local de destino."""
        return self.validate_destination(location)

    def validate(self, data):
        """Exige um local de destino, escolhido ou digitado."""
        data = super().validate(data)

        if not data.get('location') and not (data.get('location_name') or '').strip():
            raise serializers.ValidationError({
                'location_name': _('Informe o local de destino')
            })

        return data

    def resolved_location(self) -> StockLocation:
        """Local de destino, resolvido uma única vez por operação."""
        if not hasattr(self, '_location'):
            self._location = self.resolve_location(
                'location',
                'location_name',
                save=self.validated_data.get('save_location', True),
            )

        return self._location

    def movement_defaults(self) -> dict:
        """Campos institucionais da entrada."""
        data = self.validated_data

        return {
            'location_to': self.resolved_location(),
            'supplier': data.get('supplier'),
            'source': data.get('source') or '',
            'handler': data.get('handler') or '',
        }

    def perform(self, user):
        """Adiciona a quantidade informada ao local de destino."""
        data = self.validated_data

        return helpers.receive_stock(
            data['part'],
            self.resolved_location(),
            data['quantity'],
            user,
            notes=data.get('notes') or '',
        )


class MovementIssueSerializer(MovementActionSerializer):
    """Saída de material do almoxarifado."""

    movement_type = MovementType.SAIDA

    location = serializers.PrimaryKeyRelatedField(
        queryset=StockLocation.objects.all(),
        many=False,
        required=True,
        label=_('Local de origem'),
    )

    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.filter(active=True),
        many=False,
        required=False,
        allow_null=True,
        default=None,
        label=_('Destino'),
    )

    sector_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default='',
        label=_('Destino'),
        help_text=_('Setor, pessoa ou finalidade que receberá o material'),
    )

    def resolve_sector(self) -> Sector:
        """Resolve o destino informado como texto livre.

        O operador digita o destino em vez de escolher numa lista. Um destino
        já conhecido é reaproveitado (sem distinção de maiúsculas e espaços);
        um destino novo passa a fazer parte do cadastro, alimentando as
        sugestões e os filtros do histórico.

        Executado dentro da transação da operação, para que um destino só seja
        criado se a movimentação de fato acontecer.
        """
        data = self.validated_data

        if sector := data.get('sector'):
            return sector

        name = (data.get('sector_name') or '').strip()

        existing = Sector.objects.filter(name__iexact=name).first()

        if existing:
            return existing

        return Sector.objects.create(name=name)

    requester = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default='',
        label=_('Solicitante'),
    )

    handler = serializers.CharField(
        max_length=150,
        required=True,
        allow_blank=False,
        label=_('Entregue a'),
        help_text=_(
            'Pessoa que retirou o material. É ela a responsável pela retirada - '
            'o usuário do sistema que registrou a operação é guardado à parte.'
        ),
    )

    def validate(self, data):
        """Exige um destino e impede saída superior ao disponível."""
        data = super().validate(data)

        if not data.get('sector') and not (data.get('sector_name') or '').strip():
            raise serializers.ValidationError({
                'sector_name': _('Informe o destino do material')
            })

        available = helpers.available_quantity(data['part'], data['location'])

        if data['quantity'] > available:
            raise serializers.ValidationError({
                'quantity': _(
                    'Quantidade solicitada superior ao disponível no local de origem'
                )
            })

        return data

    def movement_defaults(self) -> dict:
        """Campos institucionais da saída."""
        data = self.validated_data

        return {
            'location_from': data['location'],
            'sector': self.resolve_sector(),
            'requester': data.get('requester') or '',
            'handler': data.get('handler') or '',
        }

    def perform(self, user):
        """Remove a quantidade informada do local de origem."""
        data = self.validated_data

        return helpers.issue_stock(
            data['part'],
            data['location'],
            data['quantity'],
            user,
            notes=data.get('notes') or '',
        )


class MovementTransferSerializer(MovementActionSerializer):
    """Transferência de material entre locais de estoque."""

    movement_type = MovementType.TRANSFERENCIA

    location_from = serializers.PrimaryKeyRelatedField(
        queryset=StockLocation.objects.all(),
        many=False,
        required=True,
        label=_('Local de origem'),
    )

    location_to = serializers.PrimaryKeyRelatedField(
        queryset=StockLocation.objects.all(),
        many=False,
        required=False,
        allow_null=True,
        default=None,
        label=_('Local de destino'),
    )

    location_to_name = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default='',
        label=_('Local de destino'),
        help_text=_('Local para onde o material será movido'),
    )

    save_location = serializers.BooleanField(
        required=False,
        default=True,
        label=_('Salvar o local'),
        help_text=_(
            'Guarda o local digitado no cadastro. Desmarcado, ele serve apenas '
            'a esta movimentação e some da lista quando ficar vazio.'
        ),
    )

    def validate_location_to(self, location):
        """Valida o local de destino."""
        return self.validate_destination(location)

    def resolved_location_to(self) -> StockLocation:
        """Local de destino, resolvido uma única vez por operação."""
        if not hasattr(self, '_location_to'):
            self._location_to = self.resolve_location(
                'location_to',
                'location_to_name',
                save=self.validated_data.get('save_location', True),
            )

        return self._location_to

    def validate(self, data):
        """Valida disponibilidade e locais distintos."""
        data = super().validate(data)

        destino_digitado = (data.get('location_to_name') or '').strip()

        if not data.get('location_to') and not destino_digitado:
            raise serializers.ValidationError({
                'location_to_name': _('Informe o local de destino')
            })

        # O destino digitado ainda não foi resolvido (isso acontece dentro da
        # transação), então a comparação com a origem é feita pelo nome.
        mesmo_local = (
            data['location_from'] == data['location_to']
            if data.get('location_to')
            else destino_digitado.casefold() == data['location_from'].name.casefold()
        )

        if mesmo_local:
            raise serializers.ValidationError({
                'location_to': _('O local de destino deve ser diferente da origem')
            })

        available = helpers.available_quantity(data['part'], data['location_from'])

        if data['quantity'] > available:
            raise serializers.ValidationError({
                'quantity': _(
                    'Quantidade solicitada superior ao disponível no local de origem'
                )
            })

        return data

    def movement_defaults(self) -> dict:
        """Campos institucionais da transferência."""
        data = self.validated_data

        return {
            'location_from': data['location_from'],
            'location_to': self.resolved_location_to(),
        }

    def perform(self, user):
        """Move a quantidade informada entre os locais."""
        data = self.validated_data

        return helpers.transfer_stock(
            data['part'],
            data['location_from'],
            self.resolved_location_to(),
            data['quantity'],
            user,
            notes=data.get('notes') or '',
        )


class MovementAdjustSerializer(MovementActionSerializer):
    """Ajuste de saldo (inventário / estorno) com registro de auditoria.

    O campo ``quantity`` representa a quantidade **contada** no local, e não a
    diferença. O sistema calcula e aplica a diferença necessária.
    """

    movement_type = MovementType.AJUSTE

    quantity = serializers.DecimalField(
        max_digits=15,
        decimal_places=5,
        min_value=Decimal(0),
        required=True,
        label=_('Quantidade contada'),
        help_text=_('Quantidade fisicamente encontrada no local'),
    )

    location = serializers.PrimaryKeyRelatedField(
        queryset=StockLocation.objects.all(),
        many=False,
        required=True,
        label=_('Local'),
    )

    notes = serializers.CharField(
        max_length=512,
        required=True,
        allow_blank=False,
        label=_('Justificativa'),
        help_text=_('Justificativa obrigatória para o ajuste de saldo'),
    )

    def validate_location(self, location):
        """Valida o local do ajuste."""
        return self.validate_destination(location)

    #: Diferença efetivamente aplicada pelo ajuste
    _applied_delta: Decimal = Decimal(0)

    def movement_defaults(self) -> dict:
        """Campos institucionais do ajuste."""
        data = self.validated_data

        return {'location_from': data['location'], 'location_to': data['location']}

    def movement_quantity(self) -> Decimal:
        """O histórico registra a diferença aplicada, não a contagem."""
        return abs(self._applied_delta)

    def perform(self, user):
        """Aplica a diferença entre o saldo contado e o saldo registrado."""
        data = self.validated_data

        part = data['part']
        location = data['location']
        notes = data.get('notes') or ''

        current = helpers.available_quantity(part, location)
        counted = Decimal(data['quantity'])

        delta = counted - current
        self._applied_delta = delta

        if delta > 0:
            return helpers.receive_stock(part, location, delta, user, notes=notes)

        if delta < 0:
            return helpers.issue_stock(part, location, -delta, user, notes=notes)

        return None


class DashboardSummarySerializer(serializers.Serializer):
    """Indicadores operacionais exibidos no painel inicial."""

    materials = serializers.IntegerField(
        read_only=True, label=_('Materiais cadastrados')
    )
    total_quantity = serializers.FloatField(
        read_only=True, label=_('Quantidade em estoque')
    )
    entries_today = serializers.IntegerField(read_only=True, label=_('Entradas hoje'))
    issues_today = serializers.IntegerField(read_only=True, label=_('Saídas hoje'))
    transfers_today = serializers.IntegerField(
        read_only=True, label=_('Transferências hoje')
    )
    low_stock = serializers.IntegerField(read_only=True, label=_('Estoque baixo'))
    out_of_stock = serializers.IntegerField(read_only=True, label=_('Sem estoque'))
