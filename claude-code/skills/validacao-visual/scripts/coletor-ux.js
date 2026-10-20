// Coletor de feedback, foco e duplicidade (UX-01, 02, 03, 04, 07, 09, 11, 13, 14). Roda no navegador:
// o Claude injeta este arquivo ANTES de o QA agir; ele só registra o que acontece depois de ligado.
// Reinjetar não duplica os ouvintes, mas ZERA o __uxLog: reinjetar só depois de F5 ou de navegar.
//
// Cria:
//   window.__uxLog         desabilitou/habilitou, loading-on/off, foco (com dentroDeDialogo) e mensagem;
//   window.__uxReq         gravações (POST, PUT, PATCH, DELETE) com verbo, endereço, status e t (ms),
//                          só quando a página ainda não tem o __reqLog da skill qa-testar;
//   window.__uxDuplicadas  gravações idênticas (mesmo verbo e endereço) em menos de 2 s.
(() => {
    const CARREGANDO = /spinner|skeleton|progress|loading|loader|busy/i;
    const DIALOGO = '[role="dialog"], [role="alertdialog"], dialog, [aria-modal="true"]';
    const MAX = 1000;

    const caminho = el => {
        if (!el || el.nodeType !== 1) return String(el);
        let p = el.tagName.toLowerCase();
        if (el.id) p += '#' + el.id;
        const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
        if (cls.length) p += '.' + cls.join('.');
        const nome = el.getAttribute('name') || el.getAttribute('aria-label');
        if (nome) p += '[' + nome + ']';
        const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
        if (txt) p += ' "' + txt + '"';
        return p;
    };
    const registrar = (tipo, el, extra) => {
        if (window.__uxLog.length >= MAX) window.__uxLog.shift();
        window.__uxLog.push(Object.assign({ t: Date.now(), tipo, el: caminho(el) }, extra || {}));
    };
    const ehCarregando = n => n.nodeType === 1 && CARREGANDO.test((n.getAttribute('class') || '') + ' ' + n.tagName + ' ' + (n.getAttribute('aria-busy') === 'true' ? 'busy' : ''));
    const ehMensagem = n => n.nodeType === 1 && (/toast|snack|alert|notif|error|message/i.test(String(n.className || '')) ||
        /^(alert|alertdialog|status|dialog)$/.test(n.getAttribute('role') || ''));

    window.__uxLog = [];
    if (window.__uxObs) window.__uxObs.disconnect();
    if (window.__uxFoco) document.removeEventListener('focusin', window.__uxFoco, true);

    window.__uxObs = new MutationObserver(muts => muts.forEach(m => {
        if (m.type === 'attributes') {
            const el = m.target;
            if (m.attributeName === 'disabled' && /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
                registrar(el.hasAttribute('disabled') ? 'desabilitou' : 'habilitou', el);
            } else if (m.attributeName === 'class' || m.attributeName === 'aria-busy') {
                const antes = CARREGANDO.test(m.oldValue || '');
                const agora = ehCarregando(el);
                if (antes !== agora) registrar(agora ? 'loading-on' : 'loading-off', el);
            }
            return;
        }
        m.addedNodes.forEach(n => {
            if (ehCarregando(n)) registrar('loading-on', n);
            if (ehMensagem(n)) registrar('mensagem', n, { txt: (n.innerText || '').trim().slice(0, 150) });
        });
        m.removedNodes.forEach(n => { if (ehCarregando(n)) registrar('loading-off', n); });
    }));
    window.__uxObs.observe(document.body, { subtree: true, childList: true, attributes: true,
        attributeFilter: ['disabled', 'class', 'aria-busy'], attributeOldValue: true });

    // Caminho do foco: ordem do Tab, entrada no diálogo e para onde volta ao fechar.
    window.__uxFoco = e => registrar('foco', e.target, { dentroDeDialogo: !!(e.target.closest && e.target.closest(DIALOGO)) });
    document.addEventListener('focusin', window.__uxFoco, true);

    // Gravações, só se a qa-testar ainda não instrumentou a página.
    if (!window.__reqLog && !window.__uxReq) {
        window.__uxReq = [];
        const GRAVA = /^(POST|PUT|PATCH|DELETE)$/i;
        const open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (m, u) {
            if (GRAVA.test(m)) this.addEventListener('loadend', () => window.__uxReq.push({ t: Date.now(), m, u: String(u), s: this.status }));
            return open.apply(this, arguments);
        };
        const fetchOriginal = window.fetch;
        window.fetch = async function (...args) {
            const m = (args[1] && args[1].method) || (args[0] && args[0].method) || 'GET';
            const res = await fetchOriginal.apply(this, args);
            if (GRAVA.test(m)) window.__uxReq.push({ t: Date.now(), m, u: String(args[0] && args[0].url || args[0]), s: res.status });
            return res;
        };
    }

    window.__uxDuplicadas = (janelaMs = 2000) => {
        const ultima = {};
        const duplicadas = [];
        (window.__reqLog || window.__uxReq || []).filter(r => /^(POST|PUT|PATCH|DELETE)$/i.test(r.m)).forEach(r => {
            const chave = r.m.toUpperCase() + ' ' + r.u;
            if (ultima[chave] && r.t - ultima[chave].t < janelaMs) duplicadas.push({ m: r.m, u: r.u, s: r.s, intervaloMs: r.t - ultima[chave].t });
            ultima[chave] = r;
        });
        return duplicadas;
    };

    return { coletorUx: 'ativo', requisicoes: window.__reqLog ? '__reqLog (qa-testar)' : '__uxReq (próprio)', href: location.href };
})();
