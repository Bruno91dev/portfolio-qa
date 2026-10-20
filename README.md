# Portfólio de QA — Bruno Marques

[![Testes](https://github.com/Bruno91dev/portfolio-qa/actions/workflows/testes.yml/badge.svg)](https://github.com/Bruno91dev/portfolio-qa/actions/workflows/testes.yml)

Sou **Analista de QA** e vim do suporte técnico. Este repositório mostra como eu trabalho: do plano de testes à execução, passando por validação de dados e pelo uso de IA no processo de QA.

🔗 [LinkedIn](https://www.linkedin.com/in/bruno-marques-334a15226)

---

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| [`docs/`](docs) | [Plano de testes](docs/plano-de-testes.md) baseado em risco, [casos de teste](docs/casos-de-teste.md) e [modelo de bug report](docs/modelo-bug-report.md) |
| [`postman/`](postman) | Coleção do Postman com 15 casos de teste da API [ServeRest](https://serverest.dev), com validações automáticas |
| [`sql/`](sql) | Consultas SQL para encontrar problemas de dados: duplicidade, registros órfãos, estoque negativo, totais divergentes |
| [`claude-code/`](claude-code) | Pacote que uso no QA com o **Claude Code**: skills, verificadores automáticos e uma trava de segurança |

## Testes de API (Postman)

A coleção testa cadastro de usuários, login, produtos, permissões e carrinho, incluindo regras de negócio como:
- usuário comum **não** pode cadastrar produto;
- o estoque **diminui** ao criar um carrinho e **volta** quando a compra é cancelada.

Cada execução cria os próprios dados e os **remove no final**, para não deixar sujeira em uma API pública.

**Rodar no Postman:** importe `postman/serverest.postman_collection.json` e clique em *Run collection*.

**Rodar pela linha de comando:**
```bash
npm install
npm run test:api
```

A coleção também roda automaticamente no **GitHub Actions** a cada alteração no repositório e uma vez por semana.

## Validação de dados (SQL)

O arquivo [`schema-e-dados.sql`](sql/schema-e-dados.sql) cria um banco de exemplo de loja virtual com problemas inseridos de propósito. As [consultas de validação](sql/consultas-validacao.sql) encontram cada um deles.

```bash
npm run test:sql
```

## IA no processo de QA (Claude Code)

Uso o Claude Code como assistente de QA num modelo simples: **eu executo os testes, a IA mede, cruza evidências e registra.** Versões genéricas do que uso no trabalho estão em [`claude-code/`](claude-code), com exemplos de uma loja virtual fictícia:

| Item | O que faz |
|---|---|
| [`qa-testar`](claude-code/skills/qa-testar/SKILL.md) | Ponto de entrada: identifica em que situação a tarefa está, resume o que o dev fez, monta o plano com piso de critérios e mapa de cobertura e conduz a execução |
| [`evidencia-bug`](claude-code/skills/evidencia-bug/SKILL.md) | Monta a evidência do BUG em prancha: só o que prova o defeito, vermelho no erro e azul no que está certo |
| [`validacao-final`](claude-code/skills/validacao-final/SKILL.md) | Análise de risco antes da produção, a partir do código alterado, com veredito de bloqueio |
| [`validacao-visual`](claude-code/skills/validacao-visual/SKILL.md) | Validação de UX e visual com scripts que auditam a tela no navegador |
| [Verificadores](claude-code/skills/qa-testar/scripts) | Scripts que conferem o plano de teste e o texto do BUG antes de chegarem a alguém, como um lint |
| [Trava da pasta do código](claude-code/hooks/trava-pasta-do-codigo) | Hook que impede a IA de alterar o código do produto: ela sugere a correção, o dev aplica |

Os verificadores e a trava têm testes automáticos:

```bash
npm run test:ia
```

> A IA acelera a análise, mas a decisão sobre o que testar e o que é bug continua sendo do QA.

## Ferramentas

Postman · Newman · SQL · Claude Code · Node.js · GitHub Actions

## Próximos passos

- [ ] Automação de testes de interface (E2E) no front-end da ServeRest
- [ ] Relatório HTML das execuções da coleção
