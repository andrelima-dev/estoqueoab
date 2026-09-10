"""API do módulo de almoxarifado da OAB-MA.

Os endpoints aqui definidos são deliberadamente enxutos: eles apenas orquestram
os modelos e as operações já existentes no InvenTree, expondo-os na linguagem do
almoxarifado institucional (material / entrada / saída / transferência).
"""

from django.db.models import Exists, F, OuterRef, Q, Sum
from django.urls import include, path
from django.utils.translation import gettext_lazy as _

import django_filters.rest_framework.filters as rest_filters
from django_filters.rest_framework.filterset import FilterSet
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

import InvenTree.permissions
import part.filters as part_filters
from data_exporter.mixins import DataExportViewMixin
from InvenTree.api import meta_path
from InvenTree.filters import SEARCH_ORDER_FILTER, InvenTreeDateFilter
from InvenTree.helpers import current_date
from InvenTree.mixins import (
    CreateAPI,
    ListAPI,
    ListCreateAPI,
    RetrieveAPI,
    RetrieveUpdateDestroyAPI,
    SerializerContextMixin,
)
from part.models import Part, PartCategory
from stock.models import StockItem, StockLocation

from . import serializers as OabSerializers
from .models import AdHocLocation, MovementType, Sector, StockMovement


class SectorMixin:
    """Configuração comum dos endpoints de setor."""

    queryset = Sector.objects.all()
    serializer_class = OabSerializers.SectorSerializer

    # Qualquer usuário autenticado pode consultar os setores (necessário para
    # registrar uma saída); apenas usuários administrativos podem alterá-los.
    permission_classes = [InvenTree.permissions.IsStaffOrReadOnlyScope]


class SectorFilter(FilterSet):
    """Filtros do endpoint de setores."""

    class Meta:
        """Metadados do filtro."""

        model = Sector
        fields = ['active']


class SectorList(SectorMixin, DataExportViewMixin, ListCreateAPI):
    """Listagem e criação de setores/departamentos."""

    filter_backends = SEARCH_ORDER_FILTER
    filterset_class = SectorFilter

    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'active']
    ordering = 'name'


class SectorDetail(SectorMixin, RetrieveUpdateDestroyAPI):
    """Detalhe de um setor."""


class StockMovementFilter(FilterSet):
    """Filtros do histórico de movimentações."""

    class Meta:
        """Metadados do filtro."""

        model = StockMovement
        fields = ['movement_type', 'part', 'sector', 'user', 'supplier']

    category = rest_filters.NumberFilter(label=_('Categoria'), method='filter_category')

    def filter_category(self, queryset, name, value):
        """Filtra pelas categorias (incluindo subcategorias) do material."""
        category = PartCategory.objects.filter(pk=value).first()

        if category is None:
            return queryset.none()

        return queryset.filter(
            part__category__in=category.get_descendants(include_self=True)
        )

    location = rest_filters.NumberFilter(label=_('Local'), method='filter_location')

    def filter_location(self, queryset, name, value):
        """Filtra movimentações que envolvam o local (origem ou destino)."""
        location = StockLocation.objects.filter(pk=value).first()

        if location is None:
            return queryset.none()

        locations = location.get_descendants(include_self=True)

        return queryset.filter(
            Q(location_from__in=locations) | Q(location_to__in=locations)
        )

    min_date = InvenTreeDateFilter(
        label=_('Data inicial'), field_name='date', lookup_expr='gte'
    )

    max_date = InvenTreeDateFilter(
        label=_('Data final'), field_name='date', lookup_expr='lte'
    )


class StockMovementMixin(SerializerContextMixin):
    """Configuração comum dos endpoints de histórico."""

    queryset = StockMovement.objects.all()
    serializer_class = OabSerializers.StockMovementSerializer

    # O histórico é imutável: apenas leitura, para quem pode ver estoque.
    permission_classes = [InvenTree.permissions.RolePermission]
    role_required = 'stock.view'

    def get_queryset(self, *args, **kwargs):
        """Pré-carrega os relacionamentos exibidos."""
        return OabSerializers.StockMovementSerializer.annotate_queryset(
            super().get_queryset(*args, **kwargs)
        )


class StockMovementList(StockMovementMixin, DataExportViewMixin, ListAPI):
    """Histórico de movimentações do almoxarifado (somente leitura)."""

    filter_backends = SEARCH_ORDER_FILTER
    filterset_class = StockMovementFilter

    search_fields = [
        'part_name',
        'part__name',
        'part__IPN',
        'document',
        'requester',
        'handler',
        'notes',
    ]

    ordering_fields = ['date', 'movement_type', 'part_name', 'quantity']
    ordering = '-date'


class StockMovementDetail(StockMovementMixin, RetrieveAPI):
    """Detalhe de uma movimentação."""


class MovementActionView(SerializerContextMixin, CreateAPI):
    """Base das operações de estoque do almoxarifado.

    A permissão segue exatamente o padrão dos endpoints nativos de ajuste de
    estoque do InvenTree: um POST exige a permissão ``stock.add``, de modo que o
    perfil "Consulta" seja rejeitado pelo backend - e não apenas pela interface.
    """

    queryset = StockMovement.objects.none()

    permission_classes = [InvenTree.permissions.RolePermission]
    role_required = 'stock'

    def get_serializer_context(self):
        """Disponibiliza o request para o serializer."""
        context = super().get_serializer_context()
        context['request'] = self.request

        return context

    def create(self, request, *args, **kwargs):
        """Executa a operação e devolve a movimentação registrada.

        Os serializers de ação recebem campos de *entrada* (material, local,
        setor...) mas produzem um ``StockMovement``, portanto a resposta é
        montada com o serializer do histórico.
        """
        serializer = self.get_serializer(data=self.clean_data(request.data))
        serializer.is_valid(raise_exception=True)

        movement = serializer.save()

        output = OabSerializers.StockMovementSerializer(
            movement, context={'request': request}
        )

        return Response(output.data, status=status.HTTP_201_CREATED)


class MovementEntryView(MovementActionView):
    """Registra uma entrada de material."""

    serializer_class = OabSerializers.MovementEntrySerializer


class MovementIssueView(MovementActionView):
    """Registra uma saída de material."""

    serializer_class = OabSerializers.MovementIssueSerializer


class MovementTransferView(MovementActionView):
    """Registra uma transferência de material entre locais."""

    serializer_class = OabSerializers.MovementTransferSerializer


class MovementAdjustView(MovementActionView):
    """Registra um ajuste de saldo (inventário / estorno)."""

    serializer_class = OabSerializers.MovementAdjustSerializer

    permission_classes = [InvenTree.permissions.StaffRolePermissionOrReadOnly]


class DashboardSummary(GenericAPIView):
    """Indicadores operacionais do almoxarifado, para a tela inicial."""

    serializer_class = OabSerializers.DashboardSummarySerializer
    permission_classes = [InvenTree.permissions.IsAuthenticatedOrReadScope]

    def get(self, request, *args, **kwargs):
        """Retorna os contadores exibidos no painel."""
        today = current_date()

        parts = Part.objects.filter(active=True).annotate(
            total_in_stock=part_filters.annotate_total_stock()
        )

        low_stock = parts.exclude(minimum_stock=0).filter(
            total_in_stock__lt=F('minimum_stock'), total_in_stock__gt=0
        )

        out_of_stock = parts.filter(total_in_stock__lte=0)

        total_quantity = (
            StockItem.objects.filter(StockItem.IN_STOCK_FILTER).aggregate(
                total=Sum('quantity')
            )['total']
            or 0
        )

        movements_today = StockMovement.objects.filter(date__date=today)

        serializer = self.get_serializer({
            'materials': parts.count(),
            'total_quantity': float(total_quantity),
            'entries_today': movements_today.filter(
                movement_type=MovementType.ENTRADA
            ).count(),
            'issues_today': movements_today.filter(
                movement_type=MovementType.SAIDA
            ).count(),
            'transfers_today': movements_today.filter(
                movement_type=MovementType.TRANSFERENCIA
            ).count(),
            'low_stock': low_stock.count(),
            'out_of_stock': out_of_stock.count(),
        })

        return Response(serializer.data)


class SuggestedLocationList(ListAPI):
    """Locais oferecidos ao digitar um destino de entrada ou transferência.

    Ficam de fora os locais estruturais (que não guardam material) e os locais
    avulsos que já esvaziaram: eles serviram a uma movimentação específica e não
    devem poluir a lista para sempre. Um local avulso com saldo continua na
    lista, senão não haveria como tirar o material de lá.
    """

    serializer_class = OabSerializers.SuggestedLocationSerializer
    permission_classes = [InvenTree.permissions.IsAuthenticatedOrReadScope]
    filter_backends = SEARCH_ORDER_FILTER
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    ordering = 'name'

    def get_queryset(self):
        """Locais permanentes, mais os avulsos que ainda guardam material."""
        com_saldo = StockItem.objects.filter(
            StockItem.IN_STOCK_FILTER, location=OuterRef('pk')
        )

        return (
            StockLocation.objects.filter(structural=False)
            .annotate(avulso=Exists(AdHocLocation.objects.filter(location=OuterRef('pk'))))
            .annotate(ocupado=Exists(com_saldo))
            .filter(Q(avulso=False) | Q(ocupado=True))
        )


oab_api_urls = [
    path(
        'sector/',
        include([
            path(
                '<int:pk>/',
                include([
                    meta_path(Sector),
                    path('', SectorDetail.as_view(), name='api-oab-sector-detail'),
                ]),
            ),
            path('', SectorList.as_view(), name='api-oab-sector-list'),
        ]),
    ),
    path(
        'movement/',
        include([
            path(
                '<int:pk>/',
                StockMovementDetail.as_view(),
                name='api-oab-movement-detail',
            ),
            path('', StockMovementList.as_view(), name='api-oab-movement-list'),
        ]),
    ),
    path('entry/', MovementEntryView.as_view(), name='api-oab-entry'),
    path('issue/', MovementIssueView.as_view(), name='api-oab-issue'),
    path('transfer/', MovementTransferView.as_view(), name='api-oab-transfer'),
    path('adjust/', MovementAdjustView.as_view(), name='api-oab-adjust'),
    path(
        'location/',
        SuggestedLocationList.as_view(),
        name='api-oab-location-list',
    ),
    path('summary/', DashboardSummary.as_view(), name='api-oab-summary'),
]
