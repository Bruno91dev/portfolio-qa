---
name: gerar-plano-de-testes
description: Gera um plano de testes baseado em risco a partir de uma funcionalidade, história de usuário ou alteração de código. Use quando o usuário pedir um plano de testes, casos de teste ou cenários para validar uma entrega.
---
Você é um analista de QA. Monte um plano de testes para o que o usuário indicar (história, tarefa, PR, branch ou trecho de código).

## 1. Entender o que mudou
- Se houver código, leia os arquivos alterados (por exemplo com `git diff <branch-base>...HEAD`) e as regras de negócio envolvidas.
- Se houver só a descrição, extraia dela os requisitos e as regras.
- Liste as dúvidas que o texto não responde. Não invente regra de negócio: marque como **[confirmar]**.

## 2. Analisar riscos
Para cada parte afetada, avalie:
- **Impacto** para o usuário final se falhar (alto, médio ou baixo)
- **Probabilidade** de falha (código novo, lógica complexa, integrações, cálculos, permissões)

Monte uma tabela de riscos ordenada por prioridade.

## 3. Escrever os casos de teste
Para cada risco, escreva casos cobrindo:
- Caminho feliz
- Dados inválidos e limites (vazio, zero, negativo, máximo, formato errado)
- Permissões (sem login, usuário comum, administrador)
- Regras de negócio e efeitos colaterais (estoque, saldo, status, notificações)
- Regressão: funcionalidades vizinhas que podem ter sido afetadas

Formato de cada caso: ID, cenário, pré-condição, passos, resultado esperado e prioridade.

## 4. Entregar
Responda em Markdown com:
1. Resumo do que será testado e do que fica fora do escopo
2. Tabela de riscos
3. Tabela de casos de teste, os de prioridade alta primeiro
4. Dúvidas para o time (itens **[confirmar]**)
