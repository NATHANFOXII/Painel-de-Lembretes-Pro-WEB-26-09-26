// ==========================================================
// 1. SELEÇÃO DOS ELEMENTOS HTML
// Guardamos referências aos elementos do DOM que serão usados
// repetidamente, evitando buscar no DOM toda vez (melhor performance)
// ==========================================================
const inputTexto = document.querySelector('#input-texto');       // campo de texto do lembrete
const selectPrioridade = document.querySelector('#select-prioridade'); // select de prioridade
const btnAdicionar = document.querySelector('#btn-adicionar');   // botão "Adicionar"
const listaLembretes = document.querySelector('#lista-lembretes'); // container onde os cards entram
const msgErro = document.querySelector('#msg-erro');             // elemento para exibir erros

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
    concluido: false // controla se o item já foi "conferido" (clicado)
  };
  lembretes.push(novoLembrete);
  salvarLembretes(lembretes);

  // --- Criação do card ---
  // Delega a criação do elemento HTML para uma função separada 
  const novoCard = criarCardLembrete(novoLembrete);
  // Insere o card criado dentro do container da lista
  listaLembretes.appendChild(novoCard);
  // --- Reset do formulário ---
  // Limpa o campo de texto para o usuário poder digitar o próximo lembrete
  inputTexto.value = '';
  // Volta o select para a prioridade padrão
  selectPrioridade.value = PRIORIDADE_PADRAO;
  // Devolve o foco ao input, agilizando a digitação de vários lembretes seguidos
  inputTexto.focus();
}


// ==========================================================
// 4. CRIAÇÃO DO CARD (de forma segura, sem innerHTML)
// Construir os elementos "na mão" evita XSS: se usássemos innerHTML
// com o texto do usuário, alguém poderia digitar código HTML/JS malicioso
// ==========================================================
function criarCardLembrete(lembrete) {
  // "?? false" garante que lembretes salvos antes dessa funcionalidade existir
  // (sem o campo "concluido") também funcionem, assumindo que não estão conferidos
  const { id, texto, prioridade, concluido = false } = lembrete;

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

  // --- Clique no texto do lembrete alterna o emoji de "confere" ---
  // Fica só no infoWrapper (não no card inteiro) pra não conflitar
  // com o clique no botão "Excluir"
  infoWrapper.addEventListener('click', () => {
    // Acha o lembrete correspondente no array em memória
    const lembreteAtual = lembretes.find((item) => item.id === id);
    if (!lembreteAtual) return;
    // Inverte o estado de "concluido" (true vira false, false vira true)
    lembreteAtual.concluido = !lembreteAtual.concluido;
    // Mostra/esconde o emoji de acordo com o novo estado
    emojiConfere.classList.toggle('oculto', !lembreteAtual.concluido);
    // Persiste a mudança no localStorage
    salvarLembretes(lembretes);
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
    card.remove();
    // Remove do array em memória o lembrete com esse id
    lembretes = lembretes.filter((item) => item.id !== id);
    // Atualiza o localStorage com a lista sem esse item
    salvarLembretes(lembretes);
  });

  // Monta o card final: informações + botão de excluir
  card.append(infoWrapper, btnDeletar);

  // Retorna o card pronto para ser inserido na lista
  return card;
}

// ==========================================================
// 5. RENDERIZA NA TELA OS LEMBRETES QUE JÁ ESTAVAM SALVOS
// Executado uma vez, assim que o script carrega, para reconstruir
// a lista visual a partir do que está no localStorage.
// ==========================================================
function renderizarLembretesSalvos() {
  lembretes.forEach((lembrete) => {
    const card = criarCardLembrete(lembrete);
    listaLembretes.appendChild(card);
  });
}

renderizarLembretesSalvos();

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
