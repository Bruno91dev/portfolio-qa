---
name: evidencia-bug
description: Escolhe a evidência pelo tipo de BUG (print do QA conferido, um painel, prancha de comparação ou vídeo curto) e monta a imagem do campo Evidências no padrão de prancha - título do BUG, painéis com faixa e legenda, destaque vermelho no defeito e azul no que está certo, rodapé com o esperado e o ambiente - contendo só o necessário para provar o BUG. Gera a prancha a partir de uma especificação JSON e confere o resultado antes de entregar. Use quando o QA disser "monta a evidência do BUG", "gera a imagem do BUG-xxx", "print do bug", "tira a evidência", e sempre que um BUG que pode ser provado visualmente for registrado, sem esperar o pedido.
---

# Evidência de BUG em prancha

A imagem **prova** o BUG: quem a abre entende o defeito sem ler mais nada. Ela fica no campo
Evidências; o "como eu provei" fica no plano de teste.

**Configuração:** o `CLAUDE.md` do projeto informa a **Pasta de QA**. As evidências ficam em
`<Pasta de QA>/evidencias/<tarefa>/`, com nome `<tarefa>-BUG-xxx-<descricao-curta>.png`; capturas de
origem e a especificação ficam em `<Pasta de QA>/evidencias/<tarefa>/origem/BUG-xxx/`, para regerar
a prancha se o QA pedir ajuste.

## Regras (valem para toda evidência)

1. **Só o necessário para provar o BUG.** Nada de painel "de praxe". BUG de gravação ("salva o valor
   errado") se prova com o registro **reaberto na tela**, não com o banco.
2. **A forma segue o tipo de BUG** (dizer a escolha ao QA antes de capturar):

   | Tipo de BUG | Evidência |
   |---|---|
   | Defeito visível numa tela só (mensagem errada, campo cortado, valor errado) | **1 painel**, ou o **print do QA** |
   | O defeito só aparece comparando (antes e depois, certo e errado, versão anterior) | **prancha com 2 painéis** |
   | Comportamento em sequência (algo some, pisca, muda sozinho, clique que não faz nada) | **só o vídeo curto**, sem prancha |

   Na dúvida entre imagem e vídeo: "quem abrir só a imagem entende o defeito?" Se não, é vídeo.
3. **Cores:** vermelho = o defeito; azul = o que está certo (referência, antes, controle). O
   destaque envolve o elemento **exato** (campo, botão, linha, mensagem), não uma área grande.
4. **A legenda descreve só o que o painel mostra.** Se a prova de uma afirmação está em outro painel,
   a legenda não a faz. Por quê: legenda que afirma o que a imagem não mostra derruba a confiança na
   prancha inteira.
5. **Explicar o que pode enganar.** Se o destaque pega algo que parece outra coisa, a legenda diz.
6. **Painel de texto** (log, resposta da API, banco) **só quando a tela corta o conteúdo**, sempre
   com a `origem`. O script recusa painel de texto sem origem.
7. **Nada de passo, pré-condição ou configuração na imagem:** isso vai nos Passos do BUG. O rodapé
   tem só `Esperado:` e o ambiente (versão, branch, commit), sem data nem hora.
8. **Dado medido, nunca inventado.** Todo print vem da tela real desta execução; todo texto vem da
   fonte citada, copiado sem editar (pode cortar linhas, não reescrever).
9. **Sem dado sensível desnecessário:** senha, token, dado pessoal real fora da massa de teste.

## Fluxo

### 1. Planejar (antes de capturar)

Classificar o BUG pela tabela da regra 2 e dizer ao QA, em até 3 linhas, a forma, o que cada painel
prova e o que será destacado. Ex.: "2 painéis: à esquerda o campo Cidade dentro da margem (azul), à
direita o campo Rua passando da borda (vermelho)". Se a prova depende de um estado que o QA ainda vai
criar na tela, combinar o momento da captura.

### 2. Capturar

A captura é sempre do estado real da tela; o QA deixa a tela no ponto e avisa ("pode capturar").

- **Web:** captura de tela pelo navegador que o Claude controla, recortada na área útil (a captura
  inteira fica ilegível na prancha). Se o elemento do defeito estiver invisível, não desenhar
  destaque em área vazia: provar pela comparação com a tela normal.
- **Desktop ou outra janela:** o QA captura com a ferramenta do sistema operacional e informa o
  arquivo; o Claude copia para a pasta `origem`.
- **Print do QA (tela única):** o QA recorta e pode marcar o defeito na própria ferramenta de
  captura. O Claude copia para a pasta da tarefa com o nome do padrão, **abre a imagem** e confere se
  ela prova o BUG sozinha (defeito visível, recorte legível, sem dado sensível). Se faltar algo, dizer
  o quê e pedir outro recorte.
- **Vídeo:** o QA grava de 5 a 20 s com o gravador do sistema operacional, só o trecho do defeito,
  começando no estado anterior ao clique. O Claude combina o roteiro antes (estado inicial, ação, o
  que fica na tela no fim) e confere pela instrumentação, durante a gravação, que o defeito ocorreu.
  Em Evidências: o caminho do vídeo e uma frase do que ele mostra.

### 3. Escrever a especificação

`origem/BUG-xxx/spec.json`, no formato de `modelos/spec-exemplo.json` (pasta desta skill):

- `titulo`: `BUG-xxx — <título do BUG>`, igual ao documento de bugs.
- `linhas`: lista de linhas; cada linha tem **1 ou 2** painéis.
- Painel de imagem: `imagem` (relativa ao spec), `recorte` opcional `[x, y, largura, altura]` em
  pixels da imagem original, `escala` opcional (o painel nunca amplia além dela).
- `destaques`: `ret` = `[x, y, largura, altura]` do elemento em pixels da **imagem original**, sem
  folga (o script acrescenta 3 px); `cor` opcional, `vermelho` ou `azul`.
- Painel de texto: `texto` (com `\n`), `origem` obrigatória, destaques com `linhas: [início, fim]`.
- `esperado`, `ambiente` e, se forem prova, `observacoes`.
- `saida`: `../../<tarefa>-BUG-xxx-<descricao-curta>.png` (relativo ao spec).

### 4. Posicionar os destaques

- **Web:** pela posição do elemento no navegador (`getBoundingClientRect()` vezes
  `devicePixelRatio`, descontando o recorte). Conferir pela grade na primeira vez.
- **Qualquer imagem:** gerar a grade de coordenadas e ler as posições nela:

```bash
node "<pasta desta skill>/scripts/montar-prancha.mjs" "<spec.json>" --grade --png
```

Abrir o `-grade.png`, ler as coordenadas do elemento e ajustar `ret` e `recorte`. Apagar os arquivos
`-grade` depois.

### 5. Gerar e conferir

```bash
node "<pasta desta skill>/scripts/montar-prancha.mjs" "<spec.json>" --png
```

Sem `--png`, o script gera só o HTML (útil quando não há Chrome nem Edge na máquina: abrir e salvar a
imagem). **Abrir o PNG final e conferir antes de entregar:**

- cada destaque em cima do elemento certo, na cor certa;
- cada legenda descrevendo só o que o painel mostra;
- nenhum painel sobrando: "tirar este painel ainda deixaria o BUG provado?" Se sim, tirar;
- texto legível (se não, recortar mais justo em vez de encolher tudo);
- nada cortado no fim da imagem (a altura é estimada);
- nenhum `AVISO` do script sem correção.

### 6. Entregar

- Dizer ao QA o caminho do PNG e, em uma linha, o que a imagem prova.
- No documento de bugs, o campo **Evidências** recebe só o caminho do arquivo entre crases. O QA
  troca o caminho pela imagem ao publicar na ferramenta de tarefas.
- Ajuste pedido pelo QA: editar o `spec.json` e regerar (a saída é sobrescrita).
