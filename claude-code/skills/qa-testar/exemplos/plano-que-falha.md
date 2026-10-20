## Tarefa #123 - Cupom de desconto recusado com produto em promoção no carrinho (Web)

### 1. Objetivo do Teste

Exemplo com erros plantados para testar o verificador. Cada erro esperado está anotado no fim.

### 2. Cenários de Teste

- **Cenário 1: Carrinho misto**
    - Aplicar o cupom com um produto em promoção e um sem promoção.

### 3. Casos de Teste

|ID|Descrição|Passos|Resultado Esperado|Resultado Obtido|Status|
|---|---|---|---|---|---|
|**CT000**|Reprodução do problema|É uma correção; reproduzir na versão anterior.|A tela recusa o cupom.|A tela recusou o cupom em 10/05/2026 às 14:30.|✅ Aprovado|
|CT1|Cupom com carrinho misto|1. Colocar a Caneca Azul e a Camiseta Básica no carrinho.|O desconto é de R$ 5,00.||⏳ Pendente|
|**CT002**|Valor gravado no pedido|1. Finalizar a compra.|O pedido mostra o desconto de R$ 5,00.|O pedido mostrou R$ 5,00.|⏳ Pendente|
|**CT002**|Mensagem com produto em promoção|1. Aplicar o cupom com só a Caneca Azul.|Aparece a mensagem "não vale para promoção" \| sem desconto.||⏳ Pendente|
|**CT005**|Carrinho vazio|1. Aplicar o cupom sem produto.|O botão Aplicar fica desabilitado.|| ⏳ Pendente|
|**CT006**|Cupom expirado|1. Aplicar o cupom VERAO.|A tela recusa o cupom.|Recusou.|Sim|⏳ Pendente|
|**CT007**|Cupom em maiúsculas e minúsculas|1. Aplicar bemvindo10.|O cupom é aceito.||Pendente|

### 4. Resultados e Conclusão

Total de casos testados: 01

### 5. Pontos de Atenção

|Origem|Item|CT que cobre|
|---|---|---|
|Critério de aceite|Cupom vale para os produtos sem promoção||
|Roteiro do dev|Conferir o total no pedido finalizado|CT009|

|Arquivo e método|Trecho ou ramo alterado|CT que executa|Prova de execução|
|---|---|---|---|
|`CarrinhoService`, `aplicarCupom`|Há item sem promoção|CT001|⏳|
|`CarrinhoService`, `aplicarCupom`|Todos os itens em promoção||⏳|

<!--
Erros que o verificador deve acusar neste arquivo:
- seção "Casos Descartados por Escopo" ausente;
- CT1 fora do padrão **CT000**;
- CT002 pendente com Resultado Obtido preenchido;
- CT002 repetido;
- barra vertical escapada e número de colunas errado (linha do segundo CT002);
- CT005 pendente sem a âncora exata (espaço sobrando antes do emoji);
- CT006 com uma coluna a mais;
- CT007 com status fora do modelo;
- item do piso sem CT e item do piso citando CT009, que não existe;
- ramo do mapa sem CT; CT001 citado no mapa, mas não existe (o caso está como CT1).
Avisos: data e hora no Resultado Obtido do CT000; lacuna na numeração; mapa com ⏳.
Com --fim-ciclo: casos pendentes e ⏳ no mapa viram ERRO.
-->
