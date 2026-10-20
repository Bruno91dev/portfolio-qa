# Trava da pasta do código

Hook `PreToolUse` do Claude Code que garante a regra principal do pacote: **a IA do QA lê o código
do produto, mas nunca o altera.** Ela sugere a correção no BUG; quem aplica é o dev.

## Instalação

1. Copiar `trava-codigo.mjs` para `~/.claude/hooks/` (ou `.claude/hooks/` do projeto).
2. Juntar o conteúdo de `settings-trecho.json` ao `settings.json` (usuário: `~/.claude/settings.json`;
   projeto: `.claude/settings.json`), trocando os dois caminhos:
   - o caminho do script;
   - a pasta protegida (pode passar mais de uma, uma por argumento).
3. Na regra `Edit(...)` do `permissions.deny`, `//` no começo indica caminho absoluto a partir da raiz.
   No Windows, use a forma com a letra do drive (`Edit(//c/projetos/loja/**)`) e também
   `Edit(C:/projetos/loja/**)`. A regra `Edit` vale para todas as ferramentas de edição de arquivo.
4. Requer Node 16 ou superior; não tem dependências.

Opcional, se a máquina é só de QA e a IA não deve fazer commit em lugar nenhum: acrescentar ao
`permissions.deny` regras como `Bash(git commit:*)`, `Bash(git push:*)`, `Bash(git reset:*)` e
`Bash(git checkout:*)` (e as mesmas com `PowerShell(...)`, se usar PowerShell).

## O que ela bloqueia

- **Write, Edit, MultiEdit e NotebookEdit** em arquivo dentro da pasta protegida, com caminho
  absoluto, relativo à pasta atual, com barra invertida ou na forma do Git Bash (`/c/projetos/...`).
- **Comando de shell que altera arquivo** citando a pasta: `rm`, `mv`, `cp`, `sed -i`, `tee`,
  `mkdir`, `Set-Content`, `Remove-Item`, `Copy-Item` e outros, e redirecionamento (`>`, `>>`) para
  dentro dela.
- **Alteração por caminho relativo** quando a pasta atual, ou um `cd` do próprio comando, está dentro
  da pasta protegida (`sed -i ... src/a.ts`, `echo x > a.txt`).
- **git que altera o repositório** da pasta protegida, identificado pelo `-C`, por `cd` ou pela pasta
  atual: `commit`, `push`, `pull`, `add`, `merge`, `rebase`, `reset`, `checkout`, `switch`,
  `restore`, `stash`, `clean`, `apply`, `tag`, `branch -D`, `fetch` para branch local e outros.
- **Script chamado pelo comando** (`.py`, `.js`, `.mjs`, `.cjs`, `.ps1`, `.sh`) e código inline
  (`python -c`, heredoc) que grava na pasta protegida, direto ou por uma variável que recebeu um
  caminho de lá, ou que roda git de escrita nela (inclusive na forma de lista de argumentos).
- **Entrada ilegível ou hook sem pasta configurada**: nega por precaução.

## O que continua livre

Leitura: `git log`, `git diff`, `git show`, `git status`, `git fetch` (só atualiza as referências
remotas), `git grep`, `cat`, `grep`, a ferramenta Read. Script que lê o código e grava o resultado
fora da pasta protegida. git de escrita em outras pastas (a pasta de QA, por exemplo).

## O que ela não cobre

É uma rede de segurança feita de padrões de texto, não um isolamento do sistema operacional:

- caminho montado em tempo de execução (concatenação, variável de ambiente, arquivo de
  configuração lido pelo script) ou script que chama outro script;
- ferramentas e servidores MCP que gravam arquivo por conta própria (o hook só vê Bash, PowerShell e
  as ferramentas de edição);
- executável compilado, alias do shell ou programa que altera arquivos sem os comandos listados;
- link simbólico ou junção que aponta para dentro da pasta protegida a partir de outro caminho;
- o próprio QA: a trava vale para a IA, não para o que o QA roda no terminal dele.

Para isolamento de verdade, combine com permissões do sistema: a IA trabalhando com um usuário sem
direito de escrita na pasta do código, ou com uma cópia só de leitura.

Ela também é conservadora em alguns casos: comando que cita a pasta e usa um comando de alteração é
negado mesmo quando o alvo da alteração está fora (ex.: `cp` de um arquivo do código para a pasta de
QA). Nesses casos, leia com Read ou `cat` e grave com a ferramenta de escrita.

## Como testar

Cada chamada recebe o JSON do Claude Code pela entrada padrão. Exemplos, com a pasta protegida
`C:/projetos/loja`:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"C:/projetos/loja/src/a.ts"},"cwd":"C:/qa"}' | node trava-codigo.mjs "C:/projetos/loja"
echo '{"tool_name":"Bash","tool_input":{"command":"git -C C:/projetos/loja diff --stat"},"cwd":"C:/qa"}' | node trava-codigo.mjs "C:/projetos/loja"
```

A primeira devolve `"permissionDecision":"deny"` com o motivo; a segunda não devolve nada (liberada).
