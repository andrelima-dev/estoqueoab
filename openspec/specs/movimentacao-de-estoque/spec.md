# movimentacao-de-estoque Specification

## Purpose

Registrar entradas, saídas, transferências e ajustes do almoxarifado da OAB-MA
com rastreabilidade completa, reaproveitando o motor de estoque do InvenTree
(`stock.StockItem` e `stock.StockItemTracking`) em vez de recriá-lo.

O app Django `oab` complementa esse motor com os dados institucionais que o
InvenTree não modela: destino, solicitante, responsável pela retirada e
documento.

## Requirements

### Requirement: Saldo delegado ao InvenTree

O sistema SHALL delegar toda alteração de saldo aos métodos do próprio
`StockItem` (`add_stock`, `take_stock`, `move`, `splitStock`), de modo que a
trilha de auditoria nativa (`StockItemTracking`) continue sendo gerada.

O sistema MUST NOT manter uma contagem de saldo própria e paralela.

#### Scenario: Entrada gera trilha nativa

- **WHEN** uma entrada é registrada em `/api/oab/entry/`
- **THEN** o saldo do material aumenta
- **AND** uma entrada de `StockItemTracking` é criada e vinculada ao registro
  `oab.StockMovement` correspondente

#### Scenario: Saída consome em ordem de chegada

- **WHEN** uma saída é registrada e existe mais de um item de estoque do
  material no local de origem
- **THEN** o consumo ocorre na ordem de criação dos itens (FIFO)

### Requirement: Registro institucional de cada movimentação

Cada movimentação SHALL gerar um registro `oab.StockMovement` contendo tipo,
material, quantidade, saldo anterior, saldo posterior, local de origem, local
de destino, usuário do sistema e data/hora.

O registro SHALL manter cópia denormalizada do nome do material, para que o
histórico sobreviva à exclusão do item de estoque de origem.

#### Scenario: Saldos anterior e posterior

- **WHEN** um material com saldo total 50 recebe uma saída de 5
- **THEN** o registro guarda `quantity_before = 50` e `quantity_after = 45`

#### Scenario: Transferência não altera o saldo total

- **WHEN** uma transferência move 10 unidades entre dois locais
- **THEN** `quantity_before` e `quantity_after` são iguais
- **AND** `location_from` e `location_to` registram os dois locais

### Requirement: Separação entre quem registra e quem recebe

O sistema SHALL distinguir o **usuário do sistema** que registrou a operação
(campo `user`, preenchido automaticamente com o usuário autenticado) do
**responsável físico** que retirou ou recebeu o material (campo `handler`,
texto livre).

Essa separação existe porque poucas pessoas têm acesso ao sistema, mas é
preciso responsabilizar terceiros que retiram material.

#### Scenario: Saída exige o responsável pela retirada

- **WHEN** uma saída é enviada sem o campo `handler`
- **THEN** a API responde 400 com erro no campo `handler`

#### Scenario: Responsável e usuário são campos distintos

- **WHEN** o usuário `almoxarifado` registra uma saída entregue a
  "Carlos Santos"
- **THEN** `user` é `almoxarifado` e `handler` é "Carlos Santos"
- **AND** o histórico exibe as duas informações em colunas separadas

### Requirement: Destino digitado em texto livre

O destino de uma saída SHALL aceitar texto livre (`sector_name`), resolvido
contra o cadastro de `oab.Sector` sem distinção de maiúsculas nem espaços em
volta. Um destino desconhecido SHALL ser criado no cadastro.

A resolução SHALL ocorrer dentro da transação da operação, para que uma
movimentação recusada não deixe destino órfão.

#### Scenario: Destino novo entra no cadastro

- **WHEN** uma saída informa `sector_name = "Comissão de Eventos 2026"` e esse
  destino ainda não existe
- **THEN** o destino é criado e vinculado à movimentação

#### Scenario: Destino conhecido é reaproveitado

- **WHEN** uma saída informa `sector_name = "  tecnologia da informação  "` e
  já existe o setor "Tecnologia da Informação"
- **THEN** o setor existente é reutilizado, sem duplicar o cadastro

#### Scenario: Operação recusada não cria destino

- **WHEN** uma saída com destino inédito é recusada por saldo insuficiente
- **THEN** nenhum novo `Sector` é criado

### Requirement: Local digitado pode ser avulso

Ao digitar um local que ainda não existe, a interface SHALL oferecer a escolha
de guardá-lo ou não no cadastro (`save_location`). A escolha SHALL aparecer
apenas para um nome novo — um local já cadastrado não vira avulso por ter sido
digitado de novo — e o padrão SHALL ser guardar.

Um local avulso SHALL ser sugerido apenas enquanto guardar material. Assim que
esvazia, sai da lista: serviu a uma movimentação específica e não deve poluir o
cadastro para sempre. Enquanto tiver saldo continua disponível, senão não
haveria como retirar o material de lá.

Um local avulso MUST NOT ser apagado ao esvaziar. O histórico de movimentações
aponta para ele, e é essa a prova de para onde o material foi; apagá-lo anularia
a referência (`on_delete=SET_NULL`) e deixaria o registro sem destino.

#### Scenario: Local de passagem não polui o cadastro

- **WHEN** uma transferência cria "Sala do Evento" com `save_location = false`
- **AND** depois o material é retirado de lá
- **THEN** "Sala do Evento" deixa de ser sugerida como destino
- **AND** a movimentação original continua registrando o destino

#### Scenario: Escolha não aparece para local existente

- **WHEN** o operador digita o nome de um local já cadastrado
- **THEN** a opção de guardar não é exibida

### Requirement: Origem restrita aos locais com saldo

O campo de local de origem de uma saída ou transferência SHALL oferecer apenas
os locais que têm o material selecionado, exibindo o saldo de cada um. Havendo
um único local possível, ele SHALL ser preenchido automaticamente.

Oferecer todos os locais cadastrados é uma armadilha: o material aparece com o
saldo total ao lado do nome, o operador escolhe um local qualquer e a operação
é recusada por saldo insuficiente, sem dizer onde o material está.

O saldo exibido junto ao material é o total entre todos os locais; o saldo da
operação é o do local de origem. A tela MUST deixar essa diferença visível, e
não obrigar o operador a descobri-la por tentativa.

#### Scenario: Único local é escolhido sozinho

- **WHEN** o material selecionado só tem saldo em um local
- **THEN** esse local é preenchido como origem, com o saldo ao lado

#### Scenario: Local sem saldo não é ofertado

- **WHEN** existe um local cadastrado sem saldo do material
- **THEN** ele não aparece entre as origens possíveis

### Requirement: Local de estoque digitado em texto livre

O local de destino de uma entrada (`location_name`) e de uma transferência
(`location_to_name`) SHALL aceitar texto livre, resolvido contra o cadastro de
locais sem distinção de maiúsculas nem espaços em volta. Um local desconhecido
SHALL ser criado.

Exigir cadastro prévio trava a operação: numa instalação nova, com um único
local, não há para onde transferir.

A resolução SHALL ocorrer dentro da transação da operação, para que uma
movimentação recusada não deixe local órfão.

Consultas de saldo por local MUST partir do banco, e não dos campos de árvore
(MPTT) de um objeto já carregado. Locais são inseridos em ordem alfabética
(`order_insertion_by`), então cadastrar um local renumera a árvore e torna
obsoleto o objeto em memória — a consulta cairia na árvore errada e reportaria
saldo zero, recusando a movimentação sem motivo.

#### Scenario: Local novo entra no cadastro

- **WHEN** uma transferência informa `location_to_name = "Sala da Presidência"`
  e esse local ainda não existe
- **THEN** o local é criado e recebe o material

#### Scenario: Destino igual à origem é recusado

- **WHEN** o nome digitado corresponde ao próprio local de origem
- **THEN** a transferência é recusada

#### Scenario: Saldo não se perde ao criar um local

- **WHEN** um local cujo nome antecede alfabeticamente os demais é criado
- **THEN** o saldo dos locais já existentes continua sendo encontrado

### Requirement: Saída limitada ao saldo disponível

O backend SHALL recusar saídas e transferências cuja quantidade exceda o saldo
disponível no local de origem, independentemente do que a interface permita.

#### Scenario: Saída acima do disponível

- **WHEN** existem 10 unidades e é solicitada uma saída de 25
- **THEN** a API responde 400 com erro no campo `quantity`
- **AND** o saldo permanece 10

### Requirement: Histórico imutável

O histórico de movimentações SHALL ser somente leitura pela API. Correções
SHALL ser feitas por meio de uma nova movimentação de ajuste, nunca apagando ou
editando registros anteriores.

#### Scenario: Exclusão recusada

- **WHEN** um DELETE é enviado a `/api/oab/movement/<pk>/`
- **THEN** a API responde 405

#### Scenario: Ajuste registra a diferença

- **WHEN** um ajuste informa a quantidade contada em um local
- **THEN** o sistema aplica apenas a diferença
- **AND** registra uma movimentação do tipo AJUSTE com justificativa
  obrigatória

### Requirement: Exportação legível

A exportação de um relatório SHALL conter colunas legíveis: nomes de local,
setor e usuário, e não as chaves estrangeiras. Um relatório com "Local de
origem = 1" não serve a quem precisa lê-lo.

Colunas técnicas — identificadores internos, código bruto do tipo de
movimentação, referência ao registro de auditoria — MUST ficar fora.

Arquivos de texto (CSV, TSV) MUST ser gravados em UTF-8 com marca de ordem de
bytes. `tablib` devolve texto, e sem codificação explícita o arquivo sai no
encoding padrão do sistema — cp1252 no Windows — corrompendo todos os acentos.
A marca também faz o Excel abrir o arquivo corretamente.

Etiquetas em português MUST NOT coincidir com palavras inglesas presentes no
catálogo de tradução: `_('Data')` é traduzido para "Dados", porque "Data" é
também a palavra inglesa.

#### Scenario: Relatório legível por quem não conhece o banco

- **WHEN** o histórico é exportado em CSV
- **THEN** as colunas de local, setor e usuário trazem nomes
- **AND** os acentos aparecem corretamente ao abrir no Excel

### Requirement: Horário no fuso da Seccional

O servidor SHALL operar no fuso do Maranhão (`timezone: America/Fortaleza`, UTC−3
sem horário de verão). O padrão do InvenTree é UTC, que adianta os registros em
três horas.

A conversão MUST ser feita pelo servidor: o formato de data da API
(`DATETIME_FORMAT = '%Y-%m-%d %H:%M'`) não carrega o fuso, então o horário
precisa chegar à interface já convertido — não há como o navegador corrigi-lo.

Isso vale também para os contadores de "hoje": em UTC o dia virava às 21h,
hora local, e movimentações da noite entravam no dia seguinte.

Os registros continuam gravados em UTC no banco. Trocar o fuso muda a
apresentação, não o dado.

#### Scenario: Horário confere com o relógio

- **WHEN** uma movimentação é registrada às 17h49 no Maranhão
- **THEN** o histórico exibe 17:49

### Requirement: Histórico filtrável por período

O histórico SHALL oferecer atalhos de período — hoje, 7 dias e 30 dias — junto
com campos de data inicial e final visíveis na própria página, sem exigir a
gaveta de filtros.

Os atalhos MUST escrever nos mesmos filtros `min_date` / `max_date` usados pela
gaveta, e não manter estado próprio: com duas fontes de verdade o período
exibido divergiria do período consultado.

O período padrão SHALL ser "tudo". Esconder movimentações por padrão faria o
operador procurar um registro que existe e não aparece.

#### Scenario: Atalho define a data inicial

- **WHEN** o operador escolhe "7 dias"
- **THEN** o campo de data inicial passa a mostrar a data de 6 dias atrás
- **AND** o contador de filtros ativos registra o filtro aplicado

#### Scenario: Intervalo próprio desmarca o atalho

- **WHEN** o operador digita datas que não correspondem a nenhum atalho
- **THEN** a seleção passa a indicar "Personalizado"

### Requirement: Itens zerados preservados

O sistema SHALL manter `STOCK_DELETE_DEPLETED_DEFAULT = False`, para que um
item de estoque que chega a zero não seja apagado.

Apagar o item desvincularia as entradas de auditoria (`item = None`) e
quebraria a rastreabilidade.

#### Scenario: Saldo zerado mantém o item

- **WHEN** uma saída zera o saldo de um material
- **THEN** o `StockItem` permanece com quantidade 0
- **AND** nenhuma entrada de `StockItemTracking` fica órfã

### Requirement: Permissões verificadas no backend

As operações de estoque SHALL exigir a permissão `stock.add` do sistema de
rulesets nativo do InvenTree, aplicada no backend e não apenas na interface.

#### Scenario: Perfil de consulta é recusado

- **WHEN** um usuário do grupo "Consulta" envia POST para `/api/oab/entry/` ou
  `/api/oab/issue/`
- **THEN** a API responde 403
- **AND** a leitura do histórico continua permitida
