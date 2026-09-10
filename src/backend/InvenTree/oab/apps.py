"""AppConfig para o app 'oab'."""

from django.apps import AppConfig


class OabConfig(AppConfig):
    """AppConfig do módulo de almoxarifado da OAB-MA."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'oab'
    verbose_name = 'OAB-MA'
