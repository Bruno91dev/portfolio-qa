# Bugs da tarefa #123

### BUG-001

**Descrição de Bug**

- **ID do Bug:** BUG-001
- **Título:** POST /api/pedidos devolve 500 quando o cupom está expirado
- **Resumo:**
    - **O quê:** a finalização da compra falha com cupom expirado.
    - **Onde:** finalização da compra.
    - **Por quê:** o `validarCupom` lança exceção sem tratamento.
- **Descrição:** No teste de 12/05/2026, às 15:42, o `PedidoController.criar` gravou na tabela PEDIDOS_ITENS e devolveu erro.
- **Passos para Reproduzir:**
    1. Colocar a Camiseta Básica no carrinho.
    2. Informar o cupom VERAO e clicar em Finalizar compra.
- **Resultado Esperado:** A tela avisa que o cupom expirou.
- **Resultado Obtido:** Aparece "Erro inesperado".
- **Evidências:** Registrado no CT006 do plano. Como reproduzir: abrir o console e colar o trecho abaixo.
- **Ambiente:**
    - Versão do sistema: 2.4.0
- **Prioridade:** Alta
- **Impacto:** O cliente não consegue comprar.
- **Status da Correção:** Aguardando correção

---

#### Sugestão de correção (não aplicada — apenas indicação dos pontos)

1. **Problema:** `validarCupom` não trata cupom expirado.
2. **Solução:** **[Leitura do código]** Tratar a exceção em `PedidoController.criar`.

<!--
Erros que o verificador deve acusar neste BUG:
- termo técnico no Título (verbo HTTP, rota de API, código de resposta), no Resumo e na Descrição
  (código entre crases, identificador de código, nome de tabela);
- data e hora de quando foi feito, na Descrição;
- Evidências com referência ao caso de teste e instrução de reprodução, fora do formato;
- falta o campo Camada afetada;
- Status da Correção "Aguardando correção";
- Sugestão sem o item "Por que funciona" e item "Problema" sem marca de confiança.
-->
