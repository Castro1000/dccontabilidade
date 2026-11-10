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
const WHATS = '5592984565478';
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

// Ano no rodapé
document.getElementById('ano').textContent = new Date().getFullYear();

// Animação ao rolar
const alvos = document.querySelectorAll('.card, .dif, .publico li, .sobre-foto, .sobre-texto, .faq details, .form, .contato-info');
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
