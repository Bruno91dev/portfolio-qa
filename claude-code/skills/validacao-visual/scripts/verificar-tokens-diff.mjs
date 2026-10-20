#!/usr/bin/env node
// Regra do design system aplicada só ao que a tarefa ADICIONOU: componente usa token semântico
// (ex.: --botao-fundo), nunca o token primitivo da paleta (ex.: --paleta-azul-500) direto.
//
// Entrada: o diff da tarefa, gerado por quem tem acesso à pasta do código, só com leitura:
//   git -C <pasta do código> fetch origin -q
//   git -C <pasta do código> diff -U0 origin/<base>...origin/<branch> -- "*.css" "*.scss" "*.less" "*.html" > tarefa.diff
//
// Uso:
//   node verificar-tokens-diff.mjs tarefa.diff --primitivo=--paleta- [--permitidos=--paleta-superficie,--paleta-texto]
//
//   --primitivo   prefixo dos tokens primitivos, que componente não usa direto (obrigatório)
//   --permitidos  exceções exatas, separadas por vírgula (padrão: nenhuma)
//   --definicao   expressão regular dos arquivos onde os tokens são definidos, que ficam de fora
//                 (padrão: tokens?|variables|theme|palette|colors)
// Sai com código 1 quando acha token primitivo em linha adicionada. Só módulos nativos do Node (16+).

import { readFileSync, existsSync } from 'node:fs';

function lerArgs(argv) {
  const op = { arquivos: [] };
  for (const a of argv) {
    const m = a.match(/^--([\w-]+)=(.*)$/);
    if (m) op[m[1]] = m[2]; else op.arquivos.push(a);
  }
  return op;
}

function main() {
  const op = lerArgs(process.argv.slice(2));
  const diff = op.arquivos[0];
  if (!diff || !op.primitivo) {
    console.error('Uso: node verificar-tokens-diff.mjs <tarefa.diff> --primitivo=<prefixo> [--permitidos=a,b] [--definicao=<regex>]');
    return 1;
  }
  if (!existsSync(diff)) {
    console.error(`ERRO   arquivo de diff não encontrado: ${diff}`);
    return 1;
  }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const PRIMITIVO = new RegExp(`var\\(\\s*(${esc(op.primitivo)}[\\w-]*)`, 'gi');
  const permitidos = new Set((op.permitidos || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const DEFINICAO = new RegExp(op.definicao || 'tokens?|variables|theme|palette|colors', 'i');
  const EXTENSOES = /\.(css|scss|less|html)$/i;

  let arquivo = null;
  let linha = null;
  const alterados = new Set();
  const ignorados = new Set();
  const achados = [];
  for (const texto of readFileSync(diff, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    const novo = texto.match(/^\+\+\+ (?:b\/)?(.+)$/);
    if (novo) {
      arquivo = novo[1] === '/dev/null' ? null : novo[1];
      linha = null;
      if (arquivo && EXTENSOES.test(arquivo)) (DEFINICAO.test(arquivo) ? ignorados : alterados).add(arquivo);
      continue;
    }
    const hunk = texto.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { linha = Number(hunk[1]); continue; }
    if (!arquivo || linha === null || !alterados.has(arquivo)) continue;
    if (texto.startsWith('+')) {
      for (const m of texto.slice(1).matchAll(PRIMITIVO)) {
        if (!permitidos.has(m[1].toLowerCase())) achados.push(`${arquivo}:${linha}: ${m[1]}  ->  ${texto.slice(1).trim().slice(0, 120)}`);
      }
      linha++;
    } else if (!texto.startsWith('-') && !texto.startsWith('\\')) {
      linha++;
    }
  }

  console.log(`Lidos: ${alterados.size} arquivo(s) de estilo ou template alterado(s); ${ignorados.size} de definição de token ignorado(s)`);
  for (const f of ignorados) console.log(`  ignorado: ${f}`);
  for (const a of achados) console.log(`ERRO   ${a}`);
  console.log(achados.length ? `Resultado: ${achados.length} uso(s) de token primitivo em linha adicionada pela tarefa` : 'Resultado: ok');
  return achados.length ? 1 : 0;
}

process.exitCode = main();
