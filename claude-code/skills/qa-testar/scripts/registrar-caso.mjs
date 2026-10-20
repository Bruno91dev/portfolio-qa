#!/usr/bin/env node
// Registra o Resultado Obtido e o Status de um caso pendente sem carregar o plano no contexto.
//
// Plano de teste cresce rápido (dezenas de casos, várias rodadas). Abrir o arquivo inteiro a cada
// registro gasta contexto à toa. Este script acha a linha do caso pela âncora (o trecho final e
// único do Resultado Esperado, seguido dos dois campos vazios) e troca só o que falta preencher.
//
// Uso:
//   node registrar-caso.mjs --plano <plano.md> --ancora "<fim do Resultado Esperado>" \
//        --obtido "<o que aconteceu, no passado>" --status aprovado
//
// Status: aprovado, ressalva, reprovado, aguardando.
// Opcional, para atualizar o documento de bugs na mesma chamada: --bugs <bugs.md> --bug-de "<trecho>" --bug-para "<novo>"
// Só módulos nativos do Node (16 ou superior).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const STATUS = {
  aprovado: '✅ Aprovado',
  ressalva: '⚠️ Aprovado com ressalva',
  reprovado: '❌ Reprovado',
  aguardando: '⏸️ Aguardando definição',
};

function lerArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1] !== undefined ? argv[++i] : '';
  }
  return args;
}

function main() {
  const a = lerArgs(process.argv.slice(2));
  for (const obrigatorio of ['plano', 'ancora', 'obtido', 'status']) {
    if (!a[obrigatorio]) {
      console.error(`ERRO: falta --${obrigatorio}.`);
      console.error('Uso: node registrar-caso.mjs --plano <plano.md> --ancora "<trecho>" --obtido "<texto>" --status aprovado');
      return 1;
    }
  }
  if (!STATUS[a.status]) {
    console.error(`ERRO: status "${a.status}" inválido. Use: ${Object.keys(STATUS).join(', ')}.`);
    return 1;
  }
  // O que o verificador do plano barraria depois é recusado antes de gravar.
  if (a.obtido.includes('|')) {
    console.error('ERRO: barra vertical no --obtido quebra a tabela; escreva "barra vertical" por extenso.');
    return 1;
  }
  if (!existsSync(a.plano)) {
    console.error(`ERRO: plano não encontrado: ${a.plano}`);
    return 1;
  }

  const alvo = `${a.ancora} | | ⏳ Pendente |`;
  const novo = `${a.ancora} | ${a.obtido} | ${STATUS[a.status]} |`;
  const texto = readFileSync(a.plano, 'utf8');
  const ocorrencias = texto.split(alvo).length - 1;
  if (ocorrencias === 0) {
    console.error('ERRO: âncora não encontrada, ou o caso já foi preenchido. Confira o trecho final do Resultado Esperado, com a pontuação.');
    return 1;
  }
  if (ocorrencias > 1) {
    console.error(`ERRO: a âncora aparece ${ocorrencias} vezes. Use um trecho mais específico.`);
    return 1;
  }
  // Função na substituição: "$" no texto do QA não vira padrão especial do replace.
  writeFileSync(a.plano, texto.replace(alvo, () => novo), 'utf8');
  console.log(`Caso registrado como ${STATUS[a.status]}.`);

  if (a.bugs && a['bug-de'] && a['bug-para']) {
    if (!existsSync(a.bugs)) {
      console.error(`AVISO: documento de bugs não encontrado: ${a.bugs}`);
      return 1;
    }
    const b = readFileSync(a.bugs, 'utf8');
    if (!b.includes(a['bug-de'])) {
      console.error('AVISO: trecho não encontrado no documento de bugs; nada foi alterado lá.');
      return 1;
    }
    writeFileSync(a.bugs, b.replace(a['bug-de'], () => a['bug-para']), 'utf8');
    console.log('Documento de bugs atualizado.');
  }
  return 0;
}

process.exitCode = main();
