---
name: escrever-bug-report
description: Transforma anotações soltas sobre um defeito em um bug report claro e reproduzível. Use quando o usuário descrever um bug encontrado e pedir para registrá-lo.
---
Transforme a descrição do usuário em um bug report seguindo o modelo do arquivo `docs/modelo-bug-report.md` deste repositório.

## Regras
- **Título**: `[Módulo] o que acontece + em qual situação`. Nada de "erro no sistema".
- **Passos para reproduzir**: numerados, um passo por ação, com os dados usados.
- **Esperado x obtido**: sempre separados. Se o resultado esperado não estiver claro, pergunte ou marque **[confirmar]**.
- **Severidade e prioridade**: sugira e explique em uma linha. A decisão final é do QA.
- **Impacto para o cliente**: descreva como o problema afeta quem usa o sistema.
- Se faltar informação essencial (ambiente, perfil do usuário, dados), liste as perguntas no final em vez de inventar.
- Se houver requisição e resposta de API, inclua as duas em blocos de código, **removendo tokens, senhas e dados pessoais**.

## Entrega
O bug report pronto em Markdown, para copiar na ferramenta de gestão do time.
