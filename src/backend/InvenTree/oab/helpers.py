"""Operações de estoque do almoxarifado da OAB-MA.

Toda a movimentação de saldo é delegada aos métodos do próprio ``StockItem``
(``add_stock``, ``take_stock``, ``move``, ``splitStock``), de modo que a trilha
de auditoria nativa do InvenTree (``StockItemTracking``) continue sendo gerada
normalmente. Este módulo apenas orquestra essas chamadas no nível do
*material* (``Part``) + *local*, que é como o operador do almoxarifado pensa.
"""

from decimal import Decimal

from django.db.models import Q, Sum
from django.utils.translation import gettext_lazy as _

from rest_framework.serializers import ValidationError

from stock.models import StockItem, StockItemTracking, StockLocation
from stock.status_codes import StockStatus


def location_filter(location, include_sublocations: bool = True) -> Q:
    """Constrói um filtro de local, opcionalmente incluindo sublocais."""
    if location is None:
        return Q()

    if include_sublocations:
        # A consulta parte do banco, e não do objeto em memória: locais são
        # inseridos em ordem alfabética (`order_insertion_by`), então cadastrar
        # um local novo renumera a árvore e deixa obsoletos os campos MPTT de
        # qualquer objeto já carregado. Usá-los faria a busca cair na árvore
        # errada e reportar saldo zero.
        tree = StockLocation.objects.filter(pk=location.pk)

        return Q(location__in=tree.get_descendants(include_self=True))

    return Q(location=location)


def available_items(part, location=None, include_sublocations: bool = True):
    """Itens de estoque disponíveis de um material (opcionalmente em um local)."""
    return (
        StockItem.objects
        .filter(part=part)
        .filter(StockItem.IN_STOCK_FILTER)
        .filter(location_filter(location, include_sublocations))
        .order_by('pk')
    )


def available_quantity(part, location=None, include_sublocations: bool = True):
    """Quantidade disponível de um material (opcionalmente em um local)."""
    result = available_items(part, location, include_sublocations).aggregate(
        total=Sum('quantity')
    )

    return result['total'] or Decimal(0)


def _last_tracking_entry(part, since_pk: int):
    """Retorna a última entrada de auditoria gerada para o material."""
    return (
        StockItemTracking.objects
        .filter(part=part, pk__gt=since_pk)
        .order_by('pk')
        .last()
    )


def _tracking_watermark() -> int:
    """Maior PK atual da tabela de auditoria (marcador de início de operação)."""
    latest = StockItemTracking.objects.order_by('-pk').values_list('pk', flat=True)
    return latest[0] if latest else 0


def receive_stock(part, location, quantity, user, notes: str = ''):
    """Registra a entrada de um material em um local.

    Reaproveita um item de estoque existente no local quando possível, para
    evitar a proliferação de registros de estoque no almoxarifado.

    Returns:
        A entrada de auditoria (``StockItemTracking``) gerada, ou None.
    """
    watermark = _tracking_watermark()

    item = (
        StockItem.objects
        .filter(
            part=part,
            location=location,
            serial=None,
            belongs_to=None,
            customer=None,
            consumed_by=None,
            sales_order=None,
            is_building=False,
            status=StockStatus.OK.value,
        )
        .order_by('pk')
        .first()
    )

    if item:
        item.add_stock(quantity, user, notes=notes)
    else:
        item = StockItem(part=part, location=location, quantity=quantity)
        item.save(user=user, notes=notes)

    return _last_tracking_entry(part, watermark)


def issue_stock(part, location, quantity, user, notes: str = ''):
    """Registra a saída de um material a partir de um local.

    O consumo é feito na ordem de criação dos itens de estoque (FIFO).

    Returns:
        A entrada de auditoria (``StockItemTracking``) gerada, ou None.
    """
    watermark = _tracking_watermark()

    remaining = Decimal(quantity)

    for item in available_items(part, location).select_for_update():
        if remaining <= 0:
            break

        take = min(item.quantity, remaining)

        if item.take_stock(take, user, notes=notes):
            remaining -= take

    if remaining > 0:
        raise ValidationError({
            'quantity': _('Quantidade indisponível no local de origem selecionado')
        })

    return _last_tracking_entry(part, watermark)


def transfer_stock(part, location_from, location_to, quantity, user, notes: str = ''):
    """Transfere um material entre dois locais de estoque.

    Returns:
        A entrada de auditoria (``StockItemTracking``) gerada, ou None.
    """
    watermark = _tracking_watermark()

    remaining = Decimal(quantity)

    for item in available_items(part, location_from).select_for_update():
        if remaining <= 0:
            break

        if item.quantity <= remaining:
            moved = item.quantity
            if item.move(location_to, notes, user):
                remaining -= moved
        elif item.splitStock(remaining, location_to, user, notes=notes) is not None:
            remaining = Decimal(0)

    if remaining > 0:
        raise ValidationError({
            'quantity': _('Quantidade indisponível no local de origem selecionado')
        })

    return _last_tracking_entry(part, watermark)
