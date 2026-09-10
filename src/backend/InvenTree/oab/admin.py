"""Registro do módulo OAB-MA na área administrativa do Django."""

from django.contrib import admin

from .models import Sector, StockMovement


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    """Administração dos setores da OAB-MA."""

    list_display = ('name', 'code', 'active')
    list_filter = ('active',)
    search_fields = ('name', 'code', 'description')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """Consulta das movimentações registradas.

    Movimentações são registros de auditoria: não podem ser criadas nem
    editadas manualmente.
    """

    list_display = ('date', 'movement_type', 'part_name', 'quantity', 'user')
    list_filter = ('movement_type', 'sector')
    search_fields = ('part_name', 'document', 'requester', 'handler')
    date_hierarchy = 'date'

    def has_add_permission(self, request):
        """Movimentações só são criadas pelas operações de estoque."""
        return False

    def has_change_permission(self, request, obj=None):
        """O histórico é imutável."""
        return False
