// Instrumentação da página para o ciclo "QA executa, IA mede". Roda no navegador, não no Node:
// o Claude injeta este arquivo pela ferramenta de executar JavaScript do navegador que ele controla.
// Idempotente: reinjetar não duplica o interceptor. Reinjetar depois de todo F5 (o recarregamento apaga tudo).
//
// Cria:
//   window.__reqLog  verbo, endereço, corpo (até 600 caracteres), status, resposta de erro e t (ms)
//                    de toda chamada que casa com FILTRO_API, por XHR e por fetch;
//   window.__msgLog  toasts, diálogos, alertas e mensagens de erro de campo que aparecerem, com t no
//                    mesmo relógio do __reqLog (para ordenar mensagem x requisição).
// Corpo de chamada de autenticação nunca é guardado: tem usuário e senha.
// Depois de mudar este arquivo, dar F5 e reinjetar: o interceptor já instalado continua o antigo.
(() => {
    const FILTRO_API = /\/api\//;                              // ajuste ao padrão de rota do seu backend
    const AUTENTICACAO = /\/(auth|login|token|session)\b/i;
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const corpo = (u, b) => AUTENTICACAO.test(u || '') ? '[omitido: autenticação]'
        : typeof b === 'string' ? b.slice(0, 600) : null;
    const semOrigem = u => (u || '').replace(/^https?:\/\/[^/]+/, '');

    if (!window.__reqLog) {
        window.__reqLog = [];
        const open = XMLHttpRequest.prototype.open;
        const send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (m, u) {
            this.__m = m; this.__u = String(u);
            return open.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function (b) {
            this.addEventListener('loadend', () => {
                if (FILTRO_API.test(this.__u || ''))
                    window.__reqLog.push({
                        t: Date.now(), m: this.__m, u: semOrigem(this.__u), s: this.status,
                        body: corpo(this.__u, b),
                        resp: this.status >= 400 ? (this.responseText || '').slice(0, 400) : null
                    });
            });
            return send.apply(this, arguments);
        };
        const fetchOriginal = window.fetch;
        window.fetch = async function (...args) {
            const res = await fetchOriginal.apply(this, args);
            try {
                const req = args[0];
                const u = (typeof req === 'string' ? req : (req && req.url)) || '';
                if (FILTRO_API.test(u)) {
                    const item = {
                        t: Date.now(),
                        m: (args[1] && args[1].method) || (req && typeof req === 'object' && req.method) || 'GET',
                        u: semOrigem(u), s: res.status,
                        body: corpo(u, args[1] && args[1].body), resp: null
                    };
                    window.__reqLog.push(item);
                    // resposta de erro lida de uma cópia, para não consumir a da página
                    if (res.status >= 400) res.clone().text().then(t => { item.resp = (t || '').slice(0, 400); }).catch(() => {});
                }
            } catch (e) { /* nunca atrapalhar a página */ }
            return res;
        };
    }

    window.__msgLog = [];
    if (window.__msgObs) window.__msgObs.disconnect();
    window.__msgObs = new MutationObserver(muts => muts.forEach(mut => [...mut.addedNodes].forEach(n => {
        if (n.nodeType !== 1) return;
        const txt = norm(n.innerText || n.textContent);
        if (!txt || txt.length > 300) return;
        const cls = String(n.className || '');
        const papel = n.getAttribute('role') || '';
        const ehMensagem = /toast|snack|dialog|modal|alert|error|message|notif/i.test(cls + ' ' + n.tagName) ||
            /^(alert|alertdialog|dialog|status)$/.test(papel);
        const pareceMensagem = /não foi possível|erro|falha|sucesso|obrigat|inválid/i.test(txt);
        if (ehMensagem || pareceMensagem)
            window.__msgLog.push({ t: Date.now(), hora: new Date().toLocaleTimeString(), tag: n.tagName.toLowerCase(),
                cls: cls.slice(0, 120), papel, txt: txt.slice(0, 150) });
    })));
    window.__msgObs.observe(document.body, { childList: true, subtree: true });

    return { interceptor: 'ativo', observadorDeMensagens: 'ativo', requisicoesJaRegistradas: window.__reqLog.length, href: location.href };
})();
