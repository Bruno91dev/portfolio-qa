# Regras do BUG

Cada regra traz o porquê. O verificador (`scripts/verificar-bug.mjs`) cobra o que dá para cobrar por
máquina; o resto é critério do QA.

## 1. Antes de apontar um BUG: três passos, nesta ordem

Nenhum defeito vai para o plano, para o documento de bugs ou para a conversa como fato sem isto. Um
achado errado custa a credibilidade do QA diante do time.

1. **Confirmar no código, nas duas pontas.** Desconfiou ("esse campo não é lido", "esse fluxo
   quebra"), abrir o código antes de afirmar: que a coisa existe **e** que não existe em outro
   lugar (homônimo em outra classe, outro serviço com a mesma estrutura). Sem confirmação, é
   hipótese e se diz que é.
2. **Medir o que trafega ou é gravado.** Ler o código prova a regra, não o valor. Frase que começa
   com "a tela envia", "o backend grava", "esse campo chega como" exige medição: requisição
   capturada, valor lido no banco. Quando a medição contradiz a leitura, corrigir o documento na hora
   e dizer que a premissa caiu.
3. **Provar pelo git que o defeito é da tarefa** (quem criou o trecho, se a branch o altera). Antes
   de chamar de pré-existente, mais duas perguntas: **a branch torna o caminho alcançável?** (o
   defeito antigo só aparece no fluxo que a tarefa criou ou passou a exibir) **O code review desta
   tarefa pediu essa correção?** Se alguma for sim, é BUG da tarefa: o git prova a origem do trecho,
   não a do defeito que o usuário passa a ver. Só se as três respostas forem não e o defeito
   reproduzir na base, é pré-existente: avisar o QA com a origem, sem registrar, salvo pedido.

## 2. Só é BUG com prova de impacto

- **Estado interno estranho não é BUG até provar o impacto.** Ex.: formulário marcado como inválido
  sem nenhum campo em erro na tela. Prova: deixar todos os outros campos válidos e tentar a ação. Se
  a ação passa, não há BUG; se é barrada, é.
- **Estado que só se cria por fora** (dado inserido direto no banco, chamada forjada) só é BUG se
  também for alcançável por um caminho legítimo do usuário ou de outro sistema que grava o mesmo
  dado. Se nenhum caminho legítimo chega lá, é observação, não BUG.
- **Reproduzir em outra tela antes de culpar a tela.** Comportamento estranho em componente
  compartilhado (grade, formulário base, modal padrão): reproduzir numa segunda tela que use o mesmo
  componente. Se acontece nas duas, o BUG é do componente compartilhado, e a severidade e a área
  mudam.

## 3. Linguagem acessível

Quem lê primeiro pode ser o PO ou outro QA meses depois, sem conhecer a implementação.

| Campo | Para quem | Termo técnico |
|---|---|---|
| Título, Resumo, Descrição, Impacto | qualquer pessoa | não |
| Passos para Reproduzir | quem conhece o básico do sistema | não, exceto endereço da tela, configuração entre crases e o bloco de código para colar |
| Resultado Esperado e Obtido | qualquer pessoa | o mínimo, explicado |
| Evidências | técnico | só a prova |
| Ambiente, Camada afetada | técnico | sim |
| Sugestão de correção | dev | sim, e deve ter |

"Termo técnico" inclui rota de API, verbo HTTP, código de resposta, commit, arquivo, classe, função,
tabela, coluna e JSON.

- **Descrição:** só o problema e em que situação ocorre; o comportamento correto é do Resultado
  Esperado.
- **Passos:** sequenciais, do acesso à tela até o erro, com a massa concreta; o último passo já
  mostra o defeito. Tudo o que for preciso para reproduzir fica **no passo**, inclusive o trecho para
  colar no console, em bloco de código, no próprio passo que manda colar. Nunca mandar o leitor
  buscar em Evidências o que ele precisa para executar um passo.
- **Filtro antes de gravar:** "quem nunca viu esse problema entende o que está errado e reproduz só
  com a Descrição e os Passos?"

## 4. BUG enxuto

Meta de **1.500 a 2.000 caracteres** por BUG, teto de **3.000** (o bloco de código para colar não
conta). **Por quê:** BUG longo não é lido inteiro; os devs pediram só o necessário para entender e
reproduzir.

- **Resumo:** três linhas curtas (O quê / Onde / Por quê). **Descrição:** de 1 a 3 frases.
  **Resultados:** uma frase cada. **Impacto:** uma ou duas frases.
- **Evidências só com a prova:** o caminho da imagem entre crases (vídeo: o caminho e uma frase do
  que ele mostra). Sem prova visual possível, "Sem imagem:" e a prova numa linha. Nada de passo,
  endereço, configuração, causa ou "registrado no CT tal".
- **O "como eu provei" fica no plano.** Horários, registros conferidos, variações e comparações vão
  no Resultado Obtido e nos Pontos de Atenção do plano, não no BUG.

## 5. Sugestão de correção: a IA sugere, o dev aplica

A IA nunca altera o código do produto. A sugestão é uma das partes mais valiosas do reporte, e uma
sugestão errada atrapalha mais do que ajuda: custa uma rodada de desenvolvimento, um reteste e a
confiança no que o QA reporta.

**Formato:** três itens, depois a linha "Reteste: CTxxx".

1. **Problema:** a causa técnica em poucas linhas, com o ponto do código.
2. **Solução:** a de **menor impacto**, com arquivo, função e linha.
3. **Por que funciona:** por que resolve sem efeito colateral.

Cada item leva uma marca de confiança: **[Confirmado por medição]**, **[Leitura do código]**,
**[Hipótese pela leitura do código, não medida]** ou **[A conferir]**.

**Antes de escrever (o trabalho não aparece no texto):**

1. seguir o caminho inteiro no código da branch: quem chama a função, o que depende do que vai mudar;
2. levantar o alcance real (`git grep` de quem usa) e citar as telas afetadas;
3. ler o histórico do trecho, para não desfazer a correção de outra tarefa;
4. preferir o ajuste mais restrito; ponto compartilhado tem o impacto nas outras telas explicitado;
5. dizer o que não fazer quando a correção "óbvia" tem efeito colateral;
6. conferir cada arquivo e linha citados na branch;
7. na dúvida, não sugerir: marcar [A conferir] com a pergunta.

**Testada em todos os lugares que chamam o mesmo código.** Se a sugestão foi emulada (no console ou
num ambiente local), a emulação precisa passar por **todos os chamadores** da função alterada, não
só pelo caminho do BUG. Ex.: mudar `calcularDesconto` para corrigir o cupom no carrinho também muda
o desconto da vitrine e do aplicativo, que chamam a mesma função. A Solução só leva
[Confirmado por medição] se todos os chamadores foram exercitados; senão, [Leitura do código] para
os que não foram.

Perguntas que pegam sugestão furada: o ponto que vou alterar já é atravessado pelo caminho que hoje
funciona (risco de duplicar efeito)? Quem mais consome esse retorno e reagiria junto? O objeto em que
aplico a mudança é o mesmo entre as chamadas?

## 6. Outras regras

- **Sem dia e hora** de quando foi feito: versão, branch e commit identificam o ambiente; a ordem dos
  casos mostra o antes e o depois. Exceção: o tempo faz parte do defeito (prazo, validade,
  agendamento, fuso); aí o BUG leva `<!-- tempo relevante -->`.
- **Status da Correção:** BUG novo nasce com `Em análise pelo desenvolvedor`, nunca "Aguardando
  correção", "Pendente" ou "Aberto". Depois, dois momentos:
  1. ao abrir o reteste: `Corrigido pelo desenvolvedor — commit abc123, <o que mudou>.`;
  2. ao registrar o caso que reteste o BUG:
     `Corrigido e validado no Ciclo N (commit abc123): CT0XX aprovado. <o que passou a acontecer>.`
     ou `Não corrigido no Ciclo N (commit abc123): CT0XX reprovado. <o que continua acontecendo>.`
     Se a correção trouxe outro defeito: `A correção gerou o BUG-0XX.`
- **Registrar só o que o QA confirmou executando.** Achado de leitura do diff vai para os Pontos de
  Atenção do plano.
- **BUG retirado sai do documento:** o bloco e as citações a ele saem; renumerar os outros só com o
  ok do QA, porque o número pode já ter sido citado fora.
- **Sugestão de melhoria não é BUG** ("funciona, mas poderia ser melhor", sem divergência de
  requisito): registrar à parte, com Contexto, Sugestão e Motivação.
