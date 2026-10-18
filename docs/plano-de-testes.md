# Plano de Testes — API ServeRest

| Item | Detalhe |
|---|---|
| Sistema | [ServeRest](https://serverest.dev): API REST pública que simula uma loja virtual |
| Autor | Bruno Marques |
| Versão do plano | 1.0 |
| Tipo de teste | Funcional, caixa-preta, regressão, regras de negócio |

## 1. Objetivo

Garantir que as funcionalidades principais da API (cadastro de usuários, login, produtos e carrinhos) funcionam conforme a documentação e que as regras de negócio são respeitadas, principalmente as que afetam o cliente final: permissões, estoque e mensagens de erro.

## 2. Escopo

### Dentro do escopo
| Módulo | Endpoints |
|---|---|
| Usuários | `POST /usuarios`, `GET /usuarios/{id}`, `DELETE /usuarios/{id}` |
| Login | `POST /login` |
| Produtos | `POST /produtos`, `GET /produtos/{id}`, `DELETE /produtos/{id}` |
| Carrinhos | `POST /carrinhos`, `DELETE /carrinhos/cancelar-compra` |

### Fora do escopo
- Testes de carga e desempenho (a API é pública e compartilhada)
- Testes de segurança aprofundados (força bruta, injeção)
- Interface web (front.serverest.dev)

## 3. Estratégia

1. **Análise da documentação** (Swagger) para levantar requisitos e regras de negócio.
2. **Análise de risco**: priorizar o que causa maior impacto ao usuário se falhar.
3. **Técnicas de teste**:
   - Particionamento de equivalência (dados válidos x inválidos)
   - Teste de permissões (sem token, usuário comum, administrador)
   - Teste de regras de negócio (estoque reduz ao criar carrinho e volta ao cancelar)
4. **Execução** com Postman; a coleção valida status, mensagens e dados de cada resposta.
5. **Dados de teste** gerados a cada execução (e-mails e nomes únicos) e **removidos no final**, para não deixar sujeira em um ambiente compartilhado.

## 4. Análise de risco

| Risco | Impacto | Probabilidade | Prioridade |
|---|---|---|---|
| Usuário comum conseguir cadastrar produtos | Alto | Média | 🔴 Alta |
| Estoque não ser devolvido ao cancelar uma compra | Alto | Média | 🔴 Alta |
| Login aceitar senha errada | Alto | Baixa | 🔴 Alta |
| Cadastro duplicado de e-mail | Médio | Média | 🟡 Média |
| Mensagens de erro pouco claras para o usuário | Médio | Média | 🟡 Média |
| Tempo de resposta alto | Baixo | Baixa | 🟢 Baixa |

## 5. Critérios

**Entrada**
- API disponível em `https://serverest.dev`
- Documentação Swagger acessível

**Saída**
- 100% dos casos de prioridade alta executados
- Nenhum bug crítico em aberto
- Defeitos encontrados registrados com o [modelo de bug report](modelo-bug-report.md)

## 6. Casos de teste

Os casos detalhados estão em [casos-de-teste.md](casos-de-teste.md) e automatizados na [coleção do Postman](../postman/serverest.postman_collection.json).

## 7. Ambiente e ferramentas

| Ferramenta | Uso |
|---|---|
| Postman | Execução e validação das requisições |
| Newman | Execução da coleção pela linha de comando e no CI |
| GitHub Actions | Roda a coleção a cada alteração no repositório |
| Claude Code | Apoio na análise de requisitos e elaboração deste plano |
