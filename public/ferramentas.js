// Ferramentas grátis: consulta de CNPJ e calendário de prazos fiscais.
// Dados via BrasilAPI (https://brasilapi.com.br) — gratuita, sem chave.
// Nada é carregado até o visitante usar/chegar na seção (rede fraca no interior).
(function () {
  const API = 'https://brasilapi.com.br/api';
  const WHATS_DC = '5592988226908';

  const linkWhats = (texto) => `https://wa.me/${WHATS_DC}?text=${encodeURIComponent(texto)}`;

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  async function buscarJSON(url, ms = 15000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      const corpo = await r.json().catch(() => null);
      return { ok: r.ok, status: r.status, corpo };
    } finally {
      clearTimeout(t);
    }
  }

  /* ================= CONSULTA DE CNPJ ================= */

  // Aceita o CNPJ numérico e o novo alfanumérico (Receita, a partir de jul/2026)
  const limparCNPJ = (v) => v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);

  function formatarCNPJ(c) {
    return c
      .replace(/^(.{2})(.)/, '$1.$2')
      .replace(/^(.{2})\.(.{3})(.)/, '$1.$2.$3')
      .replace(/^(.{2})\.(.{3})\.(.{3})(.)/, '$1.$2.$3/$4')
      .replace(/^(.{2})\.(.{3})\.(.{3})\/(.{4})(.)/, '$1.$2.$3/$4-$5');
  }

  function cnpjValido(c) {
    if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1+$/.test(c)) return false;
    const val = (ch) => ch.charCodeAt(0) - 48;
    const dv = (base, pesos) => {
      const soma = pesos.reduce((s, p, i) => s + val(base[i]) * p, 0);
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    const d1 = dv(c, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = dv(c, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === +c[12] && d2 === +c[13];
  }

  function dataBR(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  function idade(iso) {
    if (!iso) return '';
    const anos = Math.floor((Date.now() - new Date(iso + 'T12:00:00')) / (365.25 * 864e5));
    if (anos < 1) return ' (menos de 1 ano)';
    return anos === 1 ? ' (1 ano)' : ` (${anos} anos)`;
  }

  function regime(d) {
    if (d.opcao_pelo_mei === true) return 'MEI (Simples Nacional)';
    if (d.opcao_pelo_simples === true) return 'Simples Nacional';
    if (d.opcao_pelo_simples === false) return 'Fora do Simples (Lucro Presumido ou Real)';
    return 'Não informado pela Receita';
  }

  const titulo = (s) => (s || '').toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

  function mostrarCNPJ(alvo, d) {
    alvo.replaceChildren();
    const situacao = (d.descricao_situacao_cadastral || 'DESCONHECIDA').toUpperCase();
    const ativa = situacao === 'ATIVA';

    const topo = el('div', 'cnpj-topo');
    topo.append(el('span', 'selo-situacao ' + (ativa ? 'selo-ok' : 'selo-alerta'), situacao));
    topo.append(el('p', 'cnpj-nome', d.razao_social || '—'));
    if (d.nome_fantasia) topo.append(el('p', 'cnpj-fantasia', d.nome_fantasia));
    alvo.append(topo);

    const dl = el('dl', 'cnpj-dados');
    const linha = (rotulo, valor) => { dl.append(el('dt', null, rotulo), el('dd', null, valor)); };
    linha('CNPJ', formatarCNPJ(d.cnpj || ''));
    linha('Abertura', dataBR(d.data_inicio_atividade) + idade(d.data_inicio_atividade));
    linha('Regime', regime(d));
    linha('Atividade', d.cnae_fiscal_descricao ? `${d.cnae_fiscal} – ${d.cnae_fiscal_descricao}` : '—');
    if (d.porte) linha('Porte', titulo(d.porte));
    if (d.municipio) linha('Cidade', `${titulo(d.municipio)} – ${d.uf || ''}`);
    if (!ativa && d.data_situacao_cadastral) linha('Situação desde', dataBR(d.data_situacao_cadastral));
    alvo.append(dl);

    const cta = el('div', 'cnpj-cta');
    const cnpjFmt = formatarCNPJ(d.cnpj || '');
    if (ativa) {
      cta.append(el('p', null, 'Quer saber se está no regime certo e pagando só o necessário?'));
      const a = el('a', 'btn btn-marrom btn-sm', 'Pedir uma análise grátis');
      a.href = linkWhats(`Olá! Consultei o CNPJ ${cnpjFmt} no site e gostaria de uma análise da minha empresa.`);
      cta.append(a);
    } else {
      cta.classList.add('cnpj-cta-alerta');
      cta.append(el('p', null, `A empresa consta como ${situacao.toLowerCase()} na Receita. A DC pode ajudar a regularizar.`));
      const a = el('a', 'btn btn-ouro btn-sm', 'Quero regularizar');
      a.href = linkWhats(`Olá! Consultei o CNPJ ${cnpjFmt} no site e ele aparece como ${situacao}. Preciso regularizar.`);
      cta.append(a);
    }
    cta.querySelector('a').target = '_blank';
    cta.querySelector('a').rel = 'noopener';
    alvo.append(cta);
  }

  const formCNPJ = document.getElementById('form-cnpj');
  if (formCNPJ) {
    const campo = formCNPJ.querySelector('input');
    const botao = formCNPJ.querySelector('button');
    const msg = document.getElementById('cnpj-msg');
    const res = document.getElementById('cnpj-resultado');

    campo.addEventListener('input', () => {
      campo.value = formatarCNPJ(limparCNPJ(campo.value));
      campo.classList.remove('erro');
      msg.textContent = '';
    });

    formCNPJ.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cnpj = limparCNPJ(campo.value);
      if (!cnpjValido(cnpj)) {
        campo.classList.add('erro');
        msg.textContent = 'CNPJ inválido. Confira os 14 caracteres.';
        campo.focus();
        return;
      }
      botao.disabled = true;
      botao.textContent = 'Consultando…';
      msg.textContent = '';
      res.replaceChildren();
      try {
        const r = await buscarJSON(`${API}/cnpj/v1/${cnpj}`);
        if (r.ok && r.corpo) {
          mostrarCNPJ(res, r.corpo);
        } else if (r.status === 404 || r.status === 400) {
          msg.textContent = 'CNPJ não encontrado na base da Receita.';
        } else {
          throw new Error('indisponível');
        }
      } catch {
        msg.textContent = 'A consulta está lenta ou fora do ar agora. Tente de novo em instantes ou fale com a gente no WhatsApp.';
      } finally {
        botao.disabled = false;
        botao.textContent = 'Consultar';
      }
    });
  }

  /* ================= VALORES 2026 (atualizar todo ano) ================= */
  // Salário mínimo 2026: R$ 1.621. DAS MEI = 5% do mínimo (INSS) + R$ 1 ICMS e/ou R$ 5 ISS.
  // MEI Transportador Autônomo de Cargas: 12% do mínimo e limite de R$ 251.600/ano.
  const SALARIO_MINIMO = 1621;
  const LIMITE_MEI = 81000;
  const LIMITE_MEI_CAMINHONEIRO = 251600;
  const LIMITE_SIMPLES = 4800000;

  const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function dasMEI(iss, icms, caminhoneiro) {
    return SALARIO_MINIMO * (caminhoneiro ? 0.12 : 0.05) + (icms ? 1 : 0) + (iss ? 5 : 0);
  }

  /* ================= SIMULADOR MEI x SIMPLES ================= */

  const formSim = document.getElementById('form-simulador');
  if (formSim) {
    const campoFat = formSim.querySelector('[name="faturamento"]');
    const campoAtiv = formSim.querySelector('[name="atividade"]');
    const saida = document.getElementById('simulador-resultado');

    const calcular = () => {
      const mensal = parseInt(campoFat.value.replace(/\D/g, ''), 10) || 0;
      const ativ = campoAtiv.value;
      saida.replaceChildren();
      if (!mensal) return;
      const anual = mensal * 12;

      const blocos = el('div', 'sim-blocos');
      const cabe = anual <= LIMITE_MEI;

      // MEI — só valores oficiais (DAS fixo de 2026 e limite anual)
      const mei = el('div', 'sim-bloco');
      mei.append(el('span', 'sim-rotulo', 'MEI'));
      if (cabe) {
        mei.append(el('strong', 'sim-valor', reais(dasMEI(ativ === 'servicos' || ativ === 'comercio_servicos', ativ !== 'servicos', false)) + '/mês'));
        mei.append(el('small', null, anual > LIMITE_MEI * 0.9
          ? '⚠ Perto do limite de R$ 81 mil/ano'
          : 'Valor fixo do DAS em 2026, se sua atividade for permitida no MEI'));
      } else {
        mei.classList.add('sim-fora');
        mei.append(el('strong', 'sim-valor', 'Acima do limite'));
        mei.append(el('small', null, `${reais(anual)}/ano passa do limite de R$ 81 mil do MEI`));
      }

      // Simples / outros regimes — o valor depende do enquadramento: a DC calcula
      const sn = el('div', 'sim-bloco sim-personalizado');
      sn.append(el('span', 'sim-rotulo', anual <= LIMITE_SIMPLES ? 'Simples Nacional' : 'Lucro Presumido ou Real'));
      sn.append(el('strong', 'sim-valor', 'Cálculo personalizado'));
      sn.append(el('small', null, 'O imposto depende do enquadramento da sua atividade'));
      blocos.append(mei, sn);
      saida.append(blocos);

      const nomeAtiv = campoAtiv.options[campoAtiv.selectedIndex].text.toLowerCase();
      const cta = el('div', 'sim-destaque');
      cta.append(el('p', null, cabe
        ? 'Confirme com a DC se sua atividade pode ser MEI e compare com o Simples Nacional. É grátis.'
        : 'A DC calcula quanto você pagaria e qual regime sai mais barato para o seu negócio. É grátis.'));
      const a = el('a', 'btn btn-ouro btn-sm', 'Receber o cálculo exato');
      a.href = linkWhats(`Olá! Fiz a simulação no site: faturamento de ${reais(mensal)}/mês, atividade de ${nomeAtiv}. Quero o cálculo exato do meu imposto.`);
      a.target = '_blank';
      a.rel = 'noopener';
      cta.append(a);
      saida.append(cta);
    };

    campoFat.addEventListener('input', () => {
      const n = campoFat.value.replace(/\D/g, '').slice(0, 9);
      campoFat.value = n ? parseInt(n, 10).toLocaleString('pt-BR') : '';
      calcular();
    });
    campoAtiv.addEventListener('change', calcular);
    formSim.addEventListener('submit', (e) => { e.preventDefault(); calcular(); });
  }

  /* ================= CALENDÁRIO DE PRAZOS ================= */

  const lista = document.getElementById('prazos-lista');
  if (!lista) return;

  // Feriados nacionais fixos — usados até a BrasilAPI responder (ou se ela falhar)
  const FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];
  const feriados = new Set();
  const anosCarregados = new Set();

  const chave = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ehUtil = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !feriados.has(chave(d)) &&
    !(!anosCarregados.has(d.getFullYear()) && FIXOS.includes(chave(d).slice(5)));

  function ajustar(d, modo) {
    const n = new Date(d);
    if (modo === 'nenhum') return n;
    const passo = modo === 'prorroga' ? 1 : -1;
    while (!ehUtil(n)) n.setDate(n.getDate() + passo);
    return n;
  }

  function ultimoDiaUtil(ano, mes) {
    return ajustar(new Date(ano, mes + 1, 0), 'antecipa');
  }

  // Regras de vencimento (referência geral; casos específicos variam)
  function obrigacoes(ano, mes) {
    const o = [
      { data: ajustar(new Date(ano, mes, 20), 'prorroga'), nome: 'DAS – MEI e Simples Nacional', quem: 'MEI e empresas do Simples' },
      { data: ajustar(new Date(ano, mes, 20), 'antecipa'), nome: 'FGTS e INSS da folha', quem: 'Quem tem funcionários' },
    ];
    if (mes === 2) o.push({ data: new Date(ano, 2, 31), nome: 'DEFIS (declaração anual do Simples)', quem: 'Empresas do Simples' });
    if (mes === 4) {
      o.push({ data: new Date(ano, 4, 31), nome: 'DASN-SIMEI (declaração anual do MEI)', quem: 'MEI' });
      o.push({ data: ultimoDiaUtil(ano, 4), nome: 'Imposto de Renda Pessoa Física', quem: 'Pessoa física · data prevista' });
    }
    if (mes === 10) o.push({ data: ajustar(new Date(ano, 10, 30), 'antecipa'), nome: '13º salário – 1ª parcela', quem: 'Quem tem funcionários' });
    if (mes === 11) o.push({ data: ajustar(new Date(ano, 11, 20), 'antecipa'), nome: '13º salário – 2ª parcela', quem: 'Quem tem funcionários' });
    return o;
  }

  function hoje() {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), h.getDate());
  }

  function proximos(qtd = 6) {
    const h = hoje();
    const todas = [];
    for (let i = 0; i < 14; i++) {
      const ref = new Date(h.getFullYear(), h.getMonth() + i, 1);
      todas.push(...obrigacoes(ref.getFullYear(), ref.getMonth()));
    }
    return todas.filter((o) => o.data >= h).sort((a, b) => a.data - b.data).slice(0, qtd);
  }

  function falta(data) {
    const dias = Math.round((data - hoje()) / 864e5);
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Amanhã';
    return `Em ${dias} dias`;
  }

  function desenharPrazos() {
    lista.replaceChildren();
    proximos().forEach((o) => {
      const dias = Math.round((o.data - hoje()) / 864e5);
      const li = el('li', 'prazo' + (dias <= 7 ? ' urgente' : ''));
      const data = el('time', 'prazo-data');
      data.dateTime = chave(o.data);
      data.append(
        el('span', 'prazo-dia', String(o.data.getDate()).padStart(2, '0')),
        el('span', 'prazo-mes', o.data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))
      );
      const info = el('div', 'prazo-info');
      info.append(el('strong', null, o.nome), el('small', null, o.quem));
      li.append(data, info, el('span', 'prazo-falta', falta(o.data)));
      lista.append(li);
    });
  }

  async function carregarFeriados(ano) {
    const k = 'dc-feriados-' + ano;
    let datas = null;
    try { datas = JSON.parse(localStorage.getItem(k)); } catch {}
    if (!Array.isArray(datas)) {
      const r = await buscarJSON(`${API}/feriados/v1/${ano}`, 10000);
      if (!r.ok || !Array.isArray(r.corpo)) throw new Error('feriados');
      datas = r.corpo.map((f) => f.date);
      try { localStorage.setItem(k, JSON.stringify(datas)); } catch {}
    }
    datas.forEach((d) => feriados.add(d));
    anosCarregados.add(ano);
  }

  desenharPrazos(); // já mostra com os feriados fixos

  function iniciar() {
    const a = hoje().getFullYear();
    Promise.allSettled([carregarFeriados(a), carregarFeriados(a + 1)]).then(desenharPrazos);
  }

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((ent) => {
      if (ent.some((e) => e.isIntersecting)) { obs.disconnect(); iniciar(); }
    }, { rootMargin: '400px' });
    obs.observe(lista);
  } else {
    iniciar();
  }
})();
