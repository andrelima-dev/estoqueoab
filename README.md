# Sistema de Estoque — OAB Maranhão

Controle de almoxarifado da Seccional do Maranhão da Ordem dos Advogados do
Brasil. Registra a entrada, a saída, a transferência e o ajuste de materiais de
uso próprio, com histórico de quem registrou cada operação e de quem recebeu ou
retirou o material.

## O que o sistema faz

- **Materiais e Estoque Atual** — cadastro e saldo por local, com situação
  (sem estoque, estoque baixo, normal).
- **Movimentações** — entrada, saída, transferência e ajuste, cada uma com
  quantidade anterior e posterior, local, setor de destino e documento.
- **Responsabilização** — a saída exige informar **quem recebeu** o material,
  separado de **quem registrou** a operação no sistema. É esse registro que
  permite responsabilizar um terceiro pelo material entregue.
- **Relatórios** — consultas com filtro por período e exportação em CSV/Excel.
- **Etiquetas** — modelos de etiqueta imprimíveis para materiais e locais.

Movimentações não são apagadas. Correções são feitas por estorno ou ajuste, de
modo que o histórico permaneça íntegro como prova.

## Instalação

Requisitos: Python 3.12+ e Node 20+.

```bash
# 1. Dependências
pip install -r src/backend/requirements.txt
cd src/frontend && yarn install && cd ../..

# 2. Banco de dados
python src/backend/InvenTree/manage.py migrate

# 3. Configuração institucional (idempotente)
python src/backend/InvenTree/manage.py oab_setup --with-sectors

# 4. Usuário administrador
python src/backend/InvenTree/manage.py createsuperuser
```

### Passos obrigatórios de publicação

Dois passos são fáceis de esquecer e quebram a interface em silêncio:

1. **Compilar os catálogos de tradução.** O Django só lê o catálogo compilado
   (`.mo`), que é artefato de build e não está versionado. Sem isso as telas de
   configuração aparecem em inglês:

   ```bash
   python src/backend/InvenTree/manage.py compilemessages
   ```

   `compilemessages` depende do GNU gettext (`msgfmt`). Onde ele não estiver
   disponível — o caso comum no Windows — use o Babel, que já é dependência do
   projeto:

   ```bash
   python -c "from babel.messages.pofile import read_po; from babel.messages.mofile import write_mo; import pathlib; [write_mo(open(p.with_suffix('.mo'),'wb'), read_po(open(p, encoding='utf-8'))) for p in pathlib.Path('src/backend/InvenTree/locale').glob('*/LC_MESSAGES/django.po')]"
   ```

2. **Gerar a interface.** Textos novos em português viram identificadores no
   build de produção se os catálogos do frontend não forem extraídos e
   compilados antes:

   ```bash
   cd src/frontend
   yarn extract && yarn compile && yarn build
   cd ../..
   python src/backend/InvenTree/manage.py collectstatic --noinput
   ```

O idioma padrão vem do servidor: `language: pt-br` em `config/config.yaml`.

## Especificações

As decisões de comportamento estão em [`openspec/specs/`](openspec/specs/), no
formato OpenSpec. Elas registram principalmente o que não é visível no código —
por que a saída exige quem recebeu, por que os setores não são fixos, por que o
histórico não pode ser apagável pela interface.

## Origem e licença

Este sistema é construído sobre o [InvenTree](https://github.com/inventree/InvenTree),
distribuído sob licença MIT. A engine de estoque, a autenticação, o modelo de
permissões e a API são do InvenTree; este repositório acrescenta o registro de
movimentações do almoxarifado, a identidade visual da OAB e a simplificação da
interface para uso institucional.

O aviso de copyright e os termos originais estão preservados em
[LICENSE](LICENSE), conforme a licença exige.
