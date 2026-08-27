// ==========================================================
// 1. SELEÇÃO DOS ELEMENTOS HTML
// Guardamos referências aos elementos do DOM que serão usados
// repetidamente, evitando buscar no DOM toda vez (melhor performance)
// ==========================================================
const inputTexto = document.querySelector('#input-texto');       // campo de texto do lembrete
const selectPrioridade = document.querySelector('#select-prioridade'); // select de prioridade
const inputVencimento = document.querySelector('#input-vencimento'); // data de vencimento do lembrete
const inputPreco = document.querySelector('#input-preco');       // preço opcional do lembrete
const totalPrecoEl = document.querySelector('#total-preco');     // bloco fixo com o total somado
const btnAdicionar = document.querySelector('#btn-adicionar');   // botão "Adicionar"
const listaLembretes = document.querySelector('#lista-lembretes'); // container onde os cards entram
const msgErro = document.querySelector('#msg-erro');             // elemento para exibir erros
const msgVazio = document.querySelector('#msg-vazio');           // mensagem quando o filtro não acha nada

// Elementos do bloco de filtros (ficam logo abaixo da caixa de adicionar)
const inputBusca = document.querySelector('#input-busca');           // barra de pesquisa por texto
const filtroStatus = document.querySelector('#filtro-status');       // filtro por status (pendente/concluído)
const filtroPrioridade = document.querySelector('#filtro-prioridade'); // filtro por prioridade
const filtroVencimento = document.querySelector('#filtro-vencimento'); // filtro por data de vencimento

const btnTema = document.querySelector('#btn-tema'); // botão de alternar modo claro/escuro

// Valor padrão da prioridade, usado para resetar o select depois de adicionar
const PRIORIDADE_PADRAO = 'baixa';

// Chave usada para guardar a lista no localStorage
const CHAVE_STORAGE = 'lembretes';

// ==========================================================
// 2. PERSISTÊNCIA (localStorage)
// Guardamos os lembretes como um array de objetos em vez de
// depender apenas do DOM, assim conseguimos salvar/recarregar
// facilmente em formato JSON.
// ==========================================================

// Lê o array de lembretes salvo no localStorage (ou retorna [] se não houver nada)
function carregarLembretesSalvos() {
  try {
    const dados = localStorage.getItem(CHAVE_STORAGE);
    // Se não existir nada salvo ainda, começamos com uma lista vazia
    if (!dados) return [];
    return JSON.parse(dados);
  } catch (erro) {
    // Caso o localStorage esteja bloqueado (ex: abrindo o arquivo direto
    // no navegador via file://) ou o conteúdo salvo esteja corrompido,
    // ignora o erro e começa com uma lista vazia em vez de travar o script
    console.error('Erro ao ler lembretes salvos:', erro);
    return [];
  }
}

// Salva o array de lembretes atual no localStorage como texto JSON
function salvarLembretes(lembretes) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lembretes));
  } catch (erro) {
    // Mesmo raciocínio: se o localStorage não estiver disponível,
    // não deixamos isso quebrar o restante da aplicação
    console.error('Erro ao salvar lembretes:', erro);
  }
}

// Array que mantém os lembretes em memória durante o uso da página
let lembretes = carregarLembretesSalvos();

// ==========================================================
// 3. FUNÇÃO PRINCIPAL: adiciona um novo lembrete à lista
// ==========================================================
function adicionarLembrete() {
  // Pega o texto digitado e remove espaços em branco no início/fim
  const texto = inputTexto.value.trim();
  // Pega a prioridade selecionada no <select>
  const prioridade = selectPrioridade.value;
  // Pega a data de vencimento escolhida (formato 'YYYY-MM-DD') ou '' se não preenchida
  const vencimento = inputVencimento.value;
  // Pega o preço digitado (aceita vírgula ou ponto) ou null se não preenchido
  const precoDigitado = inputPreco.value.trim();
  const preco = precoDigitado ? parseFloat(precoDigitado.replace(',', '.')) : null;

  // --- Validação ---
  // Se o campo estiver vazio, mostra erro e interrompe a função (return)
  if (texto === '') {
    msgErro.textContent = 'Por favor, digite a descrição do lembrete!';
    inputTexto.focus(); // devolve o foco pro campo, ajudando o usuário a corrigir
    return; // encerra a função aqui, não cria o card
  }

  // Se passou na validação, garante que a mensagem de erro anterior suma
  msgErro.textContent = '';

  // --- Cria o objeto do lembrete e guarda no array + localStorage ---
  const novoLembrete = {
    id: Date.now(), // id simples e único, baseado no timestamp
    texto,
    prioridade,
    concluido: false, // controla se o item já foi "conferido" (clicado)
    vencimento: vencimento || null, // data de vencimento (ou null se não informada)
    preco: preco !== null && !isNaN(preco) ? preco : null, // preço (ou null se não informado)
    dataCriacao: new Date().toISOString() // data/hora em que o item foi adicionado à lista
  };
  lembretes.push(novoLembrete);
  salvarLembretes(lembretes);

  // Confere se, com esse novo item, a lista passou a ter o grupo
  // especial completo (bolo + suco + carne + baralho)
  verificarGrupoEspecial();

  // --- Re-renderiza a lista já considerando os filtros ativos ---
  // (garante que o novo item só apareça de fato se ele passar nos filtros atuais)
  renderizarLista();

  // --- Reset do formulário ---
  // Limpa o campo de texto para o usuário poder digitar o próximo lembrete
  inputTexto.value = '';
  // Volta o select para a prioridade padrão
  selectPrioridade.value = PRIORIDADE_PADRAO;
  // Limpa a data de vencimento escolhida
  inputVencimento.value = '';
  // Limpa o preço digitado
  inputPreco.value = '';
  // Devolve o foco ao input, agilizando a digitação de vários lembretes seguidos
  inputTexto.focus();
}


// ==========================================================
// 4. CRIAÇÃO DO CARD (de forma segura, sem innerHTML)
// Construir os elementos "na mão" evita XSS: se usássemos innerHTML
// com o texto do usuário, alguém poderia digitar código HTML/JS malicioso
// ==========================================================
function criarCardLembrete(lembrete) {
  // "?? false"/"?? null" garante que lembretes salvos antes dessas funcionalidades
  // existirem (sem os campos "concluido"/"vencimento") também funcionem
  const { id, texto, prioridade, concluido = false, vencimento = null, preco = null } = lembrete;

  // Cria o elemento principal do card (div)
  const card = document.createElement('div');
  // Adiciona a classe base do card + a classe da prioridade (ex: "card-item alta")
  // Isso permite estilizar cada prioridade com uma cor diferente via CSS
  card.classList.add('card-item', prioridade);
  // Guarda o id do lembrete no próprio elemento, para localizá-lo depois
  card.dataset.id = id;

  // Div que agrupa o texto e a prioridade (conteúdo textual do card)
  const infoWrapper = document.createElement('div');
  // Deixa claro visualmente que essa área é clicável (vira "mãozinha" no hover)
  infoWrapper.classList.add('info-lembrete');

  // Parágrafo que vai conter o texto em negrito
  const paragrafo = document.createElement('p');
  const strong = document.createElement('strong');
  // textContent (em vez de innerHTML) insere o texto como TEXTO PURO,
  // não como HTML — por isso é seguro contra injeção de scripts
  strong.textContent = texto;
  paragrafo.appendChild(strong);

  // --- Emoji de "confere" (✅) ---
  // Mostra que o item foi marcado como conferido/concluído
  const emojiConfere = document.createElement('span');
  emojiConfere.classList.add('emoji-confere');
  emojiConfere.textContent = '✅';
  // Começa escondido a menos que o lembrete já esteja marcado como concluído
  emojiConfere.classList.toggle('oculto', !concluido);
  paragrafo.appendChild(emojiConfere);

  // Elemento pequeno mostrando a prioridade em maiúsculas
  const pequeno = document.createElement('small');
  pequeno.textContent = `Prioridade: ${prioridade.toUpperCase()}`;

  // Junta o parágrafo e o "small" dentro do wrapper de informações
  infoWrapper.append(paragrafo, pequeno);

  // --- Exibe a data de vencimento, se houver ---
  if (vencimento) {
    const pequenoVencimento = document.createElement('small');
    pequenoVencimento.classList.add('vencimento');
    // Formata 'YYYY-MM-DD' para 'DD/MM/YYYY', mais familiar no Brasil
    const [ano, mes, dia] = vencimento.split('-');
    pequenoVencimento.textContent = `Vencimento: ${dia}/${mes}/${ano}`;
    infoWrapper.appendChild(pequenoVencimento);
  }

  // --- Exibe o preço, se houver ---
  if (preco !== null && !isNaN(preco)) {
    const pequenoPreco = document.createElement('small');
    pequenoPreco.classList.add('preco-item');
    pequenoPreco.textContent = `Preço: ${formatarPreco(preco)}`;
    infoWrapper.appendChild(pequenoPreco);
  }

  // --- Clique no texto do lembrete alterna o emoji de "confere" ---
  // Fica só no infoWrapper (não no card inteiro) pra não conflitar
  // com o clique no botão "Excluir"
  infoWrapper.addEventListener('click', () => {
    // Acha o lembrete correspondente no array em memória
    const lembreteAtual = lembretes.find((item) => item.id === id);
    if (!lembreteAtual) return;
    // Inverte o estado de "concluido" (true vira false, false vira true)
    lembreteAtual.concluido = !lembreteAtual.concluido;
    // Persiste a mudança no localStorage
    salvarLembretes(lembretes);
    // Re-renderiza: se o filtro de status estiver ativo (ex: só "Pendentes"),
    // o item pode precisar sumir/aparecer de acordo com o novo estado
    renderizarLista();
  });

  // --- Botão de excluir ---
  const btnDeletar = document.createElement('button');
  btnDeletar.type = 'button'; // evita que o botão tente submeter algum form
  btnDeletar.classList.add('btn-deletar');
  btnDeletar.textContent = 'Excluir';
  // aria-label ajuda leitores de tela a saberem QUAL lembrete será excluído,
  // já que existem vários botões "Excluir" iguais na página
  btnDeletar.setAttribute('aria-label', `Excluir lembrete: ${texto}`);
  // Ao clicar, remove o card do DOM E do localStorage
  btnDeletar.addEventListener('click', () => {
    // Remove do array em memória o lembrete com esse id
    lembretes = lembretes.filter((item) => item.id !== id);
    // Atualiza o localStorage com a lista sem esse item
    salvarLembretes(lembretes);
    // Se a exclusão quebrou o grupo especial, isso já rearma o gatilho
    verificarGrupoEspecial();
    // Re-renderiza a lista (respeitando os filtros ativos)
    renderizarLista();
  });

  // Monta o card final: informações + botão de excluir
  card.append(infoWrapper, btnDeletar);

  // Retorna o card pronto para ser inserido na lista
  return card;
}

// ==========================================================
// 5. FILTROS: busca por texto, status, prioridade e vencimento
// A ideia é que os quatro filtros funcionem juntos (um item só
// aparece se passar em TODOS os filtros ativos ao mesmo tempo).
// ==========================================================

// Pega a data de hoje "zerada" (sem horas), para comparar só o dia/mês/ano
function obterHojeSemHoras() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

// Converte uma string 'YYYY-MM-DD' (vinda do <input type="date">) em objeto Date,
// já "zerada" nas horas, para comparações justas de dia
function converterVencimentoParaData(vencimento) {
  if (!vencimento) return null;
  const [ano, mes, dia] = vencimento.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

// Verifica se um lembrete passa no filtro de texto da barra de pesquisa.
// Compara pelo INÍCIO do texto (startsWith), então "FLOCOS" combina com "F", "FLO", etc.
function passaNoFiltroBusca(lembrete, termoBusca) {
  if (!termoBusca) return true; // busca vazia = não filtra nada
  return lembrete.texto.toLowerCase().startsWith(termoBusca.toLowerCase());
}

// Verifica se um lembrete passa no filtro de status (pendente/concluído)
function passaNoFiltroStatus(lembrete, status) {
  if (status === 'todos') return true;
  if (status === 'concluido') return lembrete.concluido;
  if (status === 'pendente') return !lembrete.concluido;
  return true;
}

// Verifica se um lembrete passa no filtro de prioridade
function passaNoFiltroPrioridade(lembrete, prioridade) {
  if (prioridade === 'todas') return true;
  return lembrete.prioridade === prioridade;
}

// Verifica se um lembrete passa no filtro de vencimento
function passaNoFiltroVencimento(lembrete, opcaoVencimento) {
  if (opcaoVencimento === 'todas') return true;

  // "Sem data": lembretes que não têm vencimento cadastrado
  if (opcaoVencimento === 'sem-data') return !lembrete.vencimento;

  // As demais opções exigem uma data de vencimento para comparar
  const dataVencimento = converterVencimentoParaData(lembrete.vencimento);
  if (!dataVencimento) return false;

  const hoje = obterHojeSemHoras();

  if (opcaoVencimento === 'atrasados') {
    return dataVencimento < hoje;
  }

  if (opcaoVencimento === 'hoje') {
    return dataVencimento.getTime() === hoje.getTime();
  }

  if (opcaoVencimento === 'semana') {
    const daquiSeteDias = new Date(hoje);
    daquiSeteDias.setDate(hoje.getDate() + 7);
    return dataVencimento >= hoje && dataVencimento <= daquiSeteDias;
  }

  return true;
}

// Aplica todos os filtros ativos (busca + status + prioridade + vencimento)
// sobre o array "lembretes" e devolve só os itens que passam em todos eles
function obterLembretesFiltrados() {
  const termoBusca = inputBusca.value.trim();
  const status = filtroStatus.value;
  const prioridade = filtroPrioridade.value;
  const opcaoVencimento = filtroVencimento.value;

  return lembretes.filter((lembrete) =>
    passaNoFiltroBusca(lembrete, termoBusca) &&
    passaNoFiltroStatus(lembrete, status) &&
    passaNoFiltroPrioridade(lembrete, prioridade) &&
    passaNoFiltroVencimento(lembrete, opcaoVencimento)
  );
}

// Formata um número como preço em reais (ex: 1234.5 -> "R$ 1.234,50")
function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Soma o preço de TODOS os lembretes cadastrados (ignora itens sem preço),
// independente dos filtros ativos, pra sempre mostrar o valor final real
function calcularTotalPreco() {
  return lembretes.reduce((soma, item) => soma + (item.preco || 0), 0);
}

// Atualiza o texto do bloco fixo com o total somado
function atualizarTotalPreco() {
  totalPrecoEl.textContent = `💰 Total: ${formatarPreco(calcularTotalPreco())}`;
}

// ==========================================================
// 6. RENDERIZA NA TELA A LISTA DE LEMBRETES (JÁ FILTRADA)
// Sempre reconstrói a lista visual do zero a partir do array em
// memória + filtros ativos. É chamada ao carregar a página e toda
// vez que algo muda (adicionar, excluir, marcar, ou mexer num filtro).
// ==========================================================
function renderizarLista() {
  // Limpa o container antes de reconstruir a lista
  listaLembretes.innerHTML = '';

  const lembretesFiltrados = obterLembretesFiltrados();

  lembretesFiltrados.forEach((lembrete) => {
    const card = criarCardLembrete(lembrete);
    listaLembretes.appendChild(card);
  });

  // Mostra a mensagem de "nada encontrado" só quando existem lembretes
  // cadastrados, mas nenhum deles passou nos filtros atuais
  const nadaEncontrado = lembretesFiltrados.length === 0 && lembretes.length > 0;
  msgVazio.classList.toggle('oculto', !nadaEncontrado);

  // Mantém o total de preços sempre em dia com a lista (soma de TODOS os itens,
  // não só dos filtrados, já que representa o valor final de tudo cadastrado)
  atualizarTotalPreco();
}

renderizarLista();

// ==========================================================
// 4. EVENTOS DA PÁGINA
// ==========================================================

// Clique no botão "Adicionar" dispara a função principal
btnAdicionar.addEventListener('click', adicionarLembrete);

// Permite adicionar o lembrete pressionando "Enter" dentro do input
inputTexto.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    // Evita comportamento padrão do Enter (ex: submit de formulário)
    evento.preventDefault();
    adicionarLembrete();
  }
});

// Assim que o usuário começa a digitar de novo, some com a mensagem de erro
// (melhora a experiência: o erro não fica "preso" na tela sem necessidade)
inputTexto.addEventListener('input', () => {
  if (msgErro.textContent) msgErro.textContent = '';
});

// ==========================================================
// 7. EVENTOS DOS FILTROS
// A cada letra digitada na busca (ou troca de opção nos selects),
// a lista é re-renderizada já filtrada — não precisa de botão "Aplicar".
// ==========================================================

// Barra de pesquisa: filtra a cada tecla digitada (evento "input")
inputBusca.addEventListener('input', renderizarLista);

// Selects de status, prioridade e vencimento: filtram ao trocar a opção
filtroStatus.addEventListener('change', renderizarLista);
filtroPrioridade.addEventListener('change', renderizarLista);
filtroVencimento.addEventListener('change', renderizarLista);

// ==========================================================
// 8. MODO CLARO/ESCURO + EASTER EGG DO DINOSSAURO
// ==========================================================

const CHAVE_TEMA = 'tema'; // chave usada no localStorage para lembrar o tema escolhido

// Lê o tema salvo no localStorage (ou usa 'claro' como padrão se não houver nada/erro)
function carregarTemaSalvo() {
  try {
    return localStorage.getItem(CHAVE_TEMA) || 'claro';
  } catch (erro) {
    console.error('Erro ao ler tema salvo:', erro);
    return 'claro';
  }
}

// Salva o tema escolhido no localStorage
function salvarTema(tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch (erro) {
    console.error('Erro ao salvar tema:', erro);
  }
}

// Aplica visualmente o tema: adiciona/remove a classe no <body> e troca o ícone do botão
function aplicarTema(tema) {
  document.body.classList.toggle('tema-escuro', tema === 'escuro');
  btnTema.textContent = tema === 'escuro' ? '☀️' : '🌙';
}

let temaAtual = carregarTemaSalvo();
aplicarTema(temaAtual);

// Conta quantas vezes SEGUIDAS o usuário trocou de "escuro" para "claro".
// Ao chegar em 4, dispara o easter egg do dinossauro e zera o contador.
let contadorEscuroParaClaro = 0;
const VEZES_PARA_ATIVAR_EASTER_EGG = 4;

btnTema.addEventListener('click', () => {
  const temaAnterior = temaAtual;
  temaAtual = temaAtual === 'escuro' ? 'claro' : 'escuro';

  aplicarTema(temaAtual);
  salvarTema(temaAtual);

  // Só conta quando a troca foi especificamente de escuro -> claro
  if (temaAnterior === 'escuro' && temaAtual === 'claro') {
    contadorEscuroParaClaro++;
    if (contadorEscuroParaClaro >= VEZES_PARA_ATIVAR_EASTER_EGG) {
      contadorEscuroParaClaro = 0;
      dispararEasterEggDinossauro();
    }
  }
});

// Velocidade da travessia dos easter eggs. 1,0 é a velocidade "padrão"
// (mais lenta, dá tempo de ler a frase); valores maiores deixam mais rápido,
// valores menores deixam mais lento ainda.
const VELOCIDADE_DINO = 1.0;
const DURACAO_BASE_DINO_SEGUNDOS = 6; // duração da travessia quando a velocidade é 1,0

// Cria e anima o dinossauro correndo pelo rodapé da página, deixando a frase
// "COM PRESSA?!" atrás dele. O elemento se remove sozinho ao fim da animação.
function dispararEasterEggDinossauro() {
  const wrapper = document.createElement('div');
  wrapper.className = 'easter-egg-correndo';
  // Duração calculada a partir da velocidade configurada acima
  wrapper.style.animationDuration = `${DURACAO_BASE_DINO_SEGUNDOS / VELOCIDADE_DINO}s`;

  const frase = document.createElement('span');
  frase.className = 'dino-frase';
  frase.textContent = 'COM PRESSA?!';

  const dino = document.createElement('span');
  dino.className = 'dino-emoji';
  dino.textContent = '🦖';

  // Ordem [frase, dino]: como o conjunto corre da esquerda pra direita,
  // a frase fica sempre atrás (à esquerda) do dinossauro
  wrapper.append(frase, dino);
  document.body.appendChild(wrapper);

  // Remove o elemento da tela assim que a animação de travessia terminar
  // (o "pulinho" do dino é infinito, então filtramos pelo nome da animação certa)
  wrapper.addEventListener('animationend', (evento) => {
    if (evento.animationName === 'correr-tela') {
      wrapper.remove();
    }
  });
}

// ==========================================================
// 9. EASTER EGG: Alice + coelho quando a lista tem
//    "bolo", "suco", "carne" e "baralho" ao mesmo tempo
// ==========================================================

const PALAVRAS_GRUPO_ESPECIAL = ['bolo', 'suco', 'carne', 'baralho'];
const VELOCIDADE_ALICE_COELHO = 1.0; // mesma ideia de velocidade do dinossauro
const DURACAO_BASE_ALICE_COELHO_SEGUNDOS = 6;

// Controla se o grupo já está "ativo" no momento, pra só disparar o easter egg
// quando os 4 itens passam a estar juntos (e não a cada nova renderização
// enquanto eles continuarem juntos na lista).
// Se os lembretes salvos já carregarem com o grupo completo, começamos com
// isso "true" pra não disparar o easter egg logo ao abrir a página.
let grupoEspecialAtivo = PALAVRAS_GRUPO_ESPECIAL.every((palavra) =>
  lembretes.some((item) => item.texto.toLowerCase().includes(palavra))
);

// Verifica se cada palavra do grupo especial aparece em algum lembrete da lista
function verificarGrupoEspecial() {
  const textos = lembretes.map((item) => item.texto.toLowerCase());
  const todasAsPalavrasPresentes = PALAVRAS_GRUPO_ESPECIAL.every((palavra) =>
    textos.some((texto) => texto.includes(palavra))
  );

  if (todasAsPalavrasPresentes && !grupoEspecialAtivo) {
    grupoEspecialAtivo = true;
    dispararEasterEggAliceCoelho();
  } else if (!todasAsPalavrasPresentes) {
    // Assim que o grupo deixa de estar completo, "rearma" o gatilho
    // para poder disparar de novo no futuro
    grupoEspecialAtivo = false;
  }
}

// Cria a Alice e o coelho correndo juntos pelo rodapé da página, alternando
// os 2 quadros de cada sprite pra simular a corrida (efeito "stop motion")
function dispararEasterEggAliceCoelho() {
  const wrapper = document.createElement('div');
  wrapper.className = 'easter-egg-correndo';
  wrapper.style.animationDuration = `${DURACAO_BASE_ALICE_COELHO_SEGUNDOS / VELOCIDADE_ALICE_COELHO}s`;

  const alice = document.createElement('img');
  alice.className = 'sprite-corredor';
  alice.id = 'sprite-alice';
  alice.src = 'assets/alice_run1.png';
  alice.alt = 'Alice correndo';

  const coelho = document.createElement('img');
  coelho.className = 'sprite-corredor';
  coelho.id = 'sprite-coelho';
  coelho.src = 'assets/rabbit_run1.png';
  coelho.alt = 'Coelho correndo';

  // Alice na frente, coelho correndo atrás dela
  wrapper.append(alice, coelho);
  document.body.appendChild(wrapper);

  // Troca os quadros da Alice e do coelho a cada 150ms, alternando entre
  // os dois frames de cada um, pra dar a impressão de corrida
  let quadroAlternado = false;
  const intervaloAnimacao = setInterval(() => {
    quadroAlternado = !quadroAlternado;
    alice.src = quadroAlternado ? 'assets/alice_run2.png' : 'assets/alice_run1.png';
    coelho.src = quadroAlternado ? 'assets/rabbit_run2.png' : 'assets/rabbit_run1.png';
  }, 150);

  // Ao fim da travessia, para de trocar os quadros e remove os elementos
  wrapper.addEventListener('animationend', (evento) => {
    if (evento.animationName === 'correr-tela') {
      clearInterval(intervaloAnimacao);
      wrapper.remove();
    }
  });
}
