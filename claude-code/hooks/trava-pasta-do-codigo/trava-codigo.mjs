#!/usr/bin/env node
// Trava da pasta do código: hook PreToolUse do Claude Code.
//
// A IA do QA lê o código do produto, mas nunca o altera: sugere a correção e o dev aplica.
// Este hook nega, antes de executar:
//   - Write / Edit / MultiEdit / NotebookEdit em arquivo dentro da pasta protegida;
//   - comando de shell (Bash ou PowerShell) que grava, apaga ou move arquivo dentro dela, inclusive
//     por caminho relativo quando a pasta atual (ou um cd do comando) está dentro dela;
//   - git que altera repositório ou working tree (commit, push, pull, add, reset, checkout...)
//     com alvo na pasta protegida (pelo -C, pelo cd ou pela pasta atual);
//   - script chamado pelo comando (.py, .js, .mjs, .cjs, .ps1, .sh) cujo texto grava na pasta
//     protegida ou roda git de escrita nela.
// Leitura continua livre: git log, git diff, git show, git status, git fetch, grep, cat.
//
// Uso (no settings.json): node <caminho>/trava-codigo.mjs "<pasta protegida>" ["<outra pasta>" ...]
// Sem pasta configurada ou com entrada ilegível, nega por precaução.
// Só módulos nativos do Node (16 ou superior).

import { readFileSync } from 'node:fs';

const SEM_CAIXA = process.platform === 'win32' || process.platform === 'darwin';

// Barra invertida vira barra, barras repetidas viram uma e, em sistema sem distinção de caixa, tudo
// minúsculo. Assim "C:\\Projetos\\Loja", "C:/projetos/loja" e "//c/projetos/loja" se comparam do mesmo jeito.
function normalizar(p) {
  let s = String(p || '').trim().replace(/\\+/g, '/').replace(/\/{2,}/g, '/');
  if (s.length > 3 && s.endsWith('/')) s = s.slice(0, -1);
  return SEM_CAIXA ? s.toLowerCase() : s;
}

const absoluto = (p) => /^[a-z]:\//i.test(p) || p.startsWith('/');

// Junta um caminho relativo a uma pasta base, resolvendo "." e "..".
function juntar(base, rel) {
  const r = normalizar(rel);
  if (absoluto(r)) return r;
  const partes = normalizar(base).split('/');
  for (const seg of r.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (partes.length > 1) partes.pop(); } else partes.push(seg);
  }
  return partes.join('/');
}

// Formas equivalentes de uma pasta: C:/x também aparece como /c/x no Git Bash.
function formas(p) {
  const n = normalizar(p);
  const lista = [n];
  const drive = n.match(/^([a-z]):(\/.*)?$/i);
  if (drive) lista.push(`/${drive[1].toLowerCase()}${drive[2] || ''}`);
  const bash = n.match(/^\/([a-z])(\/.*)?$/i);
  if (bash && process.platform === 'win32') lista.push(`${bash[1]}:${bash[2] || ''}`);
  return [...new Set(lista)];
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const flags = SEM_CAIXA ? 'i' : '';

const PASTAS = process.argv.slice(2).filter(Boolean);
const FORMAS = PASTAS.flatMap(formas);
const dentro = (caminho) => {
  const c = normalizar(caminho);
  return FORMAS.some((f) => c === f || c.startsWith(f + '/'));
};
// A pasta protegida citada no texto (já normalizado), como caminho inteiro.
const CITA = FORMAS.map((f) => new RegExp(`(^|[\\s"'=(\`])${esc(f)}(?=[/"'\\s;|&)\`]|$)`, flags));
const citaPasta = (texto) => CITA.some((re) => re.test(texto));
const REDIRECIONA = FORMAS.map((f) => new RegExp(`>>?\\s*["']?${esc(f)}(?=[/"'\\s]|$)`, flags));

// Subcomando git logo depois de "git" e das opções globais (-C pasta, -c chave=valor, --x, -x).
const GIT_PREFIXO = String.raw`\bgit\b((?:\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)|-c\s+\S+|--[\w-]+(?:=\S+)?|-[a-zA-Z]))*)\s+`;
const GIT_ESCRITA = new RegExp(GIT_PREFIXO + '(' +
  'commit|push|pull|add|rm|mv|merge|rebase|reset|revert|cherry-pick|stash|clean|checkout|switch|restore|' +
  'apply|am|tag|filter-branch|gc|prune|checkout-index|read-tree|update-ref|symbolic-ref|write-tree|' +
  'commit-tree|update-index|submodule|worktree|config|branch|remote|fetch' +
  String.raw`)(?![\w-])([^|;&\n]*)`, 'gi');
// Formas de leitura desses subcomandos, que continuam liberadas.
const GIT_LEITURA = new RegExp(String.raw`^(?:stash\s+(?:list|show)|tag(?:\s+(?:-l|--list|-n)\b.*)?\s*$|` +
  String.raw`worktree\s+list|submodule(?:\s+(?:status|summary)\b.*)?\s*$|config\s+(?:--get|--get-all|--get-regexp|--list|-l)\b|` +
  String.raw`remote(?:\s+(?:-v|show|get-url)\b.*)?\s*$|branch(?!.*\s(?:-[dDmMcCfu]\b|--delete|--move|--copy|--force|--set-upstream))|` +
  // fetch só atualiza refs remotas; escreve em branch local com refspec "a:b" fora de refs/remotes ou --update-head-ok
  String.raw`fetch(?!.*(?:--update-head-ok|\s\+?[^\s:-][^\s:]*:(?!refs/remotes/)\S)))`, 'i');

const MUTADORES = new RegExp(String.raw`(^|[\s;&|(])(` +
  'rm|del|erase|mv|move|cp|copy|touch|sed\\s+-i|tee|dd|truncate|chmod|chown|attrib|mkdir|md|rmdir|rd|ren|rename|ri|rni|' +
  'perl\\s+-\\w*i|Remove-Item|Move-Item|Copy-Item|Rename-Item|Set-Content|Add-Content|Out-File|New-Item|Clear-Content' +
  String.raw`)\b|\bfind\b[^|;&\n]*\s-delete\b|\bcurl\b[^|;&\n]*\s(?:-o|--output|-O|--remote-name)\b|` +
  String.raw`\[(?:System\.)?IO\.File\]::\w*(?:Write|Append|Delete|Move|Copy|Create)`, 'i');
// Redirecionamento para caminho relativo (não /dev/null, não absoluto, não 2>&1, não "=>" nem "->").
const REDIRECIONA_RELATIVO = /(?<![\d&=-])>>?\s*(?!&)["']?(?![a-z]:\/|\/|\$null\b|nul\b)[^\s"'|;&<>]+/i;
const ALVO_ABSOLUTO = /(^|[\s"'=(])(?:[a-z]:\/|\/)/i;
const MUDA_PASTA = /(?:^|[;&|(]\s*|\s)(?:cd|chdir|pushd|Set-Location|sl)\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|)]+))/gi;

// Escrita dentro de um script (Python, Node, PowerShell, shell).
const GRAVA_NO_SCRIPT = new RegExp(
  String.raw`\bopen\([^,\n]+,\s*(?:mode\s*=\s*)?['"][rbt]*[wax][rwxabt+]*['"]|\.write_(?:text|bytes)\(|\bshutil\.(?:copy\w*|move|rmtree)\b|` +
  String.raw`\bos\.(?:remove|unlink|rename|replace|makedirs|mkdir|rmdir|removedirs)\b|\.(?:unlink|rmdir|touch|mkdir|rename|replace)\(|` +
  String.raw`\bfs(?:\.promises)?\.(?:write\w*|append\w*|unlink\w*|rm\w*|rename\w*|copy\w*|mkdir\w*|createWriteStream)\b|` +
  String.raw`\b(?:writeFile\w*|appendFile\w*|unlink\w*|rmSync|renameSync|copyFileSync|mkdirSync)\(|` +
  String.raw`\b(?:Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|Rename-Item|New-Item|Clear-Content)\b|` +
  String.raw`\[(?:System\.)?IO\.File\]::\w*(?:Write|Append|Delete|Move|Copy|Create)`, 'i');
// git de escrita na forma de lista de argumentos (subprocess.run(['git', 'commit']), spawn('git', ['push'])).
const GIT_EM_LISTA = /['"]git['"]\s*,\s*\[?\s*(?:['"]-C['"]\s*,\s*[^,\])]+,\s*)?['"](?:commit|push|pull|add|rm|mv|merge|rebase|reset|revert|cherry-pick|stash|clean|checkout|switch|restore|apply|am|tag)['"]/i;
const ATRIBUICAO = /^\s*(?:const\s+|let\s+|var\s+|export\s+)?\$?([A-Za-z_]\w*)\s*=(?!=)(.*)$/;
const LEITURA = /\bopen\(|\.read\w*\(|read_text|read_bytes|Get-Content|readFileSync|readFile\(/i;
const SCRIPT_CITADO = /["']?((?:[a-z]:[\\/]|\/)[^"'\n]*?\.(?:py|js|mjs|cjs|ps1|sh)|[^\s"'<>|;&]+\.(?:py|js|mjs|cjs|ps1|sh))["']?/gi;

function negar(motivo) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `${motivo} A pasta do código é somente leitura para a IA: registre o ajuste no plano de teste ou na sugestão de correção do BUG.`,
    },
  }));
  process.exit(0);
}

// Pastas em que o comando pode rodar: a atual (salvo se o comando já começa com cd) e todo destino
// de cd citado nele.
function pastasDoComando(cmd, cwd) {
  const lista = /^\s*(?:cd|chdir|pushd|Set-Location|sl)\s/i.test(cmd) ? [] : [normalizar(cwd)];
  for (const m of cmd.matchAll(MUDA_PASTA)) lista.push(juntar(cwd, m[1] ?? m[2] ?? m[3]));
  return lista.length ? lista : [normalizar(cwd)];
}

function gitEscreveNaPasta(cmdN, pastas) {
  for (const m of cmdN.matchAll(GIT_ESCRITA)) {
    const sub = `${m[2]}${m[3]}`.trim();
    if (GIT_LEITURA.test(sub)) continue;
    const alvoC = (m[1] || '').match(/-C\s+(?:"([^"]*)"|'([^']*)'|(\S+))/i);
    const alvos = alvoC ? pastas.map((p) => juntar(p, alvoC[1] ?? alvoC[2] ?? alvoC[3])) : pastas;
    if (alvos.some(dentro)) return true;
  }
  return false;
}

// Uma linha do script grava e aponta para a pasta: o caminho na própria linha ou numa variável que
// recebeu um caminho de lá. Script que lê o código e grava o resultado em outro lugar passa.
function scriptGravaNaPasta(texto) {
  const linhas = texto.split('\n').map(normalizar);
  const variaveis = new Set();
  for (const l of linhas) {
    const m = l.match(ATRIBUICAO);
    if (!m || LEITURA.test(m[2])) continue;
    const usaVariavel = [...variaveis].some((v) => new RegExp(`(?<![\\w$])\\$?${esc(v)}\\b`, flags).test(m[2]));
    if (citaPasta(' ' + m[2]) || usaVariavel) variaveis.add(m[1]);
  }
  return linhas.some((l) => REDIRECIONA.some((re) => re.test(l)) ||
    ((GRAVA_NO_SCRIPT.test(l) || MUTADORES.test(l)) &&
      (citaPasta(' ' + l) || [...variaveis].some((v) => new RegExp(`(?<![\\w$])\\$?${esc(v)}\\b`, flags).test(l)))));
}

// Script que cita a pasta e roda git de escrita (sem -C, conta como rodando nela).
function scriptRodaGitNaPasta(texto, pastas) {
  const t = normalizar(texto);
  if (!citaPasta(' ' + t)) return false;
  return GIT_EM_LISTA.test(t) || gitEscreveNaPasta(t, [...pastas, ...FORMAS]);
}

function textosDeScripts(cmd, pastas) {
  const textos = [];
  for (const m of cmd.matchAll(SCRIPT_CITADO)) {
    for (const base of pastas) {
      try { textos.push(readFileSync(juntar(base, m[1]), 'utf8').slice(0, 500000)); break; } catch { /* tenta a próxima pasta */ }
    }
  }
  return textos;
}

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {
    negar('Não foi possível ler a chamada para conferir a trava da pasta do código.');
  }
  if (!PASTAS.length) negar('Trava da pasta do código sem pasta configurada (argumento do hook no settings.json).');

  const ferramenta = payload.tool_name || '';
  const entrada = payload.tool_input || {};
  const cwd = payload.cwd || process.cwd();

  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(ferramenta)) {
    const arquivo = entrada.file_path || entrada.notebook_path || '';
    if (arquivo && dentro(juntar(cwd, arquivo))) negar('PROIBIDO: gravar arquivo dentro da pasta do código.');
    return;
  }
  if (!['Bash', 'PowerShell'].includes(ferramenta)) return;

  const cmd = String(entrada.command || '');
  const cmdN = normalizar(cmd);
  const pastas = pastasDoComando(cmd, cwd);

  if (gitEscreveNaPasta(cmdN, pastas)) {
    negar('PROIBIDO: git que altera o repositório da pasta do código (use só git log, diff, show, status e fetch).');
  }
  if (REDIRECIONA.some((re) => re.test(cmdN))) negar('PROIBIDO: redirecionamento que grava dentro da pasta do código.');
  if (citaPasta(cmdN) && MUTADORES.test(cmdN)) negar('PROIBIDO: comando que altera arquivos citando a pasta do código.');
  if (pastas.some(dentro) && (REDIRECIONA_RELATIVO.test(cmdN) || (MUTADORES.test(cmdN) && !ALVO_ABSOLUTO.test(cmdN)))) {
    negar('PROIBIDO: comando de alteração com caminho relativo rodando dentro da pasta do código. Use caminho absoluto fora dela.');
  }
  // O próprio comando (heredoc e código inline vêm nele) e o texto de cada script citado.
  if (scriptGravaNaPasta(cmd)) negar('PROIBIDO: código que grava arquivo dentro da pasta do código.');
  for (const texto of textosDeScripts(cmd, pastas)) {
    if (scriptGravaNaPasta(texto)) negar('PROIBIDO: script que grava arquivo dentro da pasta do código.');
    if (scriptRodaGitNaPasta(texto, pastas)) negar('PROIBIDO: script que roda git de escrita na pasta do código.');
  }
}

main();
