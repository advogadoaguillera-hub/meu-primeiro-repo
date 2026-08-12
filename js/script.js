document.getElementById('year').textContent = new Date().getFullYear();

const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
menuToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
});

const WHATSAPP_NUMBER = '5567998325997';

document.getElementById('contactForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const mensagem = document.getElementById('mensagem').value.trim();

  const texto =
    `Olá, meu nome é ${nome}.\n` +
    `Telefone: ${telefone}\n` +
    `Mensagem: ${mensagem}`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank', 'noopener');
});
