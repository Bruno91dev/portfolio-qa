---
name: validacao-visual
description: Validação de UX e visual de telas de uma aplicação web no modo "QA executa, IA mede" - o QA age na tela e o Claude mede pelo navegador (auditor de tradução, texto cortado, tamanho, alinhamento, margem e espaçamento; coletor de feedback, carregamento, duplicidade e foco) e pelo verificador de tokens do design system aplicado só ao diff. Aplica um checklist de 15 itens de UX recortado ao que a tarefa alterou. Use quando o QA pedir para "validar o visual da tela", "conferir se está torto", "ver se os textos estão traduzidos", "checar tamanho e alinhamento", "validar as mensagens de erro" ou "aplicar o checklist de UX".
---

# Validação de UX e visual

**Configuração:** o `CLAUDE.md` do projeto informa o **Endereço da aplicação em teste**, a **Pasta
do código** (somente leitura), a **Branch base** e, se houver design system, o **prefixo dos tokens
primitivos** e as exceções permitidas.

## Divisão do trabalho

- **O Claude abre e instrumenta:** navega até o Endereço da aplicação e injeta os scripts **antes**
  de mandar o primeiro passo.
- **O QA faz login** (o Claude nunca digita senha) e **executa os passos**.
- **O QA diz "pode medir"** e o Claude mede, uma vez por caso.
- O Claude só executa caso na tela com "pode executar você".
- **Não tirar captura para medir.** O que é estético ou passageiro, perguntar ao QA de forma
  objetiva ("o botão ficou desabilitado enquanto salvava?", "a mensagem apareceu perto do botão ou no
  canto da tela?"). Defeito visual registrado como BUG ganha a imagem pela skill `evidencia-bug`.
- Alerta nativo do navegador é fechado pelo QA: ele trava a automação.

## Como cada item é medido

- 🤖 **Medido** — o Claude afere na medição (auditor, coletor, verificador de tokens).
- 👁️ **Observado** — só o olho humano pega; o Claude pergunta, o QA responde.
- ✋ **Exercitado** — o QA precisa executar o fluxo (provocar erro, navegar por teclado).

Nenhuma ferramenta decide "está bonito": a medida aponta presença e desvio; o resto é exercitado e
observado pelo QA.

## Escopo: quais itens entram

Só o que a tarefa alterou ou pode ter impactado:

- **Tela nova ou melhoria geral de uma tela** → o checklist inteiro (UX-01 a UX-15). Nesse tipo de
  tarefa, todo defeito da tela é BUG da tarefa.
- **Alteração pontual** → só os itens que a alteração toca. Mudou mensagem de erro → UX-04 e UX-05;
  mudou layout de filtro → UX-12 e UX-15; mudou o botão de gravar → UX-01, UX-02 e UX-03.

Cada item escolhido tem justificativa de risco; o checklist não se aplica por quantidade.

## Checklist de UX

| Item | O que se espera | Como medir |
|---|---|---|
| **UX-01** Confirmação de sucesso | toda ação dá retorno visível perto de onde foi feita | ✋ · 🤖 mensagem cruzada com a gravação bem-sucedida · 👁️ onde apareceu |
| **UX-02** Retorno durante o processamento | há indicação de carregamento ou bloqueio; o clique não parece ignorado | ✋ · 🤖 `desabilitou` ou `loading-on` entre o clique e a resposta |
| **UX-03** Sem ação duplicada | clicar várias vezes não dispara a gravação várias vezes | ✋ cliques rápidos · 🤖 `__uxDuplicadas()` |
| **UX-04** Erro compreensível | erro perto da ação, em linguagem clara, sem alerta nativo | ✋ provocar o erro · 🤖 texto da mensagem · checklist de erro |
| **UX-05** Saída do erro | a mensagem diz o que fazer agora | ✋ · 👁️ |
| **UX-06** Atualização em outra área | o que muda longe da ação ganha destaque temporário | 👁️ |
| **UX-07** Uso certo do toast | toast só quando o contexto da ação sumiu ou a ação é assíncrona | 🤖 tipo da mensagem · 👁️ |
| **UX-08** Validação de campo | mensagem específica, no momento certo, antes de gravar | ✋ campos inválidos · 🤖 estado do formulário e mensagens de campo |
| **UX-09** Ação destrutiva | confirmação explícita antes de excluir | ✋ · 🤖 diálogo registrado **antes** da exclusão |
| **UX-10** Estado vazio | lista vazia orienta o usuário, não parece quebrada | ✋ filtro sem resultado · 👁️ |
| **UX-11** Carregamento | indicador durante a carga; nunca tela em branco | 🤖 `loading-on` seguido de `loading-off` · 👁️ |
| **UX-12** Conteúdo e layout | nenhum texto cortado sem reticências ou dica; nada passa dos limites do componente | 🤖 auditor em **duas larguras** |
| **UX-13** Navegação por teclado | Tab, Shift+Tab, Enter e Esc alcançam tudo; o foco não fica preso | ✋ · 🤖 sequência de `foco` |
| **UX-14** Modais e diálogos | o foco entra no diálogo, fica contido e **volta** ao fechar | ✋ · 🤖 `foco` com `dentroDeDialogo` |
| **UX-15** Consistência visual | segue o design system; tamanhos, margens e espaçamentos consistentes | 🤖 auditor + verificador de tokens · 👁️ comparação com o protótipo |

## Regras de base

**Retorno da ação.** Toda ação (salvar, adicionar, excluir, enviar) dá retorno **no local da ação**.
Destaque em outra área complementa, não substitui. Não é aceitável: limpar campo sem confirmação,
atualizar outra área em silêncio, concluir sem evidência.

**Design system.** Componente usa **token semântico** (ex.: `--botao-fundo`), nunca o token
primitivo da paleta direto (ex.: `--paleta-azul-500`). Falta um semântico? Cria-se um novo apontando
para o primitivo. Por quê: trocar o tema só funciona se os componentes não dependem da paleta crua.

**Modal só para interação rápida e pontual** (confirmar, formulário curto, consulta rápida). Muitos
campos, tarefa longa, necessidade de consultar a tela de trás ou várias etapas pedem tela própria ou
painel lateral. Modal dentro de modal é problema de usabilidade.

**Mensagem de erro: Título → Detalhes → Ação.** O que deu errado (sem jargão), quais dados ou campos,
o que fazer agora. Modal para erro com detalhe (validação múltipla, vínculo, duplicidade, permissão);
mensagem no campo para erro de um campo; faixa para erro geral. Evitar toast para erro; nunca alerta
nativo nem texto técnico ("internal error", código de erro cru).

**Checklist de erro (UX-04):** tem título? É específico? Explica o porquê? Diz a ação? Está livre de
termo técnico?

## Preparar a página

Injetar, pela ferramenta de executar JavaScript do navegador, no mesmo lote, depois que a página
abrir e **antes** de o QA agir:

| Script (pasta desta skill) | Cria | Serve para |
|---|---|---|
| `scripts/coletor-ux.js` | `__uxLog`, `__uxReq`, `__uxDuplicadas()` | retorno, carregamento, duplicidade, mensagens e foco |
| `scripts/auditor-visual.js` | `__auditorVisual` | tradução, texto cortado, tamanhos, alinhamento, margens e espaçamento |

- Reinjetar os dois depois de todo F5 ou navegação por endereço (navegação interna da aplicação
  preserva). Reinjetar o coletor zera o `__uxLog`: só depois de F5.
- Se a skill `qa-testar` já instrumentou a página, o coletor usa o `__reqLog` dela.
- **No primeiro uso numa aplicação nova**, conferir se o coletor registra carregamento e foco e se o
  auditor encontra as seções (`secoesMedidas` maior que 0), antes de usar como prova. Os seletores
  padrão são genéricos; cada aplicação pode precisar dos seus.

## Medir

### Auditor visual (UX-12 e UX-15)

**Antes de medir, pedir ao QA para expandir todo estado recolhido**: filtros, abas, acordeões,
diálogos. O auditor só mede o que está visível: campo escondido é campo não validado.

```js
window.__auditorVisual.resumo({
  tamanhos: [{ seletor: 'input[type=text]', dim: 'height' }, { seletor: 'button.primario', dim: 'height' }],
  linhas:   [{ seletor: '.filtros > *' }],
  containers: 'form, fieldset, .card'
})
```

O detalhe fica em `window.__auditorVisualRelatorio`; ler numa segunda chamada, filtrando só o que
interessa. O que ele aponta:

- `traducao-ausente`: chave de tradução que vazou para a tela (`carrinho.botao.aplicar`, `{{ total }}`);
- `texto-cortado`: texto que não cabe, sem reticências nem dica;
- desvio de **tamanho** num grupo que deveria ser homogêneo (compare só grupos realmente iguais:
  botão de barra de ferramentas e botão de ícone não são o mesmo grupo);
- item **fora da linha** num grupo que deveria estar alinhado;
- `ultrapassa-container`: elemento que passa da margem interna da seção;
- `margem-esquerda-diferente`: elemento desalinhado dos irmãos (3 px ou mais);
- `espaco-apertado` / `espaco-largo`: espaço vertical fora do padrão **da própria tela** (o padrão é
  o espaço mais frequente; não há valor fixo).

**Duas larguras, sempre.** Medir na largura em que o QA executou e de novo em ~480 px (o QA
redimensiona ou usa o modo de dispositivo do DevTools). Por quê: um campo pode respeitar a margem no
computador e sair dela só em tela estreita, e quem mede numa largura só não vê. Conferir o campo
`largura` do resultado, que prova em que largura cada achado apareceu. Voltar ao tamanho normal antes
do caso seguinte.

Achado de espaçamento e de margem que aparece duas vezes (causa e efeito) é relatado uma vez, pela
causa.

### Coletor (UX-01, 02, 03, 07, 09, 11, 13, 14)

```js
({ ux: window.__uxLog.slice(-60), duplicadas: window.__uxDuplicadas() })
```

- **UX-02:** há `desabilitou` ou `loading-on` entre o clique e a resposta? Se a resposta veio em
  poucos milissegundos, não haver carregamento não é defeito: dizer isso.
- **UX-03:** `__uxDuplicadas()` vazio, com o QA tendo clicado várias vezes, é aprovado.
- **UX-09:** a `mensagem` do diálogo de confirmação aparece antes da exclusão.
- **UX-13 e 14:** a sequência de `foco` mostra a ordem do Tab, a entrada no diálogo
  (`dentroDeDialogo: true`) e para onde o foco voltou ao fechar.

### Formulário (UX-08)

A crítica precisa aparecer **antes** de gravar; só no backend é defeito. Controle inválido sem
nenhum campo em erro na tela **não é BUG** até provar que bloqueia: deixar todos os outros campos
válidos e tentar gravar.

### Verificador de tokens: só o que a tarefa adicionou (UX-15)

```bash
git -C "<Pasta do código>" fetch origin -q
git -C "<Pasta do código>" diff -U0 origin/<base>...origin/<branch-da-tarefa> -- "*.css" "*.scss" "*.less" "*.html" > "<Pasta de QA>/tarefa.diff"
node "<pasta desta skill>/scripts/verificar-tokens-diff.mjs" "<Pasta de QA>/tarefa.diff" --primitivo=<prefixo> --permitidos=<exceções>
```

Ele acusa token primitivo só em **linha adicionada pela tarefa**, fora dos arquivos que definem os
tokens. No reteste, gerar o diff a partir do commit do ciclo anterior para recortar aos commits da
correção. Uso em componente compartilhado atinge várias telas: dizer isso no relato.

## Classificar o achado

- **Da tarefa ou anterior?** Provar pelo git se a linha é da branch, e perguntar também se a branch
  torna o caminho alcançável e se o code review pediu a correção. Qualquer sim é BUG da tarefa. Só
  anterior de fato: avisar o QA na conversa e não registrar, salvo pedido (exceto tarefa de melhoria
  geral da tela).
- **Da tela ou do componente compartilhado?** Comportamento estranho em componente reutilizado:
  **reproduzir numa segunda tela** antes de escrever. Se acontece nas duas, é do componente, e a
  severidade e a área mudam.
- **BUG ou sugestão?** Violação com impacto (texto cortado, chave de tradução na tela, ação sem
  retorno, gravação duplicada, foco preso) é BUG. Mensagem fora do padrão Título → Detalhes → Ação
  sem impedir o uso é ressalva ou sugestão de melhoria.
- **Limitação do ambiente não é defeito de UX:** em ambiente sem HTTPS, recursos que o navegador
  só libera em conexão segura (copiar para a área de transferência, notificação, câmera) ficam
  bloqueados.
- **Celular tolera, computador não:** na largura de celular, campo que quebra de linha ou diferença
  de poucos pixels imperceptível é observação aceita, desde que não impeça o uso. No computador,
  desvio medido de alinhamento ou espaçamento é defeito. Achado que só aparece em ~480 px: levar ao
  QA a medida (largura, tipo, px) e deixar a decisão com ele.

## Registrar

O resultado do caso, o BUG, a evidência e as verificações seguem a skill `qa-testar` (Passo 7) e a
`evidencia-bug`. A medida (seletor, px, entrada do `__uxLog`, arquivo e linha do verificador) vai no
plano de teste; no BUG, o técnico fica só na Sugestão de correção.

## Passo a passo

1. Situar a tarefa (skill `qa-testar`, Passo 1) e decidir os itens do checklist.
2. Abrir a aplicação, esperar o login do QA e injetar os dois scripts.
3. Rodar o verificador de tokens no diff.
4. Para cada item: mandar o passo curto (com "expanda os filtros" quando for UX-12 ou UX-15),
   esperar o "pode medir" e medir uma vez; em UX-12 e UX-15, medir de novo em ~480 px.
5. Classificar e registrar na hora, antes do item seguinte.
6. Ao encerrar, lembrar que só o F5 remove os scripts injetados.
