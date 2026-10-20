# Bugs da tarefa #123

### BUG-001

**Descrição de Bug**

- **ID do Bug:** BUG-001
- **Título:** Total do pedido ignora o cupom quando o cliente troca a forma de pagamento
- **Resumo:**
    - **O quê:** o desconto do cupom some do total ao trocar a forma de pagamento.
    - **Onde:** etapa de pagamento da finalização da compra.
    - **Por quê:** o total é recalculado sem o cupom já aplicado.
- **Descrição:** Depois de aplicar um cupom no carrinho, trocar a forma de pagamento na finalização da compra faz o total voltar ao valor sem desconto.
- **Passos para Reproduzir:**
    1. Acessar a loja de teste em `https://loja-teste.exemplo.com/carrinho` e colocar a Camiseta Básica no carrinho.
    2. Informar o cupom BEMVINDO10 e clicar em Aplicar. O total fica em R$ 45,00.
    3. Clicar em Finalizar compra, escolher Boleto e trocar para Cartão de crédito.
    4. Olhar o total na etapa de pagamento: aparece R$ 50,00.
- **Resultado Esperado:** O total continua em R$ 45,00 com qualquer forma de pagamento.
- **Resultado Obtido:** O total volta para R$ 50,00 depois da troca, sem o desconto.
- **Evidências:** `evidencias/123/123-BUG-001-total-sem-cupom.png`
- **Ambiente:**
    - Versão do sistema: 2.4.0 (backend `tarefa-123` @ `a1b2c3d`, base `main`)
- **Camada afetada:** Backend
- **Prioridade:** Alta
- **Impacto:** O cliente paga mais do que o carrinho anunciou e pode desistir da compra.
- **Status da Correção:** Em análise pelo desenvolvedor

---

#### Sugestão de correção (não aplicada — apenas indicação dos pontos)

1. **Problema:** **[Confirmado por medição]** `PagamentoService.recalcularTotal` monta o total a partir dos itens e não lê o cupom guardado no carrinho.
2. **Solução:** **[Leitura do código]** Reaproveitar `CarrinhoService.totalComCupom` dentro de `recalcularTotal`, em vez de somar os itens de novo.
3. **Por que funciona:** **[Leitura do código]** O cupom passa a ser calculado num só lugar; o aplicativo, que também chama `recalcularTotal`, recebe o mesmo valor.

Reteste: CT004.
