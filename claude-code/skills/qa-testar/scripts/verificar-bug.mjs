#!/usr/bin/env node
// Verificador do texto do BUG (regras em referencias/regras-do-bug.md, na pasta desta skill).
//
// Uso:
//   node verificar-bug.mjs <bugs.md> [outro.md ...]
//
// Confere cada BUG do documento (cada um começa em "### BUG-NNN"):
//   - linguagem acessível: sem termo técnico em Título, Resumo, Descrição, Passos, Resultados e Impacto
//     (nos Passos valem o endereço da tela, a configuração entre crases e o bloco de código para colar);
//   - estrutura: Camada afetada, Status da Correção e Sugestão de correção com Problema, Solução e
//     Por que funciona, cada item com a marca de confiança;
//   - Evidências só com a prova: o caminho da imagem ou do vídeo entre crases, ou "Sem imagem:" e a prova;
//   - sem dia e hora de quando foi feito (salvo seção marcada com <!-- tempo relevante -->);
//   - tamanho: meta de 1.500 a 2.000 caracteres, teto de 3.000 (blocos de código não contam).
// Sai com código 1 se algum BUG tiver ERRO. Só módulos nativos do Node (16 ou superior).

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const META_BUG = 2000;
const TETO_BUG = 3000;
const CAMPOS_ACESSIVEIS = ['Título', 'Resumo', 'Descrição', 'Passos para Reproduzir', 'Resultado Esperado',
  'Resultado Obtido', 'Impacto'];

const TERMOS_TECNICOS = [
  ['código entre crases', /`[^`]+`/g],
  ['rota de API ou URL', /\/api\/|https?:\/\/\S+/gi],
  ['verbo HTTP', /\b(GET|POST|PUT|PATCH|DELETE)\b/g],
  ['código de resposta HTTP', /\b(200|201|204|400|401|403|404|405|409|415|422|500|502|503)\b/g],
  ['commit', /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/g],
  ['nome de arquivo', /\b[\w.-]+\.(cs|ts|tsx|js|jsx|py|java|kt|go|rb|php|html|css|scss|json|sql|xml|yml|yaml)\b/gi],
  ['JSON', /\{\s*"|\[\s*\{/g],
  ['SQL', /\b(SELECT|UPDATE|INSERT INTO|DELETE FROM)\s/g],
  ['identificador de código', /\b[a-z]+[A-Z][A-Za-z0-9]*\b|\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*\b/g],
  ['nome de tabela ou constante', /\b[A-Z][A-Z_]{9,}\b/g],
];

// Nos Passos, quem conhece o básico do sistema precisa de: endereço da tela (não rota de API) e a
// configuração escrita por inteiro entre crases (`arquivo.ini`, `[secao]`, `opcao=valor`).
const PERMITIDO_NOS_PASSOS = [
  /`?\bhttps?:\/\/(?![^\s`]*\/api\/)[^\s`]+`?/g,
  /`(?:[\w.-]+\.(?:ini|conf|env|properties)|\[[\w.-]+\]|[A-Za-z][\w.-]*=[^`\s]*)`/g,
];

const RE_BUG = /^###\s+(BUG-\d+)/;
const RE_CAMPO = /^- \*\*([^*]+?):\*\*/;
const RE_CERCA = /^\s*```/;
const RE_SUGESTAO = /^####\s+Sugest[aã]o de corre[cç][aã]o/i;
const RE_ITEM = /^(\d+)\.\s/;
const RE_CONFIANCA = /\[(Confirmado por medição|Leitura do código|Hipótese[^\]]*|A conferir)\]/;
const RE_STATUS_PROIBIDO = /^- \*\*Status da Corre[cç][aã]o:\*\*\s*(Aguardando|Pendente|Aberto)\b/i;
const MARCA_TEMPO = '<!-- tempo relevante -->';
const RE_TEMPO = /\b\d{2}\/\d{2}\/\d{4}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b|\b\d{1,2}h\d{2}\b|(?<![\d/\\])\b(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\b(?![\d/])/g;
const RE_EVIDENCIA_OK = /`[^`]+\.(png|jpe?g|gif|webp|mp4|webm)`|Sem imagem:/i;
const RE_EVIDENCIA_INSTRUCAO = /como (simular|reproduzir)|trecho para o console|registrad[oa] no[^.]*\bCT\d+|https?:\/\/\S+|(?:^|[.:;]\s+|\*\*\s*)(Abrir|Clicar|Acessar|Colar|Executar|Configurar|Ligar|Desligar)\b/gi;

// Divide o documento em BUGs: [{ bug, linhaInicial, linhas[] }].
function bugsDoDocumento(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const bugs = [];
  linhas.forEach((l, idx) => {
    const m = l.match(RE_BUG);
    if (m) bugs.push({ bug: m[1], linhaInicial: idx + 1, linhas: [] });
    if (bugs.length) bugs[bugs.length - 1].linhas.push(l);
  });
  return bugs;
}

// Percorre o BUG devolvendo { n, campo, conteudo, emCodigo, naSugestao } para cada linha.
function* linhasComCampo({ linhaInicial, linhas }) {
  let campo = null;
  let emCodigo = false;
  let naSugestao = false;
  for (let k = 0; k < linhas.length; k++) {
    const l = linhas[k];
    const n = linhaInicial + k;
    if (RE_CERCA.test(l)) {
      emCodigo = !emCodigo;
      yield { n, campo, conteudo: l, emCodigo: true, cerca: true, naSugestao };
      continue;
    }
    if (!emCodigo && (l.startsWith('####') || l.trim() === '---')) {
      campo = null;
      if (RE_SUGESTAO.test(l)) naSugestao = true;
      continue;
    }
    const m = emCodigo ? null : l.match(RE_CAMPO);
    if (m) campo = m[1].trim();
    yield { n, campo, conteudo: m ? l.slice(m[0].length) : l, emCodigo, cerca: false, naSugestao };
  }
}

function conferirBug(b) {
  const achados = []; // [nivel, linha, campo, regra, trecho]
  const corpo = b.linhas.join('\n');
  const tempoRelevante = corpo.includes(MARCA_TEMPO);
  const itensSugestao = [];

  for (const { n, campo, conteudo, emCodigo, cerca, naSugestao } of linhasComCampo(b)) {
    // Evidências: só a prova.
    if (campo === 'Evidências') {
      if (cerca) achados.push(['ERRO', n, campo, 'instrução de reprodução em Evidências', 'bloco de código (vai no passo que manda colar)']);
      else if (!emCodigo) {
        for (const m of conteudo.replace(/`[^`]*`/g, '').matchAll(RE_EVIDENCIA_INSTRUCAO)) {
          achados.push(['ERRO', n, campo, 'instrução, endereço ou referência em Evidências', m[0].replace(/^[\s.:;*]+/, '').slice(0, 40)]);
        }
        if (RE_CAMPO.test(b.linhas[n - b.linhaInicial]) && !RE_EVIDENCIA_OK.test(conteudo)) {
          achados.push(['ERRO', n, campo, 'Evidências fora do formato', 'caminho da imagem entre crases ou "Sem imagem: <prova>"']);
        }
      }
    }
    if (emCodigo) continue;

    // Data e hora de quando foi feito.
    if (!tempoRelevante) {
      for (const m of conteudo.replace(/`[^`]*`/g, '').matchAll(RE_TEMPO)) {
        achados.push(['ERRO', n, campo || 'texto', 'data ou hora de quando foi feito', m[0]]);
      }
    }

    // Termo técnico nos campos em linguagem acessível.
    if (CAMPOS_ACESSIVEIS.includes(campo)) {
      let texto = conteudo;
      if (campo === 'Passos para Reproduzir') for (const re of PERMITIDO_NOS_PASSOS) texto = texto.replace(re, '');
      for (const [nome, re] of TERMOS_TECNICOS) {
        for (const m of texto.matchAll(re)) achados.push(['ERRO', n, campo, `termo técnico (${nome})`, m[0].slice(0, 40)]);
      }
    }

    // Status da Correção de BUG novo.
    if (RE_STATUS_PROIBIDO.test(b.linhas[n - b.linhaInicial])) {
      achados.push(['ERRO', n, 'Status da Correção', 'BUG novo leva "Em análise pelo desenvolvedor"', conteudo.trim().slice(0, 40)]);
    }

    // Itens da Sugestão de correção (linha de continuação indentada entra no item).
    if (naSugestao) {
      if (RE_ITEM.test(conteudo)) itensSugestao.push({ n, texto: conteudo });
      else if (itensSugestao.length && /^\s+\S/.test(conteudo)) itensSugestao[itensSugestao.length - 1].texto += ' ' + conteudo.trim();
    }
  }

  // Estrutura.
  const n0 = b.linhaInicial;
  if (!/^- \*\*Camada afetada:\*\*/m.test(corpo)) achados.push(['ERRO', n0, 'estrutura', 'falta o campo Camada afetada', '']);
  if (!/^- \*\*Status da Corre[cç][aã]o:\*\*/m.test(corpo)) achados.push(['ERRO', n0, 'estrutura', 'falta o campo Status da Correção', '']);
  if (!b.linhas.some((l) => RE_SUGESTAO.test(l))) {
    achados.push(['ERRO', n0, 'estrutura', 'falta a seção "#### Sugestão de correção"', '']);
  } else {
    for (const rotulo of ['Problema', 'Solução', 'Por que funciona']) {
      if (!itensSugestao.some((i) => i.texto.includes(`**${rotulo}:**`))) {
        achados.push(['ERRO', n0, 'Sugestão', `falta o item **${rotulo}:**`, '']);
      }
    }
    for (const i of itensSugestao) {
      if (!RE_CONFIANCA.test(i.texto)) achados.push(['ERRO', i.n, 'Sugestão', 'item sem marca de confiança', i.texto.slice(0, 40)]);
    }
  }

  // Tamanho, sem contar blocos de código (o trecho para colar no console é normal e não pesa).
  const tamanho = corpo.replace(/^\s*```[\s\S]*?^\s*```[^\n]*$/gm, '').trim().length;
  if (tamanho > TETO_BUG) achados.push(['ERRO', n0, 'BUG inteiro', `texto longo (${tamanho} caracteres, teto ${TETO_BUG})`, 'enxugar: o detalhe da medição vai no plano']);
  else if (tamanho > META_BUG) achados.push(['AVISO', n0, 'BUG inteiro', `acima da meta (${tamanho} caracteres, meta até ${META_BUG})`, '']);

  return achados;
}

const ORIENTACAO = [
  'Como corrigir:',
  '  Termo técnico: reescrever o Título, o Resumo, a Descrição, os Resultados e o Impacto em termos do que a pessoa vê. A causa técnica vai na Sugestão de correção.',
  '  Passos: podem trazer o endereço da tela, a configuração entre crases e o bloco de código para colar, no próprio passo.',
  '  Evidências: só o caminho da imagem ou do vídeo entre crases, ou "Sem imagem:" e a prova numa linha. Instrução é do passo; "como eu provei" é do plano.',
  '  Sugestão de correção: três itens (Problema, Solução, Por que funciona), cada um com [Confirmado por medição], [Leitura do código], [Hipótese ...] ou [A conferir].',
  `  Data ou hora: tirar o dia e a hora de quando foi feito. Se o tempo fizer parte do defeito, marcar o BUG com ${MARCA_TEMPO}.`,
  '  Status da Correção: BUG novo leva "Em análise pelo desenvolvedor".',
];

function main(arquivos) {
  if (!arquivos.length) {
    console.error('Uso: node verificar-bug.mjs <bugs.md> [outro.md ...]');
    return 1;
  }
  let temErro = false;
  for (const arq of arquivos) {
    if (!existsSync(arq)) {
      console.log(`ERRO   arquivo não encontrado: ${arq}`);
      temErro = true;
      continue;
    }
    const bugs = bugsDoDocumento(readFileSync(arq, 'utf8'));
    if (!bugs.length) {
      console.log(`ERRO   ${basename(arq)}: nenhum BUG encontrado (cada BUG começa com "### BUG-001")`);
      temErro = true;
      continue;
    }
    let errosArq = 0;
    let avisosArq = 0;
    const saida = [];
    for (const b of bugs) {
      const achados = conferirBug(b);
      if (!achados.length) continue;
      saida.push(`  ${b.bug}:`);
      for (const [nivel, n, campo, regra, trecho] of achados.slice(0, 25)) {
        saida.push(`    ${nivel.padEnd(5)} linha ${n} | ${campo} | ${regra}${trecho ? `: ${trecho}` : ''}`);
      }
      if (achados.length > 25) saida.push(`    ... e mais ${achados.length - 25}`);
      errosArq += achados.filter((a) => a[0] === 'ERRO').length;
      avisosArq += achados.filter((a) => a[0] === 'AVISO').length;
    }
    console.log(`${basename(arq)}: ${bugs.length} BUG(s) lido(s), ${errosArq} erro(s), ${avisosArq} aviso(s)`);
    if (saida.length) console.log(saida.join('\n'));
    if (errosArq) { console.log(ORIENTACAO.join('\n')); temErro = true; }
  }
  return temErro ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
