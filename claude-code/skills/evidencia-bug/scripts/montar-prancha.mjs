#!/usr/bin/env node
// Monta a prancha de evidência de um BUG a partir de uma especificação JSON (modelo em
// modelos/spec-exemplo.json, na pasta desta skill).
//
// Uso:
//   node montar-prancha.mjs <spec.json>          gera <saida>.html (página única, imagens embutidas)
//   node montar-prancha.mjs <spec.json> --png    também gera o PNG, com o Chrome ou o Edge sem janela
//   node montar-prancha.mjs <spec.json> --grade  gera <saida>-grade.html com grade de coordenadas
//                                                 (linhas a cada 50 px, rótulos a cada 100 px) para achar o "ret"
// Para o --png, o navegador é procurado nos caminhos padrão; outro caminho vai na variável CHROME_PATH.
// Sai com código 1 se a especificação tiver ERRO. AVISO não impede a montagem, mas deve ser corrigido.
// Só módulos nativos do Node (16 ou superior); imagens PNG ou JPEG.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LARGURA = 1500;
const ESPACO = 16;
const FOLGA = 3;
const CORES = { vermelho: '#d32f2f', azul: '#1565c0' };
const PARECE_PASSO = /\b(clicar|clique|acessar|abrir|configurar|ligar|desligar|preencher|digitar|passo \d)\b/i;
const DATA_HORA = /\b\d{2}\/\d{2}(\/\d{2,4})?\b|\b\d{1,2}:\d{2}\b/;

// Largura e altura lidas do cabeçalho do arquivo, sem biblioteca.
function dimensoes(buf) {
  if (buf.slice(1, 4).toString() === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), tipo: 'image/png' };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marca = buf[i + 1];
      const tam = buf.readUInt16BE(i + 2);
      if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), tipo: 'image/jpeg' };
      }
      i += 2 + tam;
    }
  }
  throw new Error('imagem não é PNG nem JPEG');
}

const html = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Altura aproximada de um texto que quebra em linhas (14 px de fonte, ~7,2 px por caractere).
const alturaTexto = (texto, largura, linha = 20) => Math.max(1, Math.ceil(String(texto || '').length * 7.2 / Math.max(largura - 24, 50))) * linha;

function main() {
  const args = process.argv.slice(2);
  const specArq = args.find((a) => !a.startsWith('--'));
  const comPng = args.includes('--png');
  const comGrade = args.includes('--grade');
  if (!specArq) { console.error('Uso: node montar-prancha.mjs <spec.json> [--png] [--grade]'); return 1; }
  if (!existsSync(specArq)) { console.error(`ERRO   especificação não encontrada: ${specArq}`); return 1; }

  let spec;
  try { spec = JSON.parse(readFileSync(specArq, 'utf8')); } catch (e) { console.error(`ERRO   JSON inválido: ${e.message}`); return 1; }
  const pastaSpec = path.dirname(path.resolve(specArq));
  const erros = [];
  const avisos = [];
  if (!spec.titulo || !/^BUG-\d+/.test(spec.titulo)) erros.push('"titulo" precisa começar com "BUG-NNN —", igual ao título do BUG');
  if (!spec.saida) erros.push('"saida" ausente (ex.: evidencias/123/123-BUG-001-descricao.png)');
  if (!Array.isArray(spec.linhas) || !spec.linhas.length) erros.push('"linhas" ausente ou vazio');
  if (!spec.esperado) erros.push('"esperado" ausente (o rodapé diz o comportamento correto)');
  if (!spec.ambiente) erros.push('"ambiente" ausente (versão, branch e commit, como no BUG)');
  if (DATA_HORA.test(spec.ambiente || '')) avisos.push('"ambiente" com data ou hora: basta versão, branch e commit');
  for (const t of [spec.esperado, ...(spec.observacoes || [])]) if (PARECE_PASSO.test(t || '')) avisos.push(`rodapé parece trazer passo ou configuração: "${String(t).slice(0, 60)}"`);
  if (!spec.saida || !Array.isArray(spec.linhas)) { erros.forEach((e) => console.log(`ERRO   ${e}`)); return 1; }

  const linhasHtml = [];
  let alturaTotal = 70 + 40; // título + margens
  spec.linhas.forEach((linha, li) => {
    if (!Array.isArray(linha) || linha.length < 1 || linha.length > 2) { erros.push(`linha ${li + 1}: cada linha tem 1 ou 2 painéis`); return; }
    const larguraPainel = (LARGURA - ESPACO * (linha.length + 1)) / linha.length;
    let alturaLinha = 0;
    const paineis = linha.map((p, pi) => {
      const onde = `linha ${li + 1}, painel ${pi + 1}`;
      const cor = CORES[p.cor] ? p.cor : 'vermelho';
      if (!p.titulo || !p.legenda) erros.push(`${onde}: "titulo" e "legenda" são obrigatórios`);
      if (PARECE_PASSO.test(p.legenda || '')) avisos.push(`${onde}: legenda parece trazer passo; a legenda descreve só o que o painel mostra`);
      let corpo = '';
      let alturaCorpo = 0;
      if (p.texto !== undefined) {
        if (!p.origem) erros.push(`${onde}: painel de texto sem "origem" (de onde o texto foi copiado)`);
        const linhasTexto = String(p.texto).split('\n');
        const marcadas = new Set();
        for (const d of p.destaques || []) for (let k = d.linhas[0]; k <= d.linhas[1]; k++) marcadas.add(k);
        corpo = `<pre class="texto">${linhasTexto.map((t, k) => `<span class="${marcadas.has(k + 1) ? `marca ${cor}` : ''}">${html(t) || ' '}</span>`).join('')}</pre>` +
          `<div class="origem">Origem: ${html(p.origem)}</div>`;
        alturaCorpo = linhasTexto.length * 18 + 50;
      } else {
        const arq = path.resolve(pastaSpec, p.imagem || '');
        if (!p.imagem || !existsSync(arq)) { erros.push(`${onde}: imagem não encontrada: ${p.imagem}`); return ''; }
        const buf = readFileSync(arq);
        let dim;
        try { dim = dimensoes(buf); } catch (e) { erros.push(`${onde}: ${e.message}`); return ''; }
        const [rx, ry, rw, rh] = p.recorte || [0, 0, dim.w, dim.h];
        if (rx + rw > dim.w || ry + rh > dim.h) avisos.push(`${onde}: recorte passa do tamanho da imagem (${dim.w}x${dim.h})`);
        const escala = Math.min(p.escala || 1, (larguraPainel - 24) / rw); // nunca amplia além da escala pedida
        const destaques = (p.destaques || []).map((d) => {
          const [x, y, w, h] = d.ret;
          const f = d.folga ?? FOLGA;
          if (x + w < rx || y + h < ry || x > rx + rw || y > ry + rh) avisos.push(`${onde}: destaque ${JSON.stringify(d.ret)} fora do recorte`);
          const c = CORES[d.cor] ? d.cor : cor;
          return `<div class="destaque" style="left:${(x - rx - f) * escala}px;top:${(y - ry - f) * escala}px;width:${(w + 2 * f) * escala}px;height:${(h + 2 * f) * escala}px;border-color:${CORES[c]}"></div>`;
        }).join('');
        const grade = comGrade ? gradeHtml(rx, ry, rw, rh, escala) : '';
        corpo = `<div class="recorte" style="width:${rw * escala}px;height:${rh * escala}px">` +
          `<img src="data:${dim.tipo};base64,${buf.toString('base64')}" style="left:${-rx * escala}px;top:${-ry * escala}px;width:${dim.w * escala}px">` +
          `${destaques}${grade}</div>`;
        alturaCorpo = rh * escala;
      }
      const alturaPainel = 34 + alturaCorpo + alturaTexto(p.legenda, larguraPainel) + 36;
      alturaLinha = Math.max(alturaLinha, alturaPainel);
      return `<div class="painel" style="width:${larguraPainel}px;border-color:${CORES[cor]}">` +
        `<div class="faixa" style="background:${CORES[cor]}">${html(p.titulo)}</div>${corpo}<div class="legenda">${html(p.legenda)}</div></div>`;
    });
    alturaTotal += alturaLinha + ESPACO;
    linhasHtml.push(`<div class="linha">${paineis.join('')}</div>`);
  });
  const rodape = [`<b>Esperado:</b> ${html(spec.esperado)}`, ...(spec.observacoes || []).map(html), `<span class="amb">${html(spec.ambiente)}</span>`];
  alturaTotal += rodape.length * 24 + 40;

  avisos.forEach((a) => console.log(`AVISO  ${a}`));
  if (erros.length) { erros.forEach((e) => console.log(`ERRO   ${e}`)); return 1; }

  const pagina = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${html(spec.titulo)}</title><style>
body{margin:0;background:#fff;font:14px/1.4 Arial,Helvetica,sans-serif;color:#222;width:${LARGURA}px}
h1{font-size:22px;margin:0;padding:20px ${ESPACO}px 10px}
.linha{display:flex;gap:${ESPACO}px;padding:${ESPACO / 2}px ${ESPACO}px;align-items:flex-start}
.painel{border:2px solid;border-radius:4px;overflow:hidden;box-sizing:border-box}
.faixa{color:#fff;font-weight:bold;padding:7px 12px}
.recorte{position:relative;overflow:hidden;margin:12px}
.recorte img{position:absolute;max-width:none}
.destaque{position:absolute;border:3px solid;border-radius:3px;box-sizing:border-box}
.texto{margin:12px;font:13px/18px Consolas,monospace;white-space:pre-wrap;background:#f6f6f6;padding:8px}
.texto span{display:block}.marca.vermelho{background:#fde0e0;border-left:4px solid ${CORES.vermelho}}.marca.azul{background:#e0ecfd;border-left:4px solid ${CORES.azul}}
.origem{margin:0 12px;color:#555;font-size:12px}
.legenda{padding:8px 12px 12px}
.rodape{padding:10px ${ESPACO}px 20px;border-top:1px solid #ddd;margin-top:8px}.rodape div{margin:4px 0}.amb{color:#666}
.g{position:absolute;background:rgba(255,0,255,.35)}.gr{position:absolute;font:10px monospace;color:#a0a;background:#fff}
</style></head><body><h1>${html(spec.titulo)}</h1>${linhasHtml.join('')}
<div class="rodape">${rodape.map((r) => `<div>${r}</div>`).join('')}</div></body></html>`;

  const base = path.resolve(pastaSpec, spec.saida).replace(/\.(png|html)$/i, '') + (comGrade ? '-grade' : '');
  writeFileSync(`${base}.html`, pagina, 'utf8');
  console.log(`Prancha HTML: ${base}.html`);
  if (comPng) {
    const navegador = acharNavegador();
    if (!navegador) { console.log('ERRO   Chrome ou Edge não encontrado; informe o caminho na variável CHROME_PATH ou abra o HTML e salve a imagem.'); return 1; }
    execFileSync(navegador, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--screenshot=${base}.png`,
      `--window-size=${LARGURA},${Math.ceil(alturaTotal)}`, pathToFileURL(`${base}.html`).href], { stdio: 'ignore' });
    console.log(`Prancha PNG:  ${base}.png  (altura estimada: abra e confira se nada ficou cortado)`);
  }
  console.log('Confira antes de entregar: destaque no elemento certo, legenda só com o que o painel mostra, nenhum painel sobrando, sem dado sensível.');
  return 0;
}

function gradeHtml(rx, ry, rw, rh, escala) {
  let g = '';
  for (let x = Math.ceil(rx / 50) * 50; x <= rx + rw; x += 50) {
    g += `<div class="g" style="left:${(x - rx) * escala}px;top:0;width:1px;height:100%"></div>`;
    if (x % 100 === 0) g += `<div class="gr" style="left:${(x - rx) * escala + 2}px;top:0">${x}</div>`;
  }
  for (let y = Math.ceil(ry / 50) * 50; y <= ry + rh; y += 50) {
    g += `<div class="g" style="top:${(y - ry) * escala}px;left:0;height:1px;width:100%"></div>`;
    if (y % 100 === 0) g += `<div class="gr" style="top:${(y - ry) * escala + 2}px;left:0">${y}</div>`;
  }
  return g;
}

function acharNavegador() {
  const candidatos = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidatos.find((c) => c && existsSync(c));
}

process.exitCode = main();
