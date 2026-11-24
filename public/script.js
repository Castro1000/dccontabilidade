// Header transparente no topo, sólido ao rolar
const topo = document.getElementById('topo');
function atualizarTopo() {
  topo.classList.toggle('topo-rolado', window.scrollY > 40);
}
window.addEventListener('scroll', atualizarTopo, { passive: true });
atualizarTopo();

// Menu mobile
const menuBtn = document.querySelector('.menu-btn');
const menu = document.getElementById('menu');

menuBtn.addEventListener('click', () => {
  const aberto = menu.classList.toggle('aberto');
  menuBtn.setAttribute('aria-expanded', aberto);
});
menu.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => {
    menu.classList.remove('aberto');
    menuBtn.setAttribute('aria-expanded', 'false');
  })
);

// Formulário -> WhatsApp
const WHATS = '5592988226908';
const form = document.getElementById('form-whats');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = form.nome.value.trim();
  if (!nome) {
    form.nome.classList.add('erro');
    form.nome.focus();
    return;
  }
  form.nome.classList.remove('erro');

  const linhas = [
    'Olá! Vim pelo site da DC Contabilidade.',
    `*Nome:* ${nome}`,
    form.cidade.value.trim() && `*Cidade:* ${form.cidade.value.trim()}`,
    form.servico.value && `*Serviço:* ${form.servico.value}`,
    form.mensagem.value.trim() && `*Mensagem:* ${form.mensagem.value.trim()}`,
  ].filter(Boolean);

  window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank', 'noopener');
});

// CEP preenche a cidade (ViaCEP; BrasilAPI como reserva)
const campoCEP = form.elements.cep;
const msgCEP = document.getElementById('cep-msg');
let cepConsultado = '';
async function buscarCEP(cep) {
  const fontes = [
    async () => { const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`); const d = await r.json(); return d && !d.erro && d.localidade ? `${d.localidade} – ${d.uf}` : null; },
    async () => { const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`); if (!r.ok) return null; const d = await r.json(); return d.city ? `${d.city} – ${d.state}` : null; },
  ];
  for (const f of fontes) {
    try { const cidade = await f(); if (cidade) return cidade; } catch { /* tenta a próxima */ }
  }
  return null;
}
if (campoCEP) {
  campoCEP.addEventListener('input', async () => {
    const n = campoCEP.value.replace(/\D/g, '').slice(0, 8);
    campoCEP.value = n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
    msgCEP.textContent = '';
    if (n.length !== 8 || n === cepConsultado) return;
    cepConsultado = n;
    msgCEP.textContent = 'Buscando cidade…';
    const cidade = await buscarCEP(n);
    if (campoCEP.value.replace(/\D/g, '') !== n) return; // CEP mudou enquanto buscava
    if (cidade) { form.elements.cidade.value = cidade; msgCEP.textContent = ''; }
    else { msgCEP.textContent = 'CEP não encontrado. Digite a cidade, por favor.'; cepConsultado = ''; }
  });
}

// Ano no rodapé
document.getElementById('ano').textContent = new Date().getFullYear();

// Barra de progresso de rolagem
const barraProgresso = document.getElementById('progresso-barra');
let progressoPendente = false;
function atualizarProgresso() {
  const alturaTotal = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progresso = alturaTotal > 0 ? (window.scrollY / alturaTotal) * 100 : 0;
  barraProgresso.style.width = progresso + '%';
  progressoPendente = false;
}
window.addEventListener('scroll', () => {
  if (!progressoPendente) {
    progressoPendente = true;
    requestAnimationFrame(atualizarProgresso);
  }
}, { passive: true });
atualizarProgresso();

// Contadores animados
const contadores = document.querySelectorAll('.numero');
if (contadores.length && 'IntersectionObserver' in window) {
  const obsContador = new IntersectionObserver((entradas) => {
    entradas.forEach(ent => {
      if (!ent.isIntersecting) return;
      const el = ent.target;
      const alvo = parseInt(el.dataset.alvo, 10);
      const duracao = 1400;
      const inicio = performance.now();
      (function passo(agora) {
        const progresso = Math.min((agora - inicio) / duracao, 1);
        el.textContent = Math.floor(progresso * alvo);
        if (progresso < 1) requestAnimationFrame(passo);
        else el.textContent = alvo;
      })(inicio);
      obsContador.unobserve(el);
    });
  }, { threshold: 0.4 });
  // O HTML já traz o número final; só zeramos aqui, quando a animação vai rodar
  const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!semAnimacao) contadores.forEach(el => { el.textContent = '0'; obsContador.observe(el); });
}

// Animação ao rolar
const alvos = document.querySelectorAll('.card, .passo, .dif, .ferramenta, .sobre-foto, .sobre-texto, .faq details, .form, .contato-info');
if ('IntersectionObserver' in window) {
  alvos.forEach(el => el.classList.add('revelar'));
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach(ent => {
      if (ent.isIntersecting) {
        ent.target.classList.add('visivel');
        obs.unobserve(ent.target);
      }
    });
  }, { threshold: 0.12 });
  alvos.forEach(el => obs.observe(el));
}
