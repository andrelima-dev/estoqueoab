"""Tags de template dos documentos da OAB-MA."""

import base64
from functools import lru_cache
from pathlib import Path

from django import template

register = template.Library()

FONTES = Path(__file__).resolve().parents[1] / 'static' / 'oab' / 'fonts'


@lru_cache(maxsize=8)
def _fonte_embutida(arquivo: str) -> str:
    """Fonte como URI de dados, lida do disco."""
    dados = (FONTES / arquivo).read_bytes()

    return f'data:font/woff;base64,{base64.b64encode(dados).decode()}'


@register.simple_tag()
def oab_font(arquivo: str) -> str:
    """Endereço da fonte para uso em `@font-face`.

    A fonte vai embutida no documento em vez de ser buscada por URL: a
    configuração `REPORT_FETCH_URLS` vem desligada de fábrica — por segurança,
    já que um modelo poderia buscar qualquer endereço — e com ela desligada o
    arquivo é ignorado em silêncio, caindo numa fonte de reserva sem aviso.

    Embutir também faz o documento não depender da rede nem do endereço
    configurado do servidor.
    """
    try:
        return _fonte_embutida(arquivo)
    except OSError:
        # Sem a fonte, a pilha de reserva mantém o documento legível.
        return ''
