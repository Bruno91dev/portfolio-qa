#!/usr/bin/env node
// Verificador do plano de teste (regras em referencias/regras-do-plano.md, na pasta desta skill).
//
// Uso:
//   node verificar-plano.mjs <plano.md>              confere o plano inteiro e mostra o placar do ciclo atual
//   node verificar-plano.mjs <plano.md> --fim-ciclo  também exige o ciclo atual sem caso pendente e sem ⏳ no mapa
//
// ERRO  = quebra uma regra do modelo (tabela, numeração, piso, mapa). Sai com código 1.
// AVISO = provável desvio que pode ser legítimo (lacuna na numeração, data no Resultado Obtido).
// Sempre informa o que leu: um "ok" sem contagem não prova nada.
// Só módulos nativos do Node (16 ou superior).

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const STATUS = {
  aprovado: '✅ Aprovado',
  ressalva: '⚠️ Aprovado com ressalva',
  reprovado: '❌ Reprovado',
  aguardando: '⏸️ Aguardando definição',
  ok: 'OK',
  pendente: '⏳ Pendente',
};
const ANCORA_PENDENTE = ' | | ⏳ Pendente |';
const DATA = /(?<![\w/])\d{2}\/\d{2}(?:\/\d{2,4})?(?![\w/])/;
const HORA = /(?<![\w:])\d{1,2}:\d{2}(?::\d{2})?(?![\w:])/;
// Cabeçalho de seção de reteste: "### 7. Reteste - Ciclo 2 (dd/mm/aaaa)". Subitens usam ####.
const CABECALHO_RETESTE = /^#{2,3}\s+\d+\.\s+Reteste\b.*?Ciclo\s+(\d+)/i;

// Tira o seletor de variação dos emojis e espaços sobrando, para comparar status.
const norm = (s) => s.normalize('NFC').replace(/️/g, '').split(/\s+/).filter(Boolean).join(' ');
const STATUS_NORM = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [norm(v).toLowerCase(), k]));

function celulas(linha) {
  let corpo = linha.trim();
  if (corpo.startsWith('|')) corpo = corpo.slice(1);
  if (corpo.endsWith('|')) corpo = corpo.slice(0, -1);
  return corpo.split('|');
}

const semCodigo = (t) => t.replace(/`[^`]*`/g, '');
const idsCitados = (t) => (t.match(/CT\d{3}/g) || []).map((x) => Number(x.slice(2)));

function main(args) {
  const arquivo = args.find((a) => !a.startsWith('--'));
  const fimCiclo = args.includes('--fim-ciclo');
  if (!arquivo) {
    console.error('Uso: node verificar-plano.mjs <plano.md> [--fim-ciclo]');
    return 1;
  }
  if (!existsSync(arquivo)) {
    console.error(`ERRO   arquivo não encontrado: ${arquivo}`);
    return 1;
  }
  const linhas = readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const erros = [];
  const avisos = [];

  // Tabelas = blocos de linhas consecutivas que começam com "|", fora de bloco de código.
  const tabelas = [];
  let atual = [];
  let emCodigo = false;
  linhas.forEach((l, idx) => {
    if (l.trim().startsWith('```')) emCodigo = !emCodigo;
    if (!emCodigo && l.trimStart().startsWith('|')) atual.push([idx + 1, l]);
    else if (atual.length) { tabelas.push(atual); atual = []; }
  });
  if (atual.length) tabelas.push(atual);

  // Ciclo atual = depois do último cabeçalho de reteste; sem reteste, a bateria original (ciclo 1).
  let inicioCiclo = 0;
  let numeroCiclo = 1;
  linhas.forEach((l, idx) => {
    const m = l.match(CABECALHO_RETESTE);
    if (m) { inicioCiclo = idx + 1; numeroCiclo = Number(m[1]); }
  });

  const casos = [];        // { n, linha, status }
  const mapaCts = [];      // { linha, cts }
  const pisoCts = [];      // { linha, cts }
  let linhasMapa = 0;
  let linhasPiso = 0;
  let mapaPendAtual = 0;
  let mapaPendAntigo = 0;

  for (const tab of tabelas) {
    const cab = celulas(tab[0][1]).map(norm);
    const ncol = cab.length;
    const ehCasos = cab[0] === 'ID' && cab.includes('Status');
    const ehMapa = cab.some((c) => c.includes('Prova de execução'));
    const ehPiso = cab.some((c) => c.includes('CT que cobre'));
    const colCtMapa = cab.findIndex((c) => c.startsWith('CT que executa'));
    const colCtPiso = cab.findIndex((c) => c.startsWith('CT que cobre'));

    for (const [i, l] of tab.slice(1)) {
      if (/^\s*\|\s*:?-{3,}/.test(l)) continue;
      if (l.includes('\\|')) erros.push(`l.${i}: barra vertical escapada (\\|) dentro de célula; escreva "barra vertical" por extenso`);
      const cs = celulas(l);
      if (cs.length !== ncol) {
        erros.push(`l.${i}: ${cs.length} colunas, a tabela tem ${ncol} (barra vertical solta numa célula?)`);
        continue;
      }
      if (ehMapa) {
        linhasMapa++;
        const prova = norm(cs[ncol - 1]);
        if (prova === '' || prova.startsWith('⏳')) {
          if (i > inicioCiclo) mapaPendAtual++; else mapaPendAntigo++;
        }
        if (colCtMapa >= 0) {
          const celula = norm(cs[colCtMapa]);
          if (!celula) erros.push(`l.${i}: ramo do mapa sem CT; crie o caso, ou use "—" (sem lógica executável) ou "Inalcançável: <motivo>" na prova`);
          mapaCts.push({ linha: i, cts: idsCitados(celula) });
        }
      }
      if (ehPiso) {
        linhasPiso++;
        const celula = norm(cs[colCtPiso]);
        if (!celula) erros.push(`l.${i}: item do piso (critério de aceite ou roteiro do dev) sem caso que o cubra`);
        else if (!idsCitados(celula).length && !/^Inalcançável/i.test(celula)) {
          erros.push(`l.${i}: item do piso sem CT válido (${celula.slice(0, 40)}); use o ID do caso ou "Inalcançável: <motivo>"`);
        }
        pisoCts.push({ linha: i, cts: idsCitados(celula) });
      }
      if (!ehCasos) continue;

      const idCelula = cs[0].trim();
      const m = idCelula.match(/^\*\*CT(\d{3})\*\*$/);
      if (!m) erros.push(`l.${i}: ID ${JSON.stringify(idCelula)} fora do padrão **CT000** (inteiro, 3 dígitos, negrito)`);

      let chave = STATUS_NORM[norm(cs[ncol - 1]).toLowerCase()];
      if (!chave) {
        const st = norm(cs[ncol - 1]);
        if (!st) erros.push(`l.${i}: Status vazio (linha cortada? caso pendente leva "⏳ Pendente")`);
        else erros.push(`l.${i}: status ${JSON.stringify(st.slice(0, 40))} fora dos valores do modelo`);
        chave = 'invalido';
      }
      if (chave === 'pendente') {
        if (cs[ncol - 2].trim()) erros.push(`l.${i}: caso ⏳ Pendente com Resultado Obtido preenchido`);
        else if (!l.trimEnd().endsWith(ANCORA_PENDENTE)) {
          erros.push(`l.${i}: caso pendente não termina com "${ANCORA_PENDENTE}" (âncora do registrar-caso.mjs)`);
        }
      }
      const obtido = semCodigo(cs[ncol - 2]);
      if ((DATA.test(obtido) || HORA.test(obtido)) && !l.includes('tempo relevante')) {
        avisos.push(`l.${i}: data ou hora no Resultado Obtido (só quando o tempo faz parte do que se testa)`);
      }
      if (m) casos.push({ n: Number(m[1]), linha: i, status: chave });
    }
  }

  // Numeração: crescente, sem repetição; lacuna é aviso.
  const vistos = new Map();
  for (const c of casos) {
    if (vistos.has(c.n)) erros.push(`l.${c.linha}: CT${String(c.n).padStart(3, '0')} repetido (já na l.${vistos.get(c.n)})`);
    else vistos.set(c.n, c.linha);
  }
  for (let k = 1; k < casos.length; k++) {
    const a = casos[k - 1].n;
    const b = casos[k].n;
    const id = (x) => `CT${String(x).padStart(3, '0')}`;
    if (b < a) erros.push(`l.${casos[k].linha}: ${id(b)} depois de ${id(a)}, fora de ordem`);
    else if (b > a + 1) avisos.push(`l.${casos[k].linha}: lacuna na numeração entre ${id(a)} e ${id(b)} (renumerar)`);
  }

  // Todo CT citado no mapa e no piso precisa existir na tabela de casos.
  for (const { linha, cts } of [...mapaCts, ...pisoCts]) {
    for (const n of cts) {
      if (!vistos.has(n)) erros.push(`l.${linha}: CT${String(n).padStart(3, '0')} citado, mas não existe na tabela de casos`);
    }
  }

  // Seções obrigatórias do modelo.
  const titulos = linhas.filter((l) => l.startsWith('#')).map(norm);
  for (const nome of ['Resultados e Conclusão', 'Pontos de Atenção', 'Casos Descartados por Escopo']) {
    if (!titulos.some((t) => t.includes(nome))) erros.push(`seção "${nome}" não encontrada`);
  }
  if (!linhasMapa) erros.push('mapa de cobertura não encontrado (tabela com a coluna "Prova de execução")');
  if (!linhasPiso) avisos.push('tabela do piso não encontrada (coluna "CT que cobre"): confira se todo critério de aceite e item do roteiro do dev tem caso');
  if (mapaPendAtual) {
    (fimCiclo ? erros : avisos).push(`mapa de cobertura do ciclo atual com ${mapaPendAtual} ramo(s) sem prova de execução (⏳)`);
  }
  if (mapaPendAntigo) avisos.push(`${mapaPendAntigo} ramo(s) sem prova (⏳) em mapa de ciclo anterior (seção antiga não se altera)`);

  // Placar do ciclo atual: é o estado presente, não o histórico somado.
  const doCiclo = casos.filter((c) => c.linha > inicioCiclo);
  const conta = (k) => doCiclo.filter((c) => c.status === k).length;
  const pendentes = doCiclo.filter((c) => c.status === 'pendente').map((c) => `CT${String(c.n).padStart(3, '0')}`);
  if (fimCiclo && pendentes.length) erros.push(`ciclo atual com ${pendentes.length} caso(s) pendente(s): ${pendentes.join(', ')}`);

  const nomeCiclo = inicioCiclo ? `Ciclo ${numeroCiclo} (reteste)` : 'bateria original';
  console.log(`Lidos: ${casos.length} casos em ${tabelas.length} tabelas, ${linhasMapa} linhas de mapa, ${linhasPiso} itens do piso — ${basename(arquivo)}`);
  console.log(`Placar do ciclo atual, ${nomeCiclo}: ${conta('aprovado')} aprovados, ${conta('ressalva')} com ressalva, ` +
    `${conta('reprovado')} reprovados, ${conta('aguardando')} aguardando definição, ${pendentes.length} pendentes`);
  if (pendentes.length) console.log(`Retomar pelo ${pendentes[0]} (pendentes: ${pendentes.join(', ')})`);
  for (const e of erros) console.log(`ERRO   ${e}`);
  for (const a of avisos) console.log(`AVISO  ${a}`);
  console.log(erros.length || avisos.length ? `Resultado: ${erros.length} erro(s), ${avisos.length} aviso(s)` : 'Resultado: ok');
  return erros.length ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
