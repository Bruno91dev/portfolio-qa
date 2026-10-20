## Tarefa #123 - Cupom de desconto recusado com produto em promoção no carrinho (Web)

### 1. Objetivo do Teste

O cliente da loja não conseguia usar um cupom de desconto quando o carrinho tinha algum produto em promoção: a tela dizia que o cupom era inválido. O desenvolvedor passou a aplicar o cupom só nos produtos sem promoção, como a regra comercial manda. O teste precisa confirmar que:

- o cupom é aceito com produto em promoção no carrinho e desconta só dos produtos sem promoção;
- o cupom continua recusado quando todos os produtos estão em promoção, com mensagem clara;
- o total do pedido e o valor gravado no pedido batem com o que a tela mostra.

### 2. Cenários de Teste

- **Cenário 1: Reprodução do problema**
    - Confirmar que, antes da correção, o cupom era recusado com produto em promoção no carrinho.
- **Cenário 2: Carrinho misto**
    - Aplicar o cupom com um produto em promoção e um sem promoção e conferir o desconto.
    - Fechar o pedido e conferir o valor gravado.
- **Cenário 3: Carrinho só com promoção**
    - Aplicar o cupom com todos os produtos em promoção e conferir a mensagem.

### 3. Casos de Teste

|ID|Descrição|Passos|Resultado Esperado|Resultado Obtido|Status|
|---|---|---|---|---|---|
|**CT000**|Reprodução do problema|1. Na versão anterior à correção, colocar no carrinho a Caneca Azul (em promoção) e a Camiseta Básica.  <br>  <br>2. Informar o cupom BEMVINDO10 e clicar em Aplicar.|A tela recusa o cupom com a mensagem "Cupom inválido", como no relato do cliente.|A tela recusou o cupom com a mensagem "Cupom inválido", confirmando o problema.|✅ Aprovado|
|**CT001**|Cupom com carrinho misto|1. Colocar no carrinho a Caneca Azul (em promoção, R$ 30,00) e a Camiseta Básica (R$ 50,00).  <br>  <br>2. Informar o cupom BEMVINDO10 e clicar em Aplicar.  <br>  <br>3. Olhar o resumo do carrinho.|O cupom é aceito e o desconto é de R$ 5,00 (10% só da Camiseta Básica). Total de R$ 75,00.|O cupom foi aceito com desconto de R$ 5,00 e total de R$ 75,00.|✅ Aprovado|
|**CT002**|Valor gravado no pedido|1. Com o carrinho do CT001, clicar em Finalizar compra e concluir com o boleto.  <br>  <br>2. Abrir Meus pedidos e o pedido recém-criado.|O pedido mostra desconto de R$ 5,00 e total de R$ 75,00, iguais ao carrinho.|O pedido mostrou desconto de R$ 5,00 e total de R$ 75,00, iguais ao carrinho; o banco de teste gravou os mesmos valores.|✅ Aprovado|
|**CT003**|Cupom com carrinho só de promoção|1. Esvaziar o carrinho e colocar só a Caneca Azul (em promoção).  <br>  <br>2. Informar o cupom BEMVINDO10 e clicar em Aplicar.|O cupom é recusado com a mensagem "Este cupom não vale para produtos em promoção".|O cupom foi recusado com a mensagem "Este cupom não vale para produtos em promoção".|✅ Aprovado|

### 4. Resultados e Conclusão

Total de casos testados: 04
Casos aprovados: 04
Casos reprovados: 00
Defeitos encontrados: Nenhum
Conclusão: A correção foi validada: o cupom passou a valer para os produtos sem promoção e o valor gravado bate com a tela.

### 5. Pontos de Atenção

- `CarrinhoService.aplicarCupom` passou a filtrar os itens com `emPromocao = true` antes de calcular o desconto. O mesmo serviço é usado pelo carrinho do aplicativo: o CT002 cobre o cálculo, que é compartilhado.
- **Piso do plano** (critérios de aceite e roteiro do dev):

|Origem|Item|CT que cobre|
|---|---|---|
|Critério de aceite|Cupom vale para os produtos sem promoção|CT001|
|Critério de aceite|Carrinho só com promoção recusa o cupom com mensagem clara|CT003|
|Roteiro do dev|Conferir o total no pedido finalizado|CT002|

- **Mapa de cobertura do diff:**

|Arquivo e método|Trecho ou ramo alterado|CT que executa|Prova de execução|
|---|---|---|---|
|`CarrinhoService`, `aplicarCupom`|Há item sem promoção: desconto só sobre esses itens|CT001, CT002|Resposta do cálculo com desconto 5,00 e pedido gravado com 5,00|
|`CarrinhoService`, `aplicarCupom`|Todos os itens em promoção: recusa com mensagem nova|CT003|Mensagem nova na tela e cálculo devolvido sem desconto|
|`mensagens.pt-BR`|Texto da mensagem nova|—|Sem lógica executável: só tradução|

### 6. Casos Descartados por Escopo

- Cupom de frete grátis: a correção não toca o cálculo do frete.
