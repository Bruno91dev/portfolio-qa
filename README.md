# Portfólio de QA — Bruno Marques

[![Testes de API](https://github.com/Bruno91dev/portfolio-qa/actions/workflows/testes.yml/badge.svg)](https://github.com/Bruno91dev/portfolio-qa/actions/workflows/testes.yml)

Sou **Analista de QA** e vim do suporte técnico. Este repositório mostra como eu trabalho: do plano de testes à execução, passando por validação de dados e pelo uso de IA no processo de QA.

🔗 [LinkedIn](https://www.linkedin.com/in/bruno-marques-334a15226)

---

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| [`docs/`](docs) | [Plano de testes](docs/plano-de-testes.md) baseado em risco, [casos de teste](docs/casos-de-teste.md) e [modelo de bug report](docs/modelo-bug-report.md) |
| [`postman/`](postman) | Coleção do Postman com 15 casos de teste da API [ServeRest](https://serverest.dev), com validações automáticas |
| [`sql/`](sql) | Consultas SQL para encontrar problemas de dados: duplicidade, registros órfãos, estoque negativo, totais divergentes |
| [`claude-skills/`](claude-skills) | Skills que criei para usar o **Claude Code** como assistente de QA |

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

Uso o Claude Code como assistente nos testes: ele lê o código alterado e me ajuda a enxergar riscos e a montar planos de teste mais precisos. As skills estão em [`claude-skills/`](claude-skills):

| Skill | O que faz |
|---|---|
| [`gerar-plano-de-testes`](claude-skills/gerar-plano-de-testes/SKILL.md) | Monta um plano de testes baseado em risco a partir de uma história, tarefa ou alteração de código |
| [`analisar-riscos-de-mudanca`](claude-skills/analisar-riscos-de-mudanca/SKILL.md) | Lê o diff de uma branch e aponta onde a mudança pode quebrar algo e o que precisa de reteste |
| [`escrever-bug-report`](claude-skills/escrever-bug-report/SKILL.md) | Transforma anotações soltas em um bug report claro e reproduzível |

> A IA acelera a análise, mas a decisão sobre o que testar e o que é bug continua sendo do QA.

## Ferramentas

Postman · Newman · SQL · Claude Code · GitHub Actions

## Próximos passos

- [ ] Automação de testes de interface (E2E) no front-end da ServeRest
- [ ] Relatório HTML das execuções da coleção
