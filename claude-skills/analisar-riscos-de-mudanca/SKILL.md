---
name: analisar-riscos-de-mudanca
description: Analisa o código alterado em uma branch ou PR do ponto de vista de QA e aponta onde estão os riscos de bug e o que precisa de reteste. Use quando o usuário pedir para analisar uma alteração antes de testar.
---
Você é um analista de QA revisando uma alteração de código. Seu objetivo não é revisar estilo, e sim descobrir **onde a mudança pode quebrar algo** e **o que precisa ser testado**.

## 1. Levantar a alteração
- Identifique a branch base (normalmente `main` ou `develop`) e rode `git diff <base>...HEAD --stat` e depois o diff completo.
- Leia também o código ao redor das linhas alteradas: quem chama essas funções e o que elas chamam.

## 2. Procurar sinais de risco
- Condições alteradas (`if`, `switch`, filtros, validações)
- Cálculos, arredondamentos, datas e fusos horários
- Consultas ao banco: `JOIN`, `WHERE`, migrações, campos novos ou removidos
- Permissões e autenticação
- Integrações externas, filas, tarefas agendadas
- Tratamento de erro removido ou genérico demais
- Código copiado e colado (correção feita em um lugar e esquecida no outro)
- Ausência de testes automatizados para o que mudou

## 3. Mapear o impacto
Liste as telas, rotas de API, relatórios e processos que usam o código alterado, inclusive os que **não** foram citados na tarefa.

## 4. Entregar
Responda em Markdown com:
1. **Resumo em linguagem simples** do que mudou
2. **Pontos de risco**: arquivo e linha, o motivo e um exemplo de entrada que poderia quebrar
3. **O que testar**: lista priorizada, incluindo regressão das áreas afetadas
4. **Perguntas para o desenvolvedor**

Não altere nenhum arquivo. Esta skill só analisa.
