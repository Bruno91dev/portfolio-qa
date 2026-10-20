// Auditor visual (UX-12 conteúdo e layout, UX-15 consistência). Roda no navegador: o Claude injeta
// este arquivo e chama window.__auditorVisual.resumo(opcoes) na varredura.
// Mede só o que está VISÍVEL: antes de varrer, peça ao QA para expandir filtros, abas, acordeões e diálogos.
// Nenhuma medida decide "está bonito": ela aponta presença e desvio; o QA confirma o que vê.
//
// Opções (todas opcionais):
//   raiz:        seletor do trecho a medir (padrão: a página inteira)
//   tamanhos:    [{ seletor: 'input', dim: 'height' }]  grupos que deveriam ter a mesma medida
//   linhas:      [{ seletor: '.filtros > *' }]          itens que deveriam estar na mesma linha (mesmo topo)
//   containers:  seletor das seções cujos filhos devem respeitar margem e espaçamento
//   tolerancia:  px de diferença aceita (padrão 2)
// Devolve o resumo; o relatório completo fica em window.__auditorVisualRelatorio.
(() => {
    const visivel = el => {
        if (!el || el.nodeType !== 1) return false;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    };
    const caminho = el => {
        let p = el.tagName.toLowerCase();
        if (el.id) p += '#' + el.id;
        const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
        if (cls.length) p += '.' + cls.join('.');
        const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
        return txt ? p + ' "' + txt + '"' : p;
    };
    const raizDe = sel => (sel && document.querySelector(sel)) || document.body;
    const mediana = vs => { const o = [...vs].sort((a, b) => a - b); return o[Math.floor(o.length / 2)]; };
    const moda = vs => {
        const c = {};
        vs.forEach(v => { c[v] = (c[v] || 0) + 1; });
        return Number(Object.keys(c).sort((a, b) => c[b] - c[a] || a - b)[0]);
    };

    // Chave de tradução que vazou para a tela: "carrinho.botao.aplicar", "{{ total }}".
    const pareceChave = s => {
        s = (s || '').trim();
        if (/\{\{.*\}\}/.test(s)) return true;
        if (!s || s.length > 80 || /\s/.test(s) || !/^[a-z][\w-]*(\.[\w-]+)+$/i.test(s)) return false;
        if (/^\d|@|^(https?:|www\.)/i.test(s)) return false;
        return !/\.(png|jpe?g|svg|gif|json|js|css|html?|pdf|xlsx?|docx?|com|br|org|net)$/i.test(s);
    };

    function traducao(raiz) {
        const achados = [];
        const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
            const pai = n.parentElement;
            if (!pai || !visivel(pai) || /^(SCRIPT|STYLE|CODE|PRE)$/.test(pai.tagName)) continue;
            n.nodeValue.split(/\s{2,}|\n/).forEach(t => { if (pareceChave(t)) achados.push({ tipo: 'traducao-ausente', texto: t.trim(), el: caminho(pai) }); });
        }
        raiz.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
            if (!visivel(el)) return;
            ['placeholder', 'title', 'aria-label'].forEach(a => { const v = el.getAttribute(a); if (v && pareceChave(v)) achados.push({ tipo: 'traducao-ausente', atributo: a, texto: v, el: caminho(el) }); });
        });
        return achados;
    }

    // Texto cortado sem reticências nem dica (title): o usuário perde informação sem saber.
    function textoCortado(raiz) {
        const achados = [];
        raiz.querySelectorAll('*').forEach(el => {
            if (!visivel(el) || !el.childNodes.length || ![...el.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim())) return;
            const s = getComputedStyle(el);
            const corta = s.overflow !== 'visible' || s.overflowX !== 'visible';
            if (corta && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis' && !el.title) {
                achados.push({ tipo: 'texto-cortado', el: caminho(el), visivelPx: el.clientWidth, conteudoPx: el.scrollWidth });
            }
        });
        return achados;
    }

    function tamanhos(raiz, grupos, tol) {
        return grupos.map(g => {
            const dim = g.dim || 'height';
            const els = [...raiz.querySelectorAll(g.seletor)].filter(visivel);
            if (els.length < 2) return { seletor: g.seletor, dim, total: els.length, desvios: [] };
            const vs = els.map(el => Math.round(el.getBoundingClientRect()[dim]));
            const med = mediana(vs);
            return { seletor: g.seletor, dim, total: els.length, mediana: med,
                desvios: els.map((el, i) => ({ el: caminho(el), px: vs[i], diferenca: vs[i] - med })).filter(d => Math.abs(d.diferenca) > tol) };
        });
    }

    function alinhamento(raiz, grupos, tol) {
        return grupos.map(g => {
            const els = [...raiz.querySelectorAll(g.seletor)].filter(visivel);
            const tops = els.map(el => Math.round(el.getBoundingClientRect().top));
            const med = els.length ? mediana(tops) : null;
            return { seletor: g.seletor, total: els.length,
                desvios: els.map((el, i) => ({ el: caminho(el), topo: tops[i], diferenca: tops[i] - med })).filter(d => Math.abs(d.diferenca) > tol) };
        });
    }

    // Margens e espaçamento dos filhos diretos de cada seção:
    //  - ultrapassa-container: o filho sai da área interna da seção (furou o padding);
    //  - margem-esquerda-diferente: o filho começa fora do alinhamento dos irmãos (>= 3 px);
    //  - espaco-apertado / espaco-largo: o espaço vertical até o vizinho foge do padrão da própria tela.
    function margens(raiz, seletor) {
        const achados = [];
        const espacos = [];
        const secoes = [...raiz.querySelectorAll(seletor)].filter(visivel);
        secoes.forEach(sec => {
            const s = getComputedStyle(sec);
            const r = sec.getBoundingClientRect();
            const esq = r.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft);
            const dir = r.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight);
            const filhos = [...sec.children].filter(visivel).map(el => ({ el, r: el.getBoundingClientRect() }));
            filhos.forEach(f => {
                if (f.r.left < esq - 0.5 || f.r.right > dir + 0.5) {
                    achados.push({ tipo: 'ultrapassa-container', el: caminho(f.el), secao: caminho(sec),
                        foraPx: Math.round(Math.max(esq - f.r.left, f.r.right - dir)) });
                }
            });
            const recuos = filhos.map(f => Math.round(f.r.left - esq));
            if (recuos.length >= 3) {
                const padrao = moda(recuos);
                filhos.forEach((f, i) => { if (Math.abs(recuos[i] - padrao) >= 3) achados.push({ tipo: 'margem-esquerda-diferente', el: caminho(f.el), secao: caminho(sec), recuoPx: recuos[i], padraoPx: padrao }); });
            }
            const empilhados = filhos.slice().sort((a, b) => a.r.top - b.r.top);
            for (let i = 1; i < empilhados.length; i++) {
                const gap = Math.round(empilhados[i].r.top - empilhados[i - 1].r.bottom);
                if (gap >= 0 && gap <= 48) espacos.push({ gap, el: caminho(empilhados[i].el), anterior: caminho(empilhados[i - 1].el) });
            }
        });
        if (espacos.length >= 3) {
            const padrao = moda(espacos.map(e => e.gap));
            espacos.filter(e => Math.abs(e.gap - padrao) >= 3).forEach(e =>
                achados.push({ tipo: e.gap < padrao ? 'espaco-apertado' : 'espaco-largo', el: e.el, anterior: e.anterior, espacoPx: e.gap, padraoPx: padrao }));
        }
        return { secoes: secoes.length, achados };
    }

    window.__auditorVisual = {
        resumo(op = {}) {
            const raiz = raizDe(op.raiz);
            const tol = op.tolerancia != null ? op.tolerancia : 2;
            const rel = {
                largura: window.innerWidth,
                traducao: traducao(raiz),
                textoCortado: textoCortado(raiz),
                tamanhos: tamanhos(raiz, op.tamanhos || [], tol),
                alinhamento: alinhamento(raiz, op.linhas || [], tol),
                margens: margens(raiz, op.containers || 'form, fieldset, section, [class*="card"], [class*="panel"]')
            };
            window.__auditorVisualRelatorio = rel;
            return {
                largura: rel.largura,
                traducaoAusente: rel.traducao.length,
                textoCortado: rel.textoCortado.length,
                tamanhoFora: rel.tamanhos.reduce((n, g) => n + g.desvios.length, 0),
                foraDaLinha: rel.alinhamento.reduce((n, g) => n + g.desvios.length, 0),
                secoesMedidas: rel.margens.secoes,
                margemEspacamento: rel.margens.achados.length,
                primeiros: [...rel.traducao, ...rel.textoCortado, ...rel.margens.achados].slice(0, 10)
            };
        }
    };
    return { auditorVisual: 'ativo', uso: 'window.__auditorVisual.resumo({ tamanhos: [...], linhas: [...] })' };
})();
