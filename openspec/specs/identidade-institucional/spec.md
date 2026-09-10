# identidade-institucional Specification

## Purpose

Apresentar a instalação como "Sistema de Estoque — OAB Maranhão", em Português
do Brasil, sem a aparência industrial do InvenTree — mantendo a plataforma
intacta por baixo, para não perder compatibilidade com atualizações futuras.

## Requirements

### Requirement: Módulos industriais ocultos, não removidos

Os módulos de fabricação, compras, vendas, devoluções e BOM SHALL ficar fora da
navegação, das rotas e da busca global, controlados pela constante
`OAB_ENABLE_INDUSTRIAL_MODULES` em `src/frontend/src/defaults/oab.tsx`.

O backend desses módulos MUST permanecer intacto: alternar a constante para
`true` SHALL restaurar o comportamento original do InvenTree.

#### Scenario: Alternância restaura os módulos

- **WHEN** `OAB_ENABLE_INDUSTRIAL_MODULES` é `true`
- **THEN** as rotas de manufacturing, purchasing e sales voltam a existir
- **AND** os painéis correspondentes reaparecem na ficha do material

### Requirement: Interface em Português do Brasil

A interface SHALL ser apresentada em pt-BR por padrão.

O idioma padrão SHALL vir da configuração do servidor (`language: pt-br` em
`config.yaml`), porque é o servidor que informa `default_locale` ao frontend —
alterar apenas `defaultLocale` no frontend não tem efeito.

#### Scenario: Locale regional tem precedência sobre o idioma base

- **WHEN** o servidor informa `default_locale = "pt-br"`
- **THEN** o frontend carrega o catálogo `pt_BR`
- **AND** MUST NOT cair no catálogo `pt` (português europeu)

#### Scenario: Textos novos aparecem traduzidos no build de produção

- **WHEN** uma string nova em português é adicionada com o macro `t`
- **THEN** `lingui extract` e `lingui compile` SHALL ser executados antes do
  build
- **AND** a interface exibe o texto, nunca o hash da mensagem

#### Scenario: Telas da plataforma aparecem traduzidas

- **WHEN** o servidor responde a uma requisição com `Accept-Language: pt-br`
- **THEN** os rótulos vindos do backend (configurações do sistema, do usuário e
  das extensões) SHALL vir em português
- **AND** os catálogos `locale/*/LC_MESSAGES/django.po` SHALL ter sido
  compilados em `.mo` antes de subir o servidor, porque o Django só lê o
  catálogo compilado
- **AND** o `.mo` MUST NOT ser versionado — está no `.gitignore` como artefato
  de build, então a compilação é um passo obrigatório do deploy

### Requirement: Marca da OAB-MA no lugar da marca da plataforma

O logotipo e a imagem de fundo do InvenTree MUST NOT aparecer na interface.

O servidor sempre preenche `customize.logo` e `customize.splash` com os
arquivos padrão da plataforma quando nenhuma personalização foi enviada; o
frontend SHALL tratá-los como "sem personalização".

#### Scenario: Arquivo padrão não é tratado como personalização

- **WHEN** `customize.logo` aponta para `img/inventree.png`
- **THEN** a interface exibe o marcador da OAB-MA
  (`src/frontend/src/assets/oab-ma.svg`)

#### Scenario: Logotipo oficial enviado pelo administrador

- **WHEN** o administrador envia um logotipo próprio
- **THEN** esse arquivo é exibido no lugar do marcador

### Requirement: Paleta e tipografia do Manual de Identidade Visual

A interface SHALL seguir o Manual de Identidade Visual da OAB. A identidade é
composta por **azul, vermelho e preto** — MUST NOT ser introduzida nenhuma
outra cor de marca (dourado, âmbar, verde institucional).

Valores oficiais, declarados em `src/frontend/src/defaults/oab.tsx`:

| Uso | Referência | Valor |
|---|---|---|
| Azul sólido | Pantone 301 C | `oabBlue[6]` |
| Azul escuro (gradiente) | R.0 G.53 B.82 | `oabBlue[9]` |
| Vermelho sólido | Pantone 200 C | `oabRed[6]` |
| Vermelho claro | Pantone 485 C | `oabRed[5]` |
| Vermelho escuro (gradiente) | R.145 G.13 B.17 | `oabRed[8]` |

A tipografia SHALL ser **Barlow**, a família oficial do manual, servida pelo
pacote `@fontsource/barlow` e não por CDN — a rede da Seccional pode não ter
saída para a internet.

As paletas SHALL estar declaradas nos **dois** temas: `theme.ts` (variáveis CSS
dos arquivos `*.css.ts`) e `contexts/ThemeContext.tsx` (tema de execução).
Declarar em apenas um deles faz a cor não resolver.

#### Scenario: Índice 6 carrega o Pantone oficial

- **WHEN** um componente usa a cor `oabBlue` ou `oabRed` sem indicar o tom
- **THEN** recebe o Pantone oficial, porque `primaryShade` é 6

#### Scenario: Fonte disponível sem internet

- **WHEN** o sistema é aberto em uma rede sem acesso externo
- **THEN** a interface é renderizada em Barlow, servida pelo próprio pacote

### Requirement: Entrada e saída pelo par institucional

Entradas SHALL usar o azul da marca e saídas o vermelho da marca. A escala de
situação de estoque SHALL ser feita pelo **peso** do vermelho — preenchido para
"sem estoque", suave para "estoque baixo" — e por cinza neutro para "normal".

Isso substitui o par verde/vermelho convencional, que não existe na identidade.

#### Scenario: Barra superior institucional

- **WHEN** qualquer página é aberta
- **THEN** a barra superior tem fundo no azul Pantone 301 C com filete no
  vermelho Pantone 200 C
- **AND** a aba ativa é marcada por sublinhado no mesmo vermelho

#### Scenario: Texto sobre a barra escura

- **WHEN** um componente é renderizado dentro da faixa de navegação
- **THEN** seu texto e seus ícones aparecem em branco
- **AND** o escopo desse ajuste para em `layoutHeaderSection`, para que alertas
  no mesmo cabeçalho mantenham as próprias cores

#### Scenario: Título de página consistente

- **WHEN** qualquer página do almoxarifado é aberta
- **THEN** o título aparece no mesmo bloco com acento vermelho à esquerda,
  vindo de `PageDetail`

### Requirement: Real como moeda da instituição

A moeda padrão SHALL ser o Real (`BRL`), definida por `oab_setup` e não por
alteração do padrão da plataforma.

A lista `CURRENCY_CODES` MUST ser gravada antes de `INVENTREE_DEFAULT_CURRENCY`:
as opções da moeda padrão derivam dela, e o padrão do InvenTree
(`AUD,CAD,CNY,EUR,GBP,JPY,NZD,USD`) não inclui o Real — sem esse passo a opção
brasileira sequer aparece no seletor.

Os nomes das moedas SHALL ser exibidos no idioma ativo. A biblioteca
`py-moneyed` expõe `Currency.name` apenas em inglês; o nome traduzido vem de
`Currency.get_name(locale)`.

#### Scenario: Seletor de moeda oferece o Real

- **WHEN** um administrador abre as configurações de preços
- **THEN** o seletor apresenta `BRL - Real brasileiro` como valor corrente
- **AND** USD e EUR permanecem disponíveis para material importado

### Requirement: Avisos da plataforma desligados

As faixas de aviso de privilégio elevado do InvenTree
(`INVENTREE_SHOW_SUPERUSER_BANNER` e `INVENTREE_SHOW_ADMIN_BANNER`) SHALL ficar
desligadas, por configuração e não por remoção de código.

São ruído para o operador do almoxarifado, que não decide nada a respeito de
privilégios.

#### Scenario: Painel sem faixa de alerta

- **WHEN** um superusuário abre o painel
- **THEN** nenhuma faixa vermelha de aviso da plataforma é exibida

### Requirement: Terminologia de almoxarifado

A interface SHALL usar Material, Estoque, Entrada, Saída, Transferência e
Ajuste. Termos da plataforma — Part, Peça, BOM, Build, Assembly, Sales Order —
MUST NOT aparecer ao usuário.

A troca SHALL ser feita nos rótulos (`ModelInformationDict`, colunas e painéis),
não nos nomes de modelos ou rotas da API.

#### Scenario: Ficha do material sem termos industriais

- **WHEN** um usuário abre a ficha de um material
- **THEN** vê os painéis Detalhes do Material, Estoque, Movimentações, Anexos e
  Anotações
- **AND** não vê Fornecedores, Preço, Pedidos de compra, Peças relacionadas nem
  Parâmetros

### Requirement: Caminho curto para movimentar estoque

Entrada e saída SHALL estar acessíveis em um clique a partir de onde o material
já está listado, sem exigir nova seleção do material.

#### Scenario: Ação a partir da linha

- **WHEN** o usuário está na tela Materiais ou Estoque Atual
- **THEN** cada linha oferece os botões Entrada e Saída
- **AND** o modal abre com o material e o local padrão já preenchidos

#### Scenario: Cadastro emenda na quantidade inicial

- **WHEN** um material novo é cadastrado
- **THEN** o modal de entrada abre em seguida, para registrar a quantidade
  existente
- **AND** essa quantidade entra pelo fluxo normal, ficando registrada no
  histórico

### Requirement: Plataforma base fora das telas do operador

A marca e os identificadores do InvenTree MUST NOT aparecer nas telas de uso
diário. Isso cobre o ícone do navegador, o nome do aplicativo instalado (PWA),
os avisos exibidos quando a interface não carrega, os códigos `INVE-*` e os
links para a documentação da plataforma.

A versão do servidor MUST NOT ser exibida na tela de entrada: além de ser
detalhe da plataforma, anuncia a versão antes da autenticação.

A atribuição SHALL continuar acessível: o InvenTree é distribuído sob licença
MIT, e as telas "Sobre a plataforma" e "Informações de licença" — restritas a
usuários administrativos — SHALL nomear a plataforma base e suas licenças.

Atalhos MUST NOT apontar para telas retiradas da navegação. Vale para as Ações
rápidas do Centro de administração e para a busca rápida.

#### Scenario: Ícone do navegador é a marca da Seccional

- **WHEN** o sistema é aberto em qualquer página
- **THEN** a aba do navegador exibe a marca da OAB
- **AND** o manifesto do aplicativo o identifica como "Estoque OAB-MA"

#### Scenario: Diagnóstico sem identificar a plataforma

- **WHEN** o Centro de administração exibe o Status do sistema
- **THEN** cada aviso mostra título e descrição do problema
- **AND** não exibe o código `INVE-*` nem link para a documentação externa

### Requirement: Telas de configuração enxutas

As telas de configuração SHALL apresentar apenas o que um almoxarifado opera.
A seleção é feita por listas de permitidos em `src/frontend/src/defaults/oab.tsx`
(`OAB_SYSTEM_SETTINGS_PANELS`, `OAB_ADMIN_CENTER_PANELS`,
`OAB_USER_SETTINGS_PANELS`, `OAB_ADMIN_QUICK_ACTIONS`), sob a chave
`OAB_SIMPLIFY_SETTINGS` — desligá-la SHALL devolver todos os painéis originais.

Esconder o painel não basta: um grupo cujos painéis foram todos escondidos
continua desenhando o próprio título e a linha divisória. Os grupos MUST ser
filtrados junto com os painéis.

Dentro dos painéis mantidos, as chaves de fabricação, montagem, BOM, compra e
venda MUST ficar fora da lista.

As chaves `STOCK_TRACKING_DELETE_OLD_ENTRIES` e `STOCK_TRACKING_DELETE_DAYS`
MUST NOT ser expostas na interface: o histórico de movimentação é a prova de
quem retirou e para quem foi entregue, e não deve ser descartável por
configuração.

#### Scenario: Barra lateral sem módulos industriais

- **WHEN** um administrador abre as Configurações do sistema
- **THEN** não vê Produção, Compras, Vendas nem Pedidos de transferência
- **AND** o painel de materiais se chama Materiais, não Peças

#### Scenario: Atalho não leva a tela removida

- **WHEN** o Centro de administração exibe as Ações rápidas
- **THEN** só oferece atalhos cujos destinos continuam na navegação

### Requirement: Configuração inicial por comando

A preparação da instalação SHALL ser feita por `python manage.py oab_setup`,
idempotente, criando os perfis de acesso (Administrador, Almoxarifado,
Consulta) sobre os rulesets nativos, as unidades de medida do almoxarifado e o
nome institucional da instância.

Setores MUST NOT ser fixados em código: `--with-sectors` apenas semeia uma
lista inicial editável.

#### Scenario: Execução repetida não duplica

- **WHEN** `oab_setup` é executado duas vezes
- **THEN** nenhum grupo, unidade ou setor é duplicado
