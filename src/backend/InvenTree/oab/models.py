"""Modelos específicos do almoxarifado da OAB-MA.

Estes modelos *complementam* (e nunca substituem) os modelos de estoque do
InvenTree:

- O saldo continua vivendo em ``stock.StockItem``.
- A trilha de auditoria continua sendo ``stock.StockItemTracking``.
- ``StockMovement`` apenas anexa a cada movimentação os dados institucionais que
  o InvenTree não modela (setor requisitante, solicitante, responsável pela
  retirada/recebimento e documento/protocolo), mantendo uma cópia denormalizada
  dos dados essenciais para que o histórico sobreviva mesmo que o item de
  estoque seja consumido.
"""

from django.contrib.auth.models import User
from django.db import models
from django.urls import reverse
from django.utils.translation import gettext_lazy as _

import InvenTree.models


class MovementType(models.TextChoices):
    """Tipos de movimentação apresentados ao usuário do almoxarifado."""

    ENTRADA = 'IN', _('Entrada')
    SAIDA = 'OUT', _('Saída')
    TRANSFERENCIA = 'TRANSFER', _('Transferência')
    AJUSTE = 'ADJUST', _('Ajuste')


class Sector(InvenTree.models.InvenTreeModel):
    """Setor / departamento da OAB-MA que requisita materiais.

    Cadastro administrável - nenhum setor é fixado em código.
    """

    class Meta:
        """Metadados do modelo."""

        verbose_name = _('Setor')
        verbose_name_plural = _('Setores')
        ordering = ['name']

    @staticmethod
    def get_api_url():
        """Retorna a URL da API para este modelo."""
        return reverse('api-oab-sector-list')

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_('Nome'),
        help_text=_('Nome do setor ou departamento'),
    )

    code = models.CharField(
        max_length=25,
        blank=True,
        verbose_name=_('Sigla'),
        help_text=_('Sigla ou código interno do setor'),
    )

    description = models.CharField(
        max_length=250, blank=True, verbose_name=_('Descrição')
    )

    active = models.BooleanField(
        default=True,
        verbose_name=_('Ativo'),
        help_text=_('Setores inativos não podem ser usados em novas movimentações'),
    )

    def __str__(self):
        """Representação textual do setor."""
        if self.code:
            return f'{self.code} - {self.name}'
        return self.name


class StockMovement(InvenTree.models.InvenTreeModel):
    """Registro institucional de uma movimentação de estoque.

    Cada registro aponta para a entrada de auditoria do InvenTree
    (``StockItemTracking``) que efetivamente alterou o saldo. Os campos
    denormalizados (material, usuário, data, quantidades) permitem consultar e
    filtrar o histórico sem depender de JSON, e preservam a rastreabilidade
    mesmo que o item de estoque de origem seja depletado.

    Movimentações nunca são apagadas pela interface: correções são feitas
    através de uma nova movimentação de ajuste/estorno.
    """

    class Meta:
        """Metadados do modelo."""

        verbose_name = _('Movimentação de Estoque')
        verbose_name_plural = _('Movimentações de Estoque')
        ordering = ['-date', '-pk']

    @staticmethod
    def get_api_url():
        """Retorna a URL da API para este modelo."""
        return reverse('api-oab-movement-list')

    tracking = models.ForeignKey(
        'stock.StockItemTracking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='oab_movements',
        verbose_name=_('Registro de auditoria'),
        help_text=_('Entrada de histórico do InvenTree associada'),
    )

    movement_type = models.CharField(
        max_length=15,
        choices=MovementType.choices,
        db_index=True,
        verbose_name=_('Tipo'),
    )

    part = models.ForeignKey(
        'part.Part',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='oab_movements',
        verbose_name=_('Material'),
    )

    part_name = models.CharField(
        max_length=250,
        blank=True,
        verbose_name=_('Material (descrição)'),
        help_text=_('Nome do material no momento da movimentação'),
    )

    quantity = models.DecimalField(
        max_digits=15, decimal_places=5, default=0, verbose_name=_('Quantidade')
    )

    quantity_before = models.DecimalField(
        max_digits=15,
        decimal_places=5,
        default=0,
        verbose_name=_('Saldo anterior'),
        help_text=_('Saldo total do material antes da operação'),
    )

    quantity_after = models.DecimalField(
        max_digits=15,
        decimal_places=5,
        default=0,
        verbose_name=_('Saldo posterior'),
        help_text=_('Saldo total do material após a operação'),
    )

    location_from = models.ForeignKey(
        'stock.StockLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='oab_movements_out',
        verbose_name=_('Local de origem'),
    )

    location_to = models.ForeignKey(
        'stock.StockLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='oab_movements_in',
        verbose_name=_('Local de destino'),
    )

    sector = models.ForeignKey(
        Sector,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movements',
        verbose_name=_('Setor'),
    )

    supplier = models.ForeignKey(
        'company.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='oab_movements',
        verbose_name=_('Fornecedor'),
    )

    source = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_('Origem'),
        help_text=_('Origem do material (fornecedor, doação, devolução...)'),
    )

    requester = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_('Solicitante'),
        help_text=_('Pessoa que solicitou o material'),
    )

    handler = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_('Responsável'),
        help_text=_('Pessoa que retirou ou recebeu fisicamente o material'),
    )

    document = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name=_('Documento'),
        help_text=_('Nota fiscal, protocolo ou documento de referência'),
    )

    reference_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('Data do documento'),
        help_text=_('Data da nota fiscal ou protocolo (opcional)'),
    )

    notes = models.CharField(max_length=512, blank=True, verbose_name=_('Observações'))

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='oab_movements',
        verbose_name=_('Registrado por'),
        help_text=_('Usuário do sistema que registrou a operação'),
    )

    date = models.DateTimeField(
        auto_now_add=True, editable=False, db_index=True, verbose_name=_('Data')
    )

    def save(self, *args, **kwargs):
        """Mantém a cópia do nome do material atualizada."""
        if self.part and not self.part_name:
            self.part_name = self.part.full_name

        super().save(*args, **kwargs)

    def __str__(self):
        """Representação textual da movimentação."""
        return (
            f'{self.get_movement_type_display()} - {self.part_name} ({self.quantity})'
        )
