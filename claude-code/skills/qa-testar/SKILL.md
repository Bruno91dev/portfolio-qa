---
name: qa-testar
description: Ponto de entrada do QA para testar uma tarefa com o Claude Code. Diagnostica em que situação a tarefa está (nova, bateria parada no meio, aguardando o dev, correção entregue para reteste, decisão pendente do PO, ciclo encerrado), resume o que o dev fez a partir do diff, monta o plano com piso de critérios e mapa de cobertura e conduz a execução no modo "QA executa, IA mede" - o QA age na tela, o Claude instrumenta, mede quando o QA diz "pode medir" e registra no plano e no documento de bugs. Use quando o QA disser "vamos testar a tarefa X", "continua de onde paramos", "o que ficou pendente", "manda o passo a passo", "chegou correção para retestar" ou "em que ponto eu estava".
---

# Ciclo de teste: QA executa, IA mede

O QA executa na interface; o Claude prepara, mede e registra.

- **O Claude não dirige a interface para executar os casos**, salvo autorização explícita do QA
  ("pode executar você"), que vale para o caso ou o trecho autorizado e não se estende sozinha aos
  seguintes. Por quê: o teste vale pelo olhar humano (foco, cursor, mensagem que pisca) e pelo
  clique real; o Claude rende mais medindo o que o QA não vê.
- **Abrir a página e instrumentar é sempre do Claude**, antes do passo a passo. **O login é sempre
  do QA**: o Claude nunca digita senha.
- **A IA nunca altera o código do produto.** Lê, compara branches, sugere a correção; quem aplica é
  o dev. A trava (hook) que acompanha este pacote bloqueia escrita na pasta do código, mas a regra
  vale mesmo sem ela.

## Passo 0 — Configuração e regras (uma vez por sessão)

1. Ler no `CLAUDE.md` do projeto: **Pasta do código** (somente leitura), **Pasta de QA** (planos,
   bugs e evidências, fora da pasta do código), **Endereço da aplicação em teste**, **Branch base**
   e a convenção do nome da branch da tarefa. Faltando algum, perguntar ao QA uma vez e sugerir
   que ele acrescente ao `CLAUDE.md`.
2. Documentos da tarefa, sempre na Pasta de QA: `plano-<tarefa>.md`, `bugs-<tarefa>.md` e
   `evidencias/<tarefa>/`.
3. Ler **inteiros**, da pasta desta skill, `referencias/regras-do-plano.md` e
   `referencias/regras-do-bug.md`. Numa retomada dentro da mesma sessão, não ler de novo.

## Passo 1 — Diagnosticar a situação (obrigatório, antes de qualquer passo a passo)

Esta skill é a porta de entrada para **qualquer** momento da tarefa: primeira vez, retomada depois
de uma pausa, volta de correção. Nunca mandar o primeiro caso sem este passo: é ele que decide o
caminho.

### 1.1 Qual é a tarefa

- **Com número:** usar o informado.
- **Sem número** ("continua de onde paramos"): pegar o plano mexido por último na Pasta de QA,
  fazer o diagnóstico dele (só leitura) e **confirmar no fim**: "Era a tarefa X que você queria
  retomar?", citando as outras em andamento. Nada é gravado antes da confirmação.

### 1.2 O que existe localmente

Rodar o verificador do plano, que também mostra o **placar do ciclo atual** e o primeiro pendente:

```bash
node "<pasta desta skill>/scripts/verificar-plano.mjs" "<Pasta de QA>/plano-<tarefa>.md"
```

O placar a usar é o do ciclo atual, não a soma de todas as rodadas: o histórico somado não
representa o presente.

**Corte temporal para o item 1.3:** a data de abertura do ciclo atual (está no cabeçalho da seção de
reteste); sem reteste, a última atualização que o QA publicou na tarefa. Nunca a data de alteração
do arquivo sozinha. Por quê: qualquer edição local depois de um comentário do dev empurra essa data
para a frente e esconde a novidade.

### 1.3 O que mudou desde o corte

O QA traz da ferramenta de tarefas da equipe (ou cola na conversa) os comentários posteriores ao
corte: decisão do PO, dev informando correção. O Claude confere os commits da branch:

```bash
git -C "<Pasta do código>" fetch origin -q
git -C "<Pasta do código>" log --oneline --since="<data do corte>" origin/<branch-da-tarefa>
```

**As duas fontes precisam bater.** BUG dado como corrigido sem commit correspondente (ou commit sem
aviso do dev) não entra no ciclo: mostrar ao QA e perguntar antes de retestar.

### 1.4 Decidir o caminho

| Situação medida | Caminho |
|---|---|
| Sem plano | **Tarefa nova** → Passo 2 e Passo 3 |
| Plano sem nenhum caso executado | **Bateria não iniciada** → confirmar o escopo com o QA e ir ao Passo 4 |
| Ciclo atual com casos `⏳ Pendente` | **Bateria parada no meio** → continuar do primeiro pendente; reinstrumentar a página |
| `⏸️ Aguardando definição` e o PO respondeu | **Decisão do PO** → atualizar o caso e o placar; sem reteste |
| BUG dado como corrigido **e** commit novo | **Reteste** → seção nova no fim do plano (Passo 2) e Passo 3 |
| Só uma das duas fontes indica correção | **Divergência** → mostrar ao QA e perguntar; não retestar |
| BUGs abertos, sem correção nem commit | **Aguardando o dev** → mostrar o estado e parar |
| Ciclo atual sem nada aberto | **Ciclo encerrado** → oferecer a `validacao-final` e o Diário de Bordo |

Mais de uma situação ao mesmo tempo: tratar a do PO primeiro e depois abrir o reteste.

**Antes de seguir, mostrar ao QA, curto e nesta ordem:** onde paramos; placar do ciclo atual; o que
está aberto (CT, motivo e BUG, em tabela); novidades desde o corte; o caminho escolhido, com a
pergunta de confirmação. Não repetir o plano inteiro.

## Passo 2 — Fechar o escopo e escrever antes de executar

**Tarefa nova — análise antes de escrever qualquer caso:**

1. Ler a tarefa inteira: descrição, **critérios de aceite**, **roteiro de teste do dev**,
   comentários e anexos.
2. Ler o diff da branch contra a base, **pelas referências remotas** (a cópia local pode estar em
   outra branch):
   ```bash
   git -C "<Pasta do código>" diff --stat origin/<base>...origin/<branch-da-tarefa>
   git -C "<Pasta do código>" diff origin/<base>...origin/<branch-da-tarefa> -- <arquivo>
   ```
   Conferir que o diff veio inteiro: se a saída trouxer marca de corte ("+N more", "truncated"),
   algum filtro resumiu a saída; ler de novo sem ele antes de concluir qualquer coisa.
3. Cruzar o que foi pedido, o que foi alterado e **quem mais usa o código alterado**
   (`git -C "<Pasta do código>" grep -n "<nome>" origin/<branch-da-tarefa>`). Código de uso amplo
   pede regressão nos consumidores.
4. Pelo que o diff toca, acrescentar: **filtro criado ou alterado** → par de prova (uma opção que
   traz registros e uma que traz a lista vazia, conferindo a condição enviada); **mudança no que se
   vê** (estilo, layout, estrutura do template) → caso visual com a skill `validacao-visual`.
5. Montar a **proposta de escopo** pelas regras do plano: o **piso** (todo critério de aceite e
   todo item do roteiro do dev), o que a análise de risco **acrescenta**, a tabela
   `|CT|O que testa|Papel|Por que fica|`, a lista "O que fica fora" com o motivo e o **mapa de
   cobertura** com o CT previsto para cada trecho alterado.
6. **Gravar o plano só com o ok do QA**, no modelo `modelos/plano-de-teste.md` desta pasta.

**Nunca montar o plano só pela descrição da tarefa.**

**Reteste:** seção nova no fim do plano, `### N. Reteste - Ciclo X (dd/mm/aaaa)`, sem tocar nas
rodadas anteriores; subitens da seção em `####`. Na mesma hora, atualizar o **Status da Correção**
de cada BUG com o que o dev informou e o commit.

**Depois de gravar**, rodar o verificador do plano e corrigir todo ERRO antes do primeiro passo a
passo. Ele confere tabelas, IDs, status, âncora do pendente, numeração, piso, mapa e seções.

## Passo 3 — Resumo didático do que o dev fez (junto com o escopo)

Antes do primeiro passo a passo, um resumo **curto**, na conversa, tirado do diff real:

- **Tarefa nova:** qual era o problema → o que o dev criou ou alterou (função, classe, arquivo) →
  por que isso resolve. Ex.: "O carrinho recusava cupom com produto em promoção. O dev passou a
  filtrar os itens em promoção em `aplicarCupom` antes do cálculo, então o desconto vale só para os
  demais."
- **Reteste:** um parágrafo curto por BUG dado como corrigido.
- Termo técnico ganha meia frase de explicação na hora ("validador = código que confere os dados
  antes de gravar").

Por quê: o QA entende a lógica da alteração, testa melhor e aprende o sistema por dentro.

## Passo 4 — Abrir e instrumentar a página (uma vez por sessão e depois de todo F5)

**Aplicação web:** o Claude abre o Endereço da aplicação no navegador que ele controla e injeta
`scripts/instrumentar.js` (pasta desta skill) pela ferramenta de executar JavaScript. Ele cria:

- `window.__reqLog` — verbo, endereço, corpo, status e resposta de erro de cada chamada ao backend;
- `window.__msgLog` — toasts, diálogos e mensagens de erro de campo, no mesmo relógio do `__reqLog`.

Reinjetar sempre que o QA der F5 ou a página navegar por endereço. Confirmar que ficou ativo
**antes** de o QA agir. Se o retorno vier na tela de login, pedir que o QA entre e conferir de novo.

**Ramo alterado sem rastro** (tratamento de erro, valor padrão, nulo): mandar ao QA arquivo e linha
para criar um *logpoint* no DevTools (Sources → botão direito no número da linha → *Add logpoint*)
com a mensagem `'[CB] <arquivo>:<linha> <ramo>'`. O logpoint escreve no console sem parar a execução
e sem alterar o código.

**Aplicação desktop ou só backend:** não há página para instrumentar. Mede-se pelo log da aplicação,
por breakpoints, pelo log do serviço, pela resposta da API e pelo banco de teste (somente leitura).

## Passo 5 — Mandar o passo a passo

Um caso por vez, numerado e curto. Incluir o que só o olho humano percebe (cursor, foco, diálogo que
aparece e some) e pedir que o QA relate isso junto com o "pode medir".

**Antes de mandar, conferir o que o passo cita.** Erro no passo a passo (botão com outro nome, aba
que não aparece naquele estado) foi o defeito que mais se repetiu quando os ciclos foram medidos.

- **Web:** no DOM da tela aberta, conferir que cada aba, botão, campo e coluna citados existem e
  estão visíveis nesse estado. Tela ainda não aberta se confere no código da branch (template,
  arquivo de tradução, rotas), nunca navegando na aba do QA: navegar derruba a instrumentação.
- **Desktop:** conferir o rótulo exato e a aba do controle no arquivo de layout da tela, na branch
  da tarefa (`git -C "<Pasta do código>" show origin/<branch>:<arquivo>`).
- **Premissa:** caso que depende de configuração, permissão ou chave tem o estado conferido antes.
- **Nomes concretos:** tela, produto, cliente e usuário pelo nome da massa, nunca "um produto
  qualquer".

Se o caso prevê F5 no meio, medir **antes** dele: o recarregamento apaga o log.

## Passo 6 — Medir (uma vez por caso, quando o QA diz "pode medir")

Do mais barato ao mais caro:

1. estado do formulário pelas ferramentas de desenvolvimento do framework (valor real, alterado,
   válido, controles inválidos);
2. `__reqLog` e `__msgLog`;
3. banco de teste, quando o caso trata de dado gravado (somente leitura);
4. console do navegador, sempre com filtro e limite; logpoints com o filtro `\[CB\]`;
5. DOM, só quando o dado não estiver no formulário.

Em cada medição, anotar quais trechos do mapa o caso executou e o que provou isso: vai para a
coluna **Prova de execução**.

**Não tirar captura de tela para medir.** A exceção é a evidência de BUG: todo BUG que puder ser
provado numa imagem ganha a imagem ao ser registrado, pela skill `evidencia-bug`. Caso visual vai
para a skill `validacao-visual`, recortada ao escopo do caso.

### Caminho real antes de simulação

Primeiro o caminho que o usuário percorre de verdade. Simulação (forçar falha, inserir dado direto
no banco, desviar requisição) só quando o caminho real é impossível ou proibitivo, e sempre com a
pergunta **"isso prova 100% ou deixa brecha?"** dita ao QA, junto com o que a indução prova e o que
fica de fora. Por quê: dado criado por fora pode ter forma que a tela nunca produziria, e o teste
passa a provar outra coisa.

- **Forçar falha do backend:** desviar a requisição para um endereço inexistente, avisar o QA que é
  indução e declarar a ressalva no registro do caso. Só o F5 remove o desvio por completo.
- **Envio forçado que grava** (pelo console, com a sessão do QA): reler o registro imediatamente
  antes, numa chamada anterior e nunca em paralelo, e conferir se a aba do QA está no mesmo
  registro. Por quê: uma gravação em lote paralela já apagou o que o QA tinha acabado de salvar.

## Passo 7 — Registrar na hora, antes do caso seguinte

Gravar o resultado sem carregar o plano inteiro no contexto:

```bash
node "<pasta desta skill>/scripts/registrar-caso.mjs" --plano "<Pasta de QA>/plano-<tarefa>.md" \
  --ancora "<trecho final e único do Resultado Esperado>" \
  --obtido "<o que aconteceu, no passado>" --status aprovado
```

| Status | Quando |
|---|---|
| `✅ Aprovado` | executado e conforme o esperado |
| `⚠️ Aprovado com ressalva` | funciona, com defeito de baixo impacto (gera BUG) |
| `❌ Reprovado` | não atende ao esperado (gera BUG) |
| `⏸️ Aguardando definição` | depende de decisão do PO ou do negócio |
| `OK` | só o CT000 de tarefa que não é correção |
| `⏳ Pendente` | ainda não executado (âncora do `registrar-caso.mjs`) |

No mesmo registro:

- trocar o `⏳` da **Prova de execução** no mapa pelo que provou que o trecho rodou; trecho que devia
  rodar e não deixou rastro vira `Sem prova de execução: <motivo>`;
- atualizar **Resultados e Conclusão** (ou o fecho da seção de reteste);
- risco resolvido nos **Pontos de Atenção** fica riscado e marcado *Resolvido no CT0XX*;
- caso de reteste: atualizar o **Status da Correção** do BUG com o resultado (modelo em
  `referencias/regras-do-bug.md`);
- caso novo no meio da execução entra logo abaixo do relacionado, com renumeração dos seguintes e
  das referências; o verificador acusa repetição, ordem e lacuna.

Para mudar um caso já preenchido: localizar a linha com busca, ler só aquele trecho e editar.

**BUG:** escrever pelas regras de `referencias/regras-do-bug.md` e pelo modelo `modelos/bugs.md`;
depois, sempre:

```bash
node "<pasta desta skill>/scripts/verificar-bug.mjs" "<Pasta de QA>/bugs-<tarefa>.md"
```

## Fechar o ciclo

1. `verificar-plano.mjs "<plano>" --fim-ciclo`: dá ERRO se sobrar caso pendente ou `⏳` no mapa.
   Trecho `Inalcançável` ou `Sem prova de execução` entra no resumo como ponto a levar ao dev.
2. Oferecer a skill `validacao-final`:
   - ciclo sem nada em aberto → antes de a tarefa ir para produção;
   - ciclo que devolve a tarefa com correção **pontual** → **antes de devolver**, para o dev
     receber os BUGs e os achados num único retorno (a tarefa não fica indo e vindo);
   - correção **estrutural** (vai reescrever o fluxo) → depois dela; a análise envelheceria.

### Diário de Bordo (na conversa, para o QA copiar)

- Título `Diário de Bordo – dd/mm/aaaa`; poucos parágrafos curtos, sem listas nem tabelas.
- Impessoal e em voz passiva ("Realizados os testes...", "foi identificado...").
- Sem detalhe técnico; BUG só pelo ID. Ordem: o que o ciclo testou → o que foi encontrado → desfecho.
- Só ganha nome o que ficou pendente.

> Diário de Bordo – 14/05/2026
>
> Realizados os testes referentes às correções dos bugs reportados no ciclo anterior.
>
> Durante as validações, foi identificado que o BUG-002 não foi corrigido por completo: o desconto
> passou a ser mantido no cartão de crédito, mas não no boleto. O comportamento foi registrado no
> BUG-004.
>
> Diante do apontamento, a tarefa foi retornada para correção.

## Cuidado ao gravar Markdown

Não gravar `.md` com trechos de código por comando de shell (`echo`, `bash -c`): o shell interpreta
o que está entre crases e apaga pedaços do texto. Usar a ferramenta de escrita de arquivo.
