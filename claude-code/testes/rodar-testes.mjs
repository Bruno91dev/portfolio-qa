#!/usr/bin/env node
// Testa os verificadores e a trava com os exemplos do pacote.
// Uso: node claude-code/testes/rodar-testes.mjs (ou npm run test:ia)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qa = path.join(raiz, 'skills', 'qa-testar');
const trava = path.join(raiz, 'hooks', 'trava-pasta-do-codigo', 'trava-codigo.mjs');
// Caminhos fictícios no formato do sistema em que o teste roda (Windows local ou Linux no CI).
const windows = process.platform === 'win32';
const pastaProtegida = windows ? 'C:/projetos/loja' : '/projetos/loja';
const pastaQa = windows ? 'C:/qa' : '/qa';

let falhas = 0;
function conferir(nome, ok, detalhe = '') {
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${ok ? '' : `  ${detalhe}`}`);
  if (!ok) falhas++;
}

function rodar(args, entrada) {
  return spawnSync(process.execPath, args, { input: entrada, encoding: 'utf8' });
}

// Verificadores: o exemplo bom passa (código 0) e o ruim falha (código 1).
const verificadores = [
  ['verificar-plano.mjs', 'plano-que-passa.md', 0],
  ['verificar-plano.mjs', 'plano-que-falha.md', 1],
  ['verificar-bug.mjs', 'bugs-que-passam.md', 0],
  ['verificar-bug.mjs', 'bugs-que-falham.md', 1],
];
for (const [script, exemplo, esperado] of verificadores) {
  const r = rodar([path.join(qa, 'scripts', script), path.join(qa, 'exemplos', exemplo)]);
  conferir(`${script} ${exemplo} sai com código ${esperado}`, r.status === esperado, `saiu com ${r.status}`);
}
const fim = rodar([path.join(qa, 'scripts', 'verificar-plano.mjs'), path.join(qa, 'exemplos', 'plano-que-passa.md'), '--fim-ciclo']);
conferir('verificar-plano.mjs --fim-ciclo aceita ciclo sem pendências', fim.status === 0, `saiu com ${fim.status}`);

// Trava: nega escrita e git de escrita na pasta do código; libera leitura e escrita fora dela.
const p = pastaProtegida;
const chamadas = [
  ['nega Edit dentro da pasta do código', true, { tool_name: 'Edit', tool_input: { file_path: `${p}/src/carrinho.ts` } }],
  ['nega redirecionamento para dentro da pasta', true, { tool_name: 'Bash', tool_input: { command: `echo x > ${p}/a.txt` } }],
  ['nega git commit depois de cd na pasta', true, { tool_name: 'Bash', tool_input: { command: `cd ${p} && git commit -am x` } }],
  ['libera git diff na pasta', false, { tool_name: 'Bash', tool_input: { command: `git -C ${p} diff --stat` } }],
  ['libera escrita na pasta de QA', false, { tool_name: 'Write', tool_input: { file_path: `${pastaQa}/plano-123.md` } }],
];
if (windows) {
  chamadas.push(['nega Write com caminho do Git Bash', true, { tool_name: 'Write', tool_input: { file_path: '/c/projetos/loja/src/novo.ts' } }]);
}
for (const [nome, deveNegar, chamada] of chamadas) {
  const r = rodar([trava, pastaProtegida], JSON.stringify({ ...chamada, cwd: pastaQa }));
  const negou = r.stdout.includes('"permissionDecision":"deny"');
  conferir(`trava: ${nome}`, negou === deveNegar, negou ? 'negou' : 'liberou');
}
const ilegivel = rodar([trava, pastaProtegida], 'não é json');
conferir('trava: nega entrada ilegível por precaução', ilegivel.stdout.includes('"permissionDecision":"deny"'));

console.log(falhas ? `\n${falhas} teste(s) falharam` : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
