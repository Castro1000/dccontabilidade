// Ferramentas grátis: consulta de CNPJ e calendário de prazos fiscais.
// Dados públicos da Receita via APIs gratuitas (Minha Receita, CNPJá, CNPJ.ws, BrasilAPI).
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
    if (d.opcao_pelo_simples === false) return 'Não optante pelo Simples Nacional';
    return 'Não informado pela Receita';
  }

  const titulo = (s) => (s || '').toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());

  // Motivo da situação cadastral. A Minha Receita/BrasilAPI mandam em maiúsculas e sem acento
  // ("OMISSAO DE DECLARACOES"); aqui só recolocamos os acentos para exibir.
  const ACENTOS = {
    omissao: 'omissão', declaracoes: 'declarações', extincao: 'extinção', liquidacao: 'liquidação', voluntaria: 'voluntária',
    incorporacao: 'incorporação', fusao: 'fusão', cisao: 'cisão', falencia: 'falência', inexistencia: 'inexistência',
    obito: 'óbito', nao: 'não', orgao: 'órgão', inaptidao: 'inaptidão', oficio: 'ofício', pratica: 'prática',
    comercio: 'comércio', inicio: 'início', unico: 'único', tributario: 'tributário', socios: 'sócios', socio: 'sócio', mei: 'MEI', cnpj: 'CNPJ',
  };
  function textoMotivo(d) {
    const m = (d.descricao_motivo_situacao_cadastral || '').trim();
    if (!m || /^sem motivo$/i.test(m)) return null;
    const t = /[a-zà-ú]/.test(m)
      ? m.toLowerCase()
      : m.toLowerCase().split(/\s+/).map((w) => ACENTOS[w] || w.replace(/cao$/, 'ção').replace(/coes$/, 'ções').replace(/sao$/, 'são').replace(/dao$/, 'dão').replace(/encia$/, 'ência')).join(' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  const hojeISO = () => new Date().toISOString().slice(0, 10);

  // Histórico de entrada/saída do Simples e do MEI. Só mostra o que a fonte informou com clareza.
  function historico(atual, entrou, saiu, textos) {
    if (atual === true && entrou) return `${textos.desde} ${dataBR(entrou)}`;
    if (saiu && saiu > hojeISO()) return `${textos.sai} ${dataBR(saiu)}`;
    if (saiu) return `${textos.saiu} ${dataBR(saiu)}` + (entrou && entrou < saiu ? ` (entrou em ${dataBR(entrou)})` : '');
    return null;
  }

  function mostrarCNPJ(alvo, d) {
    alvo.replaceChildren();
    const situacao = (d.descricao_situacao_cadastral || 'DESCONHECIDA').toUpperCase();
    const ativa = situacao === 'ATIVA';
    const motivo = ativa ? null : textoMotivo(d);

    const topo = el('div', 'cnpj-topo');
    topo.append(el('span', 'selo-situacao ' + (ativa ? 'selo-ok' : 'selo-alerta'), situacao));
    if (motivo) topo.append(el('p', 'cnpj-motivo', `Motivo: ${motivo}`));
    topo.append(el('p', 'cnpj-nome', d.razao_social || '—'));
    if (d.nome_fantasia) topo.append(el('p', 'cnpj-fantasia', d.nome_fantasia));
    alvo.append(topo);

    const histSimples = historico(d.opcao_pelo_simples, d.data_opcao_pelo_simples, d.data_exclusao_do_simples,
      { desde: 'Optante desde', saiu: 'Saiu do Simples em', sai: 'Saída do Simples prevista para' });
    const histMEI = historico(d.opcao_pelo_mei, d.data_opcao_pelo_mei, d.data_exclusao_do_mei,
      { desde: 'MEI desde', saiu: 'Deixou de ser MEI em', sai: 'Saída do MEI prevista para' });
    const saiuDoSimples = ativa && d.opcao_pelo_simples !== true && d.data_exclusao_do_simples && d.data_exclusao_do_simples <= hojeISO();

    const dl = el('dl', 'cnpj-dados');
    const linha = (rotulo, valor) => { dl.append(el('dt', null, rotulo), el('dd', null, valor)); };
    linha('CNPJ', formatarCNPJ(d.cnpj || ''));
    linha('Abertura', dataBR(d.data_inicio_atividade) + idade(d.data_inicio_atividade));
    linha('Regime', regime(d));
    if (histSimples) linha('Simples Nacional', histSimples);
    if (histMEI) linha('MEI', histMEI);
    linha('Atividade', d.cnae_fiscal_descricao ? `${d.cnae_fiscal} – ${d.cnae_fiscal_descricao}` : '—');
    if (d.porte) linha('Porte', titulo(d.porte));
    if (d.municipio) linha('Cidade', `${titulo(d.municipio)} – ${d.uf || ''}`);
    if (!ativa && d.data_situacao_cadastral) linha('Situação desde', dataBR(d.data_situacao_cadastral));
    alvo.append(dl);

    const cta = el('div', 'cnpj-cta');
    const cnpjFmt = formatarCNPJ(d.cnpj || '');
    if (saiuDoSimples) {
      cta.append(el('p', null, `Esta empresa saiu do Simples Nacional em ${dataBR(d.data_exclusao_do_simples)}. Quer saber se vale a pena voltar? A DC avalia grátis.`));
      const a = el('a', 'btn btn-marrom btn-sm', 'Pedir uma análise grátis');
      a.href = linkWhats(`Olá! Consultei o CNPJ ${cnpjFmt} no site e vi que a empresa saiu do Simples Nacional em ${dataBR(d.data_exclusao_do_simples)}. Quero saber se vale a pena voltar.`);
      cta.append(a);
    } else if (ativa) {
      cta.append(el('p', null, 'Quer saber se está no regime certo e pagando só o necessário?'));
      const a = el('a', 'btn btn-marrom btn-sm', 'Pedir uma análise grátis');
      a.href = linkWhats(`Olá! Consultei o CNPJ ${cnpjFmt} no site e gostaria de uma análise da minha empresa.`);
      cta.append(a);
    } else if (situacao === 'BAIXADA') {
      // Empresa encerrada: não há o que regularizar — oferece abrir um novo negócio
      cta.append(el('p', null, 'Esta empresa foi encerrada. Vai abrir um novo negócio? A DC cuida da abertura.'));
      const a = el('a', 'btn btn-marrom btn-sm', 'Abrir minha empresa');
      a.href = linkWhats(`Olá! Consultei o CNPJ ${cnpjFmt} no site (empresa encerrada) e quero abrir uma nova empresa.`);
      cta.append(a);
    } else {
      cta.classList.add('cnpj-cta-alerta');
      const porque = motivo ? ` (${motivo.toLowerCase()})` : '';
      cta.append(el('p', null, `A empresa consta como ${situacao.toLowerCase()} na Receita${porque}. A DC pode ajudar a regularizar.`));
      const a = el('a', 'btn btn-ouro btn-sm', 'Quero regularizar');
      a.href = linkWhats(`Olá! Consultei o CNPJ ${cnpjFmt} no site e ele aparece como ${situacao}${porque}. Preciso regularizar.`);
      cta.append(a);
    }
    cta.querySelector('a').target = '_blank';
    cta.querySelector('a').rel = 'noopener';
    alvo.append(cta);
  }

  // Fontes gratuitas com dados públicos da Receita. Se uma estiver fora ou limitando, tenta a próxima.
  // Cada uma é convertida para o mesmo formato (o da Minha Receita / BrasilAPI).
  const sitMaiuscula = (s) => (s ? String(s).toUpperCase() : null);
  const simNao = (v) => (v == null ? null : v === true || String(v).toLowerCase() === 'sim');
  const FONTES_CNPJ = [
    { url: (c) => `https://minhareceita.org/${c}`, converter: (d) => d },
    {
      url: (c) => `https://open.cnpja.com/office/${c}`,
      converter: (d) => ({
        cnpj: d.taxId,
        razao_social: d.company && d.company.name,
        nome_fantasia: d.alias,
        descricao_situacao_cadastral: sitMaiuscula(d.status && d.status.text),
        data_situacao_cadastral: d.statusDate,
        data_inicio_atividade: d.founded,
        cnae_fiscal: d.mainActivity && d.mainActivity.id,
        cnae_fiscal_descricao: d.mainActivity && d.mainActivity.text,
        descricao_motivo_situacao_cadastral: d.reason && d.reason.text,
        opcao_pelo_mei: d.company && d.company.simei ? d.company.simei.optant : null,
        opcao_pelo_simples: d.company && d.company.simples ? d.company.simples.optant : null,
        // plano grátis do CNPJá não traz o histórico; só a data de entrada de quem é optante hoje
        data_opcao_pelo_mei: d.company && d.company.simei && d.company.simei.optant ? d.company.simei.since : null,
        data_opcao_pelo_simples: d.company && d.company.simples && d.company.simples.optant ? d.company.simples.since : null,
        porte: d.company && d.company.size && d.company.size.text,
        municipio: d.address && d.address.city,
        uf: d.address && d.address.state,
      }),
    },
    {
      url: (c) => `https://publica.cnpj.ws/cnpj/${c}`,
      converter: (d) => {
        const e = d.estabelecimento || {};
        const at = e.atividade_principal || {};
        return {
          cnpj: e.cnpj,
          razao_social: d.razao_social,
          nome_fantasia: e.nome_fantasia,
          descricao_situacao_cadastral: sitMaiuscula(e.situacao_cadastral),
          data_situacao_cadastral: e.data_situacao_cadastral,
          data_inicio_atividade: e.data_inicio_atividade,
          cnae_fiscal: at.id,
          cnae_fiscal_descricao: at.descricao,
          descricao_motivo_situacao_cadastral: e.motivo_situacao_cadastral && e.motivo_situacao_cadastral.descricao,
          opcao_pelo_mei: d.simples ? simNao(d.simples.mei) : null,
          opcao_pelo_simples: d.simples ? simNao(d.simples.simples) : null,
          data_opcao_pelo_mei: d.simples && d.simples.data_opcao_mei,
          data_exclusao_do_mei: d.simples && d.simples.data_exclusao_mei,
          data_opcao_pelo_simples: d.simples && d.simples.data_opcao_simples,
          data_exclusao_do_simples: d.simples && d.simples.data_exclusao_simples,
          porte: d.porte && d.porte.descricao,
          municipio: e.cidade && e.cidade.nome,
          uf: e.estado && e.estado.sigla,
        };
      },
    },
    { url: (c) => `${API}/cnpj/v1/${c}`, converter: (d) => d },
  ];

  async function consultarCNPJ(cnpj) {
    let naoEncontrado = false;
    for (const fonte of FONTES_CNPJ) {
      try {
        const r = await buscarJSON(fonte.url(cnpj), 8000);
        if (r.ok && r.corpo) {
          const dados = fonte.converter(r.corpo);
          if (dados && dados.razao_social) return { dados };
        }
        if (r.status === 404 || r.status === 400) naoEncontrado = true;
      } catch { /* tenta a próxima fonte */ }
    }
    if (naoEncontrado) return { dados: null };
    throw new Error('fontes indisponíveis');
  }

  // Sem resultado: nunca deixa o visitante sem saída — leva para o WhatsApp da DC
  function semResposta(alvo, cnpj, texto) {
    alvo.replaceChildren();
    const box = el('div', 'cnpj-cta cnpj-cta-alerta');
    box.append(el('p', null, texto + ' A DC consulta para você e já explica a situação da empresa.'));
    const a = el('a', 'btn btn-marrom btn-sm', 'Consultar com a DC pelo WhatsApp');
    a.href = linkWhats(`Olá! Tentei consultar o CNPJ ${formatarCNPJ(cnpj)} no site. Podem verificar a situação para mim?`);
    a.target = '_blank';
    a.rel = 'noopener';
    box.append(a);
    alvo.append(box);
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
        const r = await consultarCNPJ(cnpj);
        if (r.dados) mostrarCNPJ(res, r.dados);
        else semResposta(res, cnpj, 'Não conseguimos localizar esse CNPJ agora.');
      } catch {
        semResposta(res, cnpj, 'A consulta da Receita está instável agora.');
      } finally {
        botao.disabled = false;
        botao.textContent = 'Consultar';
      }
    });
  }

  /* ================= VALORES 2026 (atualizar todo ano) ================= */
  // Salário mínimo 2026: R$ 1.621. DAS MEI = 5% do mínimo (INSS) + R$ 1 ICMS e/ou R$ 5 ISS.
  // MEI Transportador Autônomo de Cargas: 12% do mínimo e limite de R$ 251.600/ano.
  const ANO_VALORES = 2026; // em janeiro: atualizar os valores abaixo e este ano
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
      const valoresAtuais = new Date().getFullYear() === ANO_VALORES;
      if (cabe && !valoresAtuais) {
        // valores do ano desatualizados: não mostra número, a DC informa
        mei.classList.add('sim-personalizado');
        mei.append(el('strong', 'sim-valor', 'Consulte o valor atual'));
        mei.append(el('small', null, 'O DAS do MEI é reajustado todo ano com o salário mínimo'));
      } else if (cabe) {
        mei.append(el('strong', 'sim-valor', reais(dasMEI(ativ === 'servicos' || ativ === 'comercio_servicos', ativ !== 'servicos', false)) + '/mês'));
        mei.append(el('small', null, anual > LIMITE_MEI * 0.9
          ? '⚠ Perto do limite de R$ 81 mil/ano'
          : `Valor fixo do DAS em ${ANO_VALORES}, se sua atividade for permitida no MEI`));
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

  // Feriados móveis nacionais (Carnaval, Sexta-feira Santa, Corpus Christi), pelo cálculo da Páscoa
  function moveis(ano) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1, dia = ((h + l - 7 * m + 114) % 31) + 1;
    return [-48, -47, -2, 60].map((n) => chave(new Date(ano, mes, dia + n)));
  }

  const chave = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ehUtil = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !feriados.has(chave(d)) &&
    !(!anosCarregados.has(d.getFullYear()) && (FIXOS.includes(chave(d).slice(5)) || moveis(d.getFullYear()).includes(chave(d))));

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
