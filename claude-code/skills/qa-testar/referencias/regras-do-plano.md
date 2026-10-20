# Regras do plano de teste

Cada regra traz o porquê. O verificador (`scripts/verificar-plano.mjs`) cobra o que dá para cobrar
por máquina; o resto é critério do QA.

## 1. Fluxo: nunca pular etapas

1. Ler a tarefa inteira: descrição, critérios de aceite, roteiro do dev, comentários, anexos.
2. Ler o diff da branch contra a base **antes** de escrever qualquer caso.
3. Cruzar tarefa e diff e só então propor o escopo.
4. Propor o escopo **já auditado**: tabela `|CT|O que testa|Papel|Por que fica|` (Papel = validação
   direta, cenário relacionado, regressão, lacuna; "Por que fica" = risco concreto tirado do diff,
   marcando quando é hipótese de leitura do código), a lista "O que fica fora" e o mapa de cobertura.
5. Gravar só com o ok do QA.

**Por quê:** plano escrito só pela descrição testa o que foi pedido, não o que foi feito. Os
defeitos moram na diferença entre os dois.

## 2. Escopo: cobertura máxima necessária com a quantidade mínima de casos

- **Piso obrigatório: critérios de aceite e roteiro do dev.** Todo critério de aceite e todo item do
  roteiro de teste publicado pelo dev entram no plano, mesmo quando a leitura do código indica risco
  baixo. A análise de risco decide o que se **acrescenta** e como **consolidar** (vários itens num
  caso com vários passos), **nunca o que se tira** do piso. Item que o próprio dev marcou como
  inalcançável vai para o plano como `Inalcançável: <motivo>`, citado ao QA.
  **Por quê:** o critério é o contrato com o negócio e o roteiro é o que o dev espera que alguém
  confira; cortar um deles por "risco baixo" deixa o contrato sem verificação. O plano registra o
  piso numa tabela `|Origem|Item|CT que cobre|` nos Pontos de Atenção, que o verificador confere.
- **Crivo de cada caso acrescentado:** "essa funcionalidade foi criada, alterada ou pode ter sido
  impactada diretamente pela tarefa? Existe risco real?" Se não, fica fora. "É barato, vai que..."
  não é justificativa.
- **Regressão direcionada:** só o que usa a mesma regra, componente, serviço, endpoint ou fluxo
  alterado, mapeado pelo código, nunca por suposição. Revalidar tudo dilui a atenção do que mudou.
- **Por tipo de tarefa:** correção → o cenário que falhava, a confirmação, variações ligadas à
  correção e a regressão do código alterado; funcionalidade nova → funcionamento principal, regras,
  negativos que comprometem o uso, integrações diretas; melhoria → o comportamento modificado, os
  fluxos dependentes e a regressão.
- **Lógica só movida** (mudou de lugar ou de nome, sem mudar a regra): um caso de referência na base
  e um de comparação na branch, em vez de um caso por ramo.
- **Par de prova do filtro:** todo filtro criado ou alterado é testado com uma opção que deve trazer
  registros e uma que deve trazer a lista vazia, conferindo a condição enviada ou o banco.
  **Por quê:** é o único jeito de pegar o filtro que aparece na tela e não filtra, sem dar erro.
- **Proibido criar caso** para aumentar a contagem, para comportamento óbvio sem risco, variação
  irrelevante da mesma validação ou par positivo/negativo automático.
- **Antes de entregar, três perguntas:** (1) consolidar o que valida o mesmo comportamento;
  (2) "se este caso sair, algum requisito ou risco real fica sem validação?"; (3) "se este caso
  sair, algum trecho do mapa de cobertura fica sem CT?".
- **Todo caso cortado** vai para "Casos Descartados por Escopo", com o motivo. O corte precisa ser
  auditável.

## 3. Linguagem acessível

Quem lê o plano pode ser o PO, outro QA ou alguém que nunca viu o sistema.

| Parte | Para quem | Termo técnico |
|---|---|---|
| Título e Objetivo | qualquer pessoa | não: o problema e o que o teste confirma |
| Cenários, Descrição e Passos | qualquer pessoa | não |
| Resultado Esperado e Obtido | qualquer pessoa | o mínimo, explicado na hora |
| Pontos de Atenção | QA e dev | sim: é o lugar do técnico |

- **Passos:** do começo ao fim, sem "configure conforme necessário", com telas, menus, botões e
  campos escritos **exatamente como aparecem na tela**. O último passo diz onde olhar.
- **Condição que só se cria tecnicamente** (forçar erro, derrubar serviço): em termos reais no passo
  ("com o serviço de pagamento fora do ar") e o como nos Pontos de Atenção.
- **Sem dia e hora** de quando o caso foi executado, salvo quando o tempo é o que se testa (prazo,
  validade, agendamento, fuso).
- **Filtro antes de gravar:** "quem não conhece o sistema executa cada caso só com os Passos e sabe
  se passou só com o Resultado Esperado?" Se não, reescrever.

## 4. Estrutura

- Título: `## Tarefa #<número> - <título descritivo> (<plataforma>)`
- `### 1. Objetivo do Teste` · `### 2. Cenários de Teste` (uma lista aninhada, sem linha em branco
  entre cenários, para colar direto na ferramenta de tarefas) · `### 3. Casos de Teste` ·
  `### 4. Resultados e Conclusão` · `### 5. Pontos de Atenção` (termina com o piso e o mapa) ·
  `### 6. Casos Descartados por Escopo`. Seções de reteste continuam a numeração.
- Tabela de casos com exatamente `|ID|Descrição|Passos|Resultado Esperado|Resultado Obtido|Status|`.
- Resultados e Conclusão atualizados **a cada caso registrado**, não só no fim, em dois dígitos.

## 5. Regras dos casos

- IDs `**CT000**`: negrito, três dígitos, inteiros e em ordem crescente; nunca `CT032.1`.
- **CT000 é a reprodução do problema.** Em tarefa que não é correção, o CT000 traz a justificativa
  nos Passos e o status `OK`.
- Passos numerados dentro da célula, separados por `  <br>  <br>`.
- Caso pendente termina exatamente com `<resultado esperado> | | ⏳ Pendente |`: é a âncora do
  `registrar-caso.mjs`.
- **Nenhuma barra vertical dentro de célula**, nem escapada: as ferramentas de tarefas a tratam como
  separador e deslocam o Status. Escrever "barra vertical" por extenso.
- **Cada coluna contém só o que o nome diz.** O Resultado Obtido reescreve o esperado no passado, em
  uma ou duas frases, sem repetir o status nem colar log; ressalva e reprovação citam o
  `**BUG-00N**`.
- **Caso que deixa de se aplicar** (critério retirado, decisão do PO) é excluído e os seguintes
  renumerados, nunca mantido como "não se aplica".
- **Achado que a tarefa não causou** não entra no caso. Exceções: o defeito antigo que só aparece no
  caminho que a tarefa tornou alcançável, ou que o code review pediu para corrigir, é da tarefa; em
  tarefa de melhoria geral de uma tela, todo erro da tela é da tarefa.

## 6. Reteste: não é repetição do plano original

Quando a tarefa volta de correção, acrescenta-se `### N. Reteste - Ciclo X (dd/mm/aaaa)` no fim do
plano. **As seções anteriores não se tocam**: elas são o registro do que foi feito e do que foi
publicado.

O reteste responde a duas perguntas: a correção resolveu o BUG? A alteração pode ter causado
regressão no que é **diretamente** relacionado? A cadeia é BUG → correção → comportamento esperado →
impacto direto → possível regressão; caso que não contribui para ela não entra.

- **Começa pela análise:** tabela `BUG | commit | arquivo | mudança | alcance`.
- **Prioridade:** (1) validação direta de cada BUG corrigido; (2) variações do mesmo fluxo ligadas
  à correção; (3) regressão só do que compartilha componente, função, endpoint, regra ou dado.
- **Revisão crítica:** "se eu remover este caso, ainda afirmo com segurança que a correção foi
  validada?" Se sim, remover, desde que nenhum trecho do mapa fique sem CT.
- **Pontos de Atenção do Ciclo X** dentro da seção (`####`), terminando no mapa dos commits da
  correção. Risco antigo resolvido agora é anotado aqui, nunca riscado na seção antiga.
- **Lacunas do ciclo anterior** (caso pendente, critério não exercitado, trecho que nenhum caso
  executou) num subitem próprio, nunca misturado aos casos de reteste.
- **Fecho:** o que ficou fora do ciclo e por quê, e o bloco Resultados e Conclusão só do ciclo.

## 7. Mapa de cobertura: trecho alterado → caso de teste → prova de execução

**Todo trecho alterado precisa ser executado por pelo menos um caso.** Há erros que só aparecem com
o programa rodando, e a leitura do código não substitui a execução.

- **Cobertura de decisão, não matriz de combinações:** cada ramo alterado (os dois lados de um `if`
  alterado, cada `case`, o `catch`, o valor padrão) é percorrido por algum caso.
- Último item dos Pontos de Atenção (no reteste, dos Pontos de Atenção do ciclo), uma linha por ramo
  ou bloco:

|Arquivo e método|Trecho ou ramo alterado|CT que executa|Prova de execução|
|---|---|---|---|
|`CarrinhoService`, `aplicarCupom`|Há item sem promoção: desconto só sobre esses itens|CT001|⏳|

- **CT que executa** sai na proposta de escopo. **Prova de execução** é preenchida no registro do
  caso com o que mostrou que o trecho rodou (requisição, mensagem, gravação no banco, logpoint,
  breakpoint). Antes da execução: `⏳`.
- Trecho sem lógica executável (import, comentário, tradução) entra agrupado, com CT `—` e prova
  `Sem lógica executável: <motivo>`.
- Ramo que nenhum caso alcança: **falta caso** (criar) ou é **inalcançável** (apurar e registrar
  `Inalcançável: <motivo>`). A célula nunca fica vazia. Ramo executado sem rastro vira
  `Sem prova de execução: <motivo>` e é risco a levar ao dev.
- **Todo corte de caso** responde também: "algum trecho do mapa fica sem CT?"

**Por quê:** o mapa transforma "testei o que importava" em algo que outra pessoa confere linha por
linha, e mostra exatamente o que ficou sem prova.
