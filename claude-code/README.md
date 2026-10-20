# QA com Claude Code

Skills, verificadores e uma trava de segurança que uso no trabalho de QA com o Claude Code. O que
este repositório mostra é o **método**: como o ciclo de teste é conduzido, quais regras de qualidade
o plano e o BUG seguem e por que cada regra existe. Nada aqui depende de um sistema específico; os
exemplos são de uma loja virtual fictícia.

## O princípio: QA executa, IA mede

- O QA executa os passos na tela. O olhar humano pega o que nenhuma medida pega (foco, cursor,
  mensagem que pisca).
- A IA prepara (lê a tarefa e o diff, propõe o escopo), instrumenta a página, mede quando o QA diz
  "pode medir" e registra no plano e no documento de bugs.
- **A IA nunca altera o código do produto.** Ela lê, compara e sugere a correção no BUG; o dev
  aplica. A trava em `hooks/` reforça isso.

## O que tem aqui

| Pasta | O que faz |
|---|---|
| `skills/qa-testar` | Ponto de entrada: diagnostica a situação da tarefa, resume o que o dev fez, monta o plano com piso e mapa de cobertura e conduz a execução. Traz os modelos, as regras, os dois verificadores e exemplos |
| `skills/evidencia-bug` | Monta a prancha de evidência do BUG: só o que prova o defeito, vermelho no erro, azul no certo |
| `skills/validacao-final` | Análise de risco antes da produção, partindo do diff, com veredito de bloqueio |
| `skills/validacao-visual` | Validação de UX e visual com auditor e coletor no navegador e verificador de tokens no diff |
| `hooks/trava-pasta-do-codigo` | Hook que bloqueia escrita e git de escrita na pasta do código |

Os verificadores ficam em `skills/qa-testar/scripts/`:

- `verificar-plano.mjs` — formato da tabela, IDs, status, âncora do pendente, numeração, piso de
  critérios, mapa de cobertura e placar do ciclo atual;
- `verificar-bug.mjs` — linguagem acessível, estrutura, Evidências só com a prova, data e hora,
  Status da Correção e tamanho.

Exemplos que passam e que falham estão em `skills/qa-testar/exemplos/`.

## Instalação

1. Copiar as pastas de `skills/` para `~/.claude/skills/` (todas as sessões) ou `.claude/skills/` do
   projeto.
2. Instalar a trava seguindo `hooks/trava-pasta-do-codigo/LEIAME.md`.
3. Informar no `CLAUDE.md` do projeto:

   ```markdown
   ## QA
   - Pasta do código (somente leitura): /caminho/do/codigo
   - Pasta de QA (planos, bugs, evidências): /caminho/da/pasta-qa
   - Endereço da aplicação em teste: http://localhost:3000
   - Branch base: main
   - Branch da tarefa: tarefa-<número>
   - Prefixo dos tokens primitivos do design system: --paleta-
   ```

4. Requer Node 16 ou superior. Os scripts usam só módulos nativos; o `--png` da prancha usa o Chrome
   ou o Edge instalado.

## Como testar os verificadores

Na raiz do repositório, `npm run test:ia` roda os verificadores com os exemplos e confere a trava.
O mesmo teste roda no GitHub Actions a cada alteração.

Para rodar um verificador à mão, a partir desta pasta (`claude-code/`):

```bash
node skills/qa-testar/scripts/verificar-plano.mjs skills/qa-testar/exemplos/plano-que-passa.md
node skills/qa-testar/scripts/verificar-plano.mjs skills/qa-testar/exemplos/plano-que-falha.md
node skills/qa-testar/scripts/verificar-bug.mjs skills/qa-testar/exemplos/bugs-que-passam.md
node skills/qa-testar/scripts/verificar-bug.mjs skills/qa-testar/exemplos/bugs-que-falham.md
```

Os que passam saem com código 0; os que falham saem com código 1 e listam cada erro com a linha.
Cada exemplo que falha tem, no fim, um comentário com os erros esperados.
