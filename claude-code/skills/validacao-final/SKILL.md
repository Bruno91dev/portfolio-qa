---
name: validacao-final
description: Análise final e independente de risco antes de a tarefa ir para produção. Procura problemas que os testes podem não ter encontrado, partindo do código que a tarefa realmente alterou, separa bug confirmado, risco relevante e hipótese, e conclui com um veredito de bloqueio. Use quando o QA disser "validação final", "pré-produção", "vai subir para produção", "pode integrar?", "análise de risco antes de integrar", ou logo depois de encerrar um ciclo de teste.
---

# Validação final antes da produção

Responder **uma** pergunta:

> Existe algum problema relevante, não identificado nos testes, que possa causar impacto
> significativo ao cliente quando esta tarefa chegar à produção?

Não é repetir o plano de teste nem auditar o sistema: é procurar risco real **nas alterações desta
tarefa**. Não procurar problema a qualquer custo: terminar sem achado é um resultado legítimo e
frequente.

**Configuração:** o `CLAUDE.md` do projeto informa a **Pasta do código** (somente leitura) e a
**Branch base**. A IA não altera o código: o resultado é um parecer, e a correção, se houver, é do
dev.

## Modos

| Modo | Quando | O que analisar | Fecho |
|---|---|---|---|
| **Antes de integrar** | ciclo fechado sem nada em aberto | o diff inteiro da tarefa | um dos três vereditos do Passo 6 |
| **Antes de devolver** | ciclo que devolve a tarefa com correção pontual | o diff inteiro da tarefa | "Achados para o mesmo retorno" (nunca aprovado: há BUG aberto) |
| **Passada curta** | chegou correção depois de uma validação já feita | só os commits novos | um dos três vereditos, sobre esses commits |

**Por que o modo "antes de devolver":** o dev recebe os BUGs do ciclo e os achados da validação num
único retorno, e a tarefa não fica indo e vindo. Correção pendente **estrutural** (vai reescrever o
fluxo): não rodar agora; a análise envelheceria antes de ser usada.

## Passo 1 — Delimitar o que a tarefa alterou

Sem isso, toda conclusão sai sem dono. Sempre pelas referências remotas (a cópia local pode estar em
outra branch):

```bash
git -C "<Pasta do código>" fetch origin -q
git -C "<Pasta do código>" diff --stat origin/<base>...origin/<branch-da-tarefa>
git -C "<Pasta do código>" log --oneline <commit-do-ultimo-ciclo>..origin/<branch-da-tarefa>
```

Se a saída trouxer marca de corte ("+N more", "truncated"), algum filtro resumiu o diff: ler de novo
sem ele antes de concluir.

Cuidados que já produziram conclusão errada:

- **Branch que recebe merges de outras** infla o `--stat` para centenas de arquivos. Filtrar pelos
  arquivos da funcionalidade ou usar o intervalo desde o commit testado.
- **Alteração que nasceu e morreu dentro da tarefa** não é risco: comparar sempre contra a base. Uma
  linha adicionada num commit e revertida em outro não chega ao cliente.
- **Atribuir ao dono certo:** antes de apontar, provar pelo git que a linha é desta tarefa e fazer as
  duas perguntas: a branch torna o caminho alcançável? O code review pediu essa correção?

## Passo 2 — Triar o diff

Nesta ordem e só até onde houver relação técnica clara: arquivos → funções, componentes e serviços
alterados → endpoints e regras de negócio → fluxos afetados → dependências diretas.

Peso extra para o que tem alcance maior que a tela:

- **código compartilhado** (classe base, componente reutilizado, serviço comum, script de banco):
  uma linha ali vale por todas as telas que o usam;
- **chave, rota ou contrato** (o que viaja no endereço, o que o backend recebe e devolve).

## Passo 3 — O que a produção tem e o teste não tinha

Só os itens com relação com a alteração; não listar cenário por listar:

volume real de dados · configurações diferentes entre clientes · dado antigo, nulo ou inconsistente ·
perfis e permissões · processamento demorado e tempo esgotado · falha de comunicação · concorrência ·
integrações · consistência do que é gravado · regressão do que a alteração toca.

Perguntas que costumam render:

- A tela carrega a lista **inteira** para preencher uma caixa de seleção, sem busca incremental? O
  que acontece no cliente com dez mil registros?
- O limite de tamanho do campo na tela **bate com o tamanho da coluna** no banco?
- Um valor que passou a fazer parte do **endereço** da requisição pode conter texto livre, nulo ou
  caractere reservado?
- A alteração muda o comportamento para **dado nulo ou ausente**? A requisição passa a cair em
  **outra rota** existente?
- Há **concorrência** real (dois usuários, dois sistemas gravando o mesmo dado)?
- Erro sem tratamento pode aparecer **só em produção** (o ambiente de teste mostra no console, a
  produção leva para a página de erro)? A alteração cria um caminho de erro sem tratamento?

## Passo 4 — O que só existe em produção

Disparar cada bloco apenas quando a tarefa tiver a característica.

### 4.1 A tarefa criou ou mudou uma permissão?

O QA costuma testar como administrador e numa base limpa; a produção tem perfis antigos.

- Nos perfis que os clientes **já têm**, a permissão nova nasce **liberada ou negada**? Liberada por
  omissão dá acesso indevido; negada para todos vira chamado no dia seguinte, com a funcionalidade
  entregue e ninguém enxergando.
- Sem a permissão, o botão some da tela, ou aparece e falha só no backend?
- A rota está protegida contra entrada **pelo endereço**, e não só pelo menu? Sem permissão, a
  resposta esperada é "acesso negado"; outra resposta indica que a permissão não barrou.
- Uma chave de funcionalidade desligada não pode se disfarçar de falta de permissão.

### 4.2 Outro sistema lê ou grava o mesmo dado?

Aplicativo, sistema legado, integração ou relatório que usa a mesma base vai ler no mesmo dia o que a
tela passou a gravar.

- O outro lado **lê sem quebrar** o dado que a tela passou a aceitar (formato, tamanho, caractere
  especial, campo vazio)?
- A tela **bloqueia o que o outro lado bloqueia**? Regra que existe só de um lado gera dado que o
  outro considera inválido.
- Se a tela está migrando de um sistema para outro, a comparação é de **comportamento** (mesma
  crítica, mesma consequência), não de aparência.

Achado aqui costuma ser **RISCO RELEVANTE** ou **BUG CONFIRMADO**: dado inconsistente entre sistemas
não some com um F5.

## Passo 5 — Provar ou descartar, nunca supor

Ler o código não é medir. Antes de chamar de risco:

- conferir no código se a rota ou o caminho alternativo existe de fato;
- conferir no banco de teste (somente leitura) tamanho de coluna, nulidade e volume;
- conferir a instrumentação da página, se a sessão de teste ainda estiver ativa;
- reproduzir quando for barato: mandar o passo ao QA e medir (o Claude só executa com "pode executar
  você"); quando não for, dizer que não foi reproduzido.

**Registrar também o que foi descartado.** "Investiguei e não procede, porque X" mostra a cobertura
da análise e evita que a mesma dúvida volte no ciclo seguinte.

## Passo 6 — Classificar e concluir

| Rótulo | Quando |
|---|---|
| **BUG CONFIRMADO** | há evidência de que o problema ocorre |
| **RISCO RELEVANTE** | possibilidade concreta de impacto, sem reprodução |
| **HIPÓTESE** | possibilidade sem evidência suficiente |

Hipótese **nunca** é apresentada como bug. Problema visual ou detalhe sem impacto funcional não
bloqueia nesta etapa. Prioridade ao que possa bloquear o uso, impedir a conclusão de uma operação,
travar o sistema, perder ou corromper dado ou causar regressão no que a alteração toca.

**Veredito (um só):**

- **🛑 BLOQUEAR INTEGRAÇÃO** — bug confirmado ou risco relevante com impacto significativo.
- **⚠️ ATENÇÃO — NÃO BLOQUEANTE** — risco real, impacto insuficiente para segurar.
- **✅ APROVADO PARA INTEGRAÇÃO** — nada relevante nas alterações e nenhum BUG do ciclo em aberto.

Com BUG do ciclo em aberto, nunca ✅. Item já conhecido e decidido pelo QA (defeito aceito, fora de
escopo) entra como lembrete no fim, sem mudar o veredito.

## Formato da resposta

Curto, nesta ordem:

1. **Descartados** — o que foi investigado e não procede, com o motivo em uma linha.
2. **Achados** — um bloco por item: rótulo, o trecho de código ou a medição que sustenta, o efeito em
   produção e por que bloqueia (ou não).
3. **Itens já conhecidos** — uma linha cada.
4. **Veredito.**

A skill entrega parecer: não registra BUG por conta própria. Se o QA mandar registrar, seguir as
regras de BUG da skill `qa-testar`.

## Economia

`diff → código alterado → dependências diretas → comportamento → risco`. Não ler código sem relação
com a tarefa, não refazer o que os ciclos já concluíram, não inventar cenário para engordar a
análise. Alteração simples com risco claro merece análise objetiva.
