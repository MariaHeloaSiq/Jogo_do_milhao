
 // ==========================================
 // REINO DO SABER - O DESAFIO DA COROA
 // JavaScript: jogo, API e tradução automática
 // ==========================================

 const TOTAL_PERGUNTAS = 34;
 const PONTUACAO_MAXIMA = 100;
 const PONTUACAO_MINIMA = 0;
 
 // Endereço da API de tradução.
 const API_TRADUCAO =
     "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=";
 
 // ELEMENTOS HTML
 const telaInicial = document.getElementById("tela-inicial");
 const telaCarregamento = document.getElementById("tela-carregamento");
 const telaJogo = document.getElementById("tela-jogo");
 const telaFinal = document.getElementById("tela-final");
 
 const botaoIniciar = document.getElementById("botao-iniciar");
 const botaoReiniciar = document.getElementById("botao-reiniciar");
 const botaoProxima = document.getElementById("botao-proxima");
 const botaoPular = document.getElementById("botao-pular");
 
 const numeroPergunta = document.getElementById("numero-pergunta");
 const pontuacaoElemento = document.getElementById("pontuacao");
 const barraProgresso = document.getElementById("progresso");
 
 const categoriaElemento = document.getElementById("categoria");
 const dificuldadeElemento = document.getElementById("dificuldade");
 const perguntaElemento = document.getElementById("pergunta");
 const alternativasElemento = document.getElementById("alternativas");
 
 const modoAlternativa = document.getElementById("modo-alternativa");
 const modoDigitacao = document.getElementById("modo-digitacao");
 
 const areaDigitacao = document.getElementById("area-digitacao");
 const respostaDigitada = document.getElementById("resposta-digitada");
 
 const mensagemElemento = document.getElementById("mensagem");
 
 // VARIÁVEIS DO JOGO
 let perguntas = [];
 let perguntaAtual = 0;
 let pontuacao = 0;
 
 let acertos = 0;
 let erros = 0;
 let puladas = 0;
 
 let modoResposta = "alternativa";
 let perguntaRespondida = false;
 
 // Guarda traduções durante a partida para evitar
 // traduzir novamente um mesmo texto.
 const cacheTraducoes = new Map();
 
 
 // ==========================================
 // CONTROLE DAS TELAS
 // ==========================================
 
 function mostrarTela(telaEscolhida) {
     telaInicial.classList.add("escondido");
     telaCarregamento.classList.add("escondido");
     telaJogo.classList.add("escondido");
     telaFinal.classList.add("escondido");
 
     telaEscolhida.classList.remove("escondido");
 }
 
 
 // ==========================================
 // DECODIFICAÇÃO DOS TEXTOS DA OPEN TRIVIA
 // ==========================================
 
 function decodificarTexto(texto) {
     try {
         return decodeURIComponent(texto.replace(/\+/g, "%20"));
     } catch {
         return texto;
     }
 }
 
 
 // ==========================================
 // TRADUÇÃO AUTOMÁTICA
 // Traduz os textos do inglês para português.
 // A pergunta e todas as alternativas são
 // traduzidas antes de serem mostradas ao jogador.
 // ==========================================
 
 async function traduzirTexto(texto) {
 
     if (!texto || !texto.trim()) {
         return texto;
     }
 
     // Verifica se o texto já foi traduzido nesta partida.
     if (cacheTraducoes.has(texto)) {
         return cacheTraducoes.get(texto);
     }
 
     const endereco =
         API_TRADUCAO + encodeURIComponent(texto);
 
     let ultimaFalha;
 
     // Tenta novamente caso o serviço esteja temporariamente indisponível.
     for (let tentativa = 1; tentativa <= 3; tentativa++) {
 
         try {
 
             const resposta = await fetch(endereco);
 
             if (!resposta.ok) {
                 throw new Error("O serviço de tradução está indisponível.");
             }
 
             const dados = await resposta.json();
 
             if (!dados[0] || !Array.isArray(dados[0])) {
                 throw new Error("A tradução não retornou um texto válido.");
             }
 
             const textoTraduzido = dados[0]
                 .map(parte => parte[0] || "")
                 .join("")
                 .trim();
 
             if (!textoTraduzido) {
                 throw new Error("Não foi possível traduzir o texto.");
             }
 
             cacheTraducoes.set(texto, textoTraduzido);
 
             return textoTraduzido;
 
         } catch (erro) {
 
             ultimaFalha = erro;
 
             // Pequena espera antes de tentar novamente.
             if (tentativa < 3) {
                 await new Promise(resolve =>
                     setTimeout(resolve, tentativa * 1000)
                 );
             }
 
         }
     }
 
     throw ultimaFalha || new Error("Falha na tradução.");
 }
 
 
 // ==========================================
 // LIMITADOR DE REQUISIÇÕES
 // Evita enviar muitas traduções ao mesmo tempo.
 // ==========================================
 
 async function executarComLimite(lista, limite, tarefa) {
 
     const resultados = new Array(lista.length);
     let proximoIndice = 0;
 
     async function trabalhador() {
 
         while (true) {
 
             const indice = proximoIndice++;
 
             if (indice >= lista.length) {
                 break;
             }
 
             resultados[indice] = await tarefa(lista[indice]);
         }
     }
 
     const quantidadeTrabalhadores =
         Math.min(limite, lista.length);
 
     const trabalhadores = [];
 
     for (let i = 0; i < quantidadeTrabalhadores; i++) {
         trabalhadores.push(trabalhador());
     }
 
     await Promise.all(trabalhadores);
 
     return resultados;
 }
 
 
 // ==========================================
 // CONSUMO DA OPEN TRIVIA DATABASE
 // Busca 34 perguntas com quatro alternativas.
 // ==========================================
 
 async function buscarPerguntas() {
 
     const enderecoAPI =
         `https://opentdb.com/api.php?amount=${TOTAL_PERGUNTAS}&type=multiple&encode=url3986`;
 
     const resposta = await fetch(enderecoAPI);
 
     if (!resposta.ok) {
         throw new Error("Não foi possível acessar a API de perguntas.");
     }
 
     const dados = await resposta.json();
 
     if (
         dados.response_code !== 0 ||
         !Array.isArray(dados.results) ||
         dados.results.length !== TOTAL_PERGUNTAS
     ) {
         throw new Error(
             "A API não retornou as 34 perguntas necessárias. Tente novamente."
         );
     }
 
     // Organiza as perguntas recebidas da API.
     const perguntasOriginais = dados.results.map(item => {
 
         const correta = decodificarTexto(item.correct_answer);
 
         const incorretas =
             item.incorrect_answers.map(decodificarTexto);
 
         return {
             pergunta: decodificarTexto(item.question),
             respostaCorreta: correta,
             alternativas: misturarArray([
                 ...incorretas,
                 correta
             ]),
             categoria: decodificarTexto(item.category),
             dificuldade: item.difficulty
         };
 
     });
 
     // TRADUÇÃO DAS PERGUNTAS E RESPOSTAS
     // Cada pergunta e suas quatro alternativas
     // são traduzidas antes de iniciar o jogo.
 
     const perguntasTraduzidas = await executarComLimite(
         perguntasOriginais,
         4,
         async (item) => {
 
             const perguntaTraduzida =
                 await traduzirTexto(item.pergunta);
 
             const alternativasTraduzidas =
                 await Promise.all(
                     item.alternativas.map(alternativa =>
                         traduzirTexto(alternativa)
                     )
                 );
 
             const respostaCorretaTraduzida =
                 await traduzirTexto(item.respostaCorreta);
 
             return {
                 pergunta: perguntaTraduzida,
                 respostaCorreta: respostaCorretaTraduzida,
                 alternativas: alternativasTraduzidas,
                 categoria: item.categoria,
                 dificuldade: item.dificuldade
             };
 
         }
     );
 
     return perguntasTraduzidas;
 }
 
 
 // ==========================================
 // FUNÇÕES AUXILIARES
 // ==========================================
 
 // Mistura a ordem das alternativas.
 function misturarArray(array) {
 
     const novoArray = [...array];
 
     for (let i = novoArray.length - 1; i > 0; i--) {
 
         const j = Math.floor(Math.random() * (i + 1));
 
         [novoArray[i], novoArray[j]] =
             [novoArray[j], novoArray[i]];
 
     }
 
     return novoArray;
 }
 
 
 // Atualiza a pontuação respeitando os limites.
 function atualizarPontuacao(pontos) {
 
     pontuacao += pontos;
 
     pontuacao = Math.max(
         PONTUACAO_MINIMA,
         Math.min(PONTUACAO_MAXIMA, pontuacao)
     );
 
     pontuacaoElemento.textContent =
         `${pontuacao} pontos`;
 }
 
 
 // ==========================================
 // INICIAR E REINICIAR O JOGO
 // ==========================================
 
 async function iniciarJogo() {
 
     mostrarTela(telaCarregamento);
 
     // Limpa o cache para uma nova partida.
     cacheTraducoes.clear();
 
     try {
 
         perguntas = await buscarPerguntas();
 
         perguntaAtual = 0;
         pontuacao = 0;
 
         acertos = 0;
         erros = 0;
         puladas = 0;
 
         modoResposta = "alternativa";
 
         exibirPergunta();
 
         mostrarTela(telaJogo);
 
     } catch (erro) {
 
         mostrarTela(telaInicial);
 
         alert(
             "Não foi possível carregar e traduzir as perguntas.\n\n" +
             erro.message +
             "\n\nVerifique sua conexão com a internet e tente novamente."
         );
 
         console.error("Erro no carregamento:", erro);
 
     }
 }
 
 
 // ==========================================
 // EXIBIR PERGUNTAS
 // ==========================================
 
 function exibirPergunta() {
 
     perguntaRespondida = false;
 
     const dados = perguntas[perguntaAtual];
 
     numeroPergunta.textContent =
         `Pergunta ${perguntaAtual + 1} de ${perguntas.length}`;
 
     pontuacaoElemento.textContent =
         `${pontuacao} pontos`;
 
     barraProgresso.style.width =
         `${(perguntaAtual / perguntas.length) * 100}%`;
 
     categoriaElemento.textContent = dados.categoria;
 
     dificuldadeElemento.textContent =
         dados.dificuldade === "easy" ? "Fácil" :
         dados.dificuldade === "medium" ? "Médio" : "Difícil";
 
     perguntaElemento.textContent = dados.pergunta;
 
     mensagemElemento.textContent = "";
     mensagemElemento.className = "mensagem escondido";
 
     botaoProxima.classList.add("escondido");
     botaoPular.disabled = false;
 
     respostaDigitada.value = "";
     respostaDigitada.disabled = false;
 
     alternativasElemento.innerHTML = "";
 
     dados.alternativas.forEach(alternativa => {
 
         const botao = document.createElement("button");
 
         botao.type = "button";
         botao.className = "alternativa";
         botao.textContent = alternativa;
 
         botao.addEventListener("click", () => {
             responderAlternativa(alternativa, botao);
         });
 
         alternativasElemento.appendChild(botao);
 
     });
 
     mudarModo(modoResposta);
 }
 
 
 // ==========================================
 // MODOS DE RESPOSTA
 // ==========================================
 
 function mudarModo(modo) {
 
     modoResposta = modo;
 
     if (modo === "alternativa") {
 
         modoAlternativa.classList.add("ativo");
         modoDigitacao.classList.remove("ativo");
 
         alternativasElemento.classList.remove("escondido");
         areaDigitacao.classList.add("escondido");
 
     } else {
 
         modoDigitacao.classList.add("ativo");
         modoAlternativa.classList.remove("ativo");
 
         alternativasElemento.classList.add("escondido");
         areaDigitacao.classList.remove("escondido");
 
         if (!perguntaRespondida) {
             respostaDigitada.focus();
         }
 
     }
 }
 
 
 // ==========================================
 // MENSAGENS E BLOQUEIO DE RESPOSTAS
 // ==========================================
 
 function mostrarMensagem(texto, tipo) {
 
     mensagemElemento.textContent = texto;
     mensagemElemento.className = `mensagem ${tipo}`;
 
 }
 
 
 function bloquearRespostas() {
 
     perguntaRespondida = true;
 
     botaoPular.disabled = true;
     respostaDigitada.disabled = true;
 
     alternativasElemento
         .querySelectorAll("button")
         .forEach(botao => {
             botao.disabled = true;
         });
 
     botaoProxima.classList.remove("escondido");
 }
 
 
 function destacarRespostaCorreta() {
 
     const correta = perguntas[perguntaAtual].respostaCorreta;
 
     alternativasElemento
         .querySelectorAll("button")
         .forEach(botao => {
 
             if (botao.textContent === correta) {
                 botao.classList.add("correta");
             }
 
         });
 }
 
 
 // ==========================================
 // RESPOSTA POR ALTERNATIVA
 // Correta: +1 ponto
 // Incorreta: -2 pontos
 // ==========================================
 
 function responderAlternativa(escolhida, botaoEscolhido) {
 
     if (perguntaRespondida) return;
 
     const correta = perguntas[perguntaAtual].respostaCorreta;
 
     if (escolhida === correta) {
 
         atualizarPontuacao(1);
         acertos++;
 
         botaoEscolhido.classList.add("correta");
 
         mostrarMensagem(
             "Parabéns! Você acertou e ganhou +1 ponto!",
             "sucesso"
         );
 
     } else {
 
         atualizarPontuacao(-2);
         erros++;
 
         botaoEscolhido.classList.add("incorreta");
 
         destacarRespostaCorreta();
 
         mostrarMensagem(
             `Resposta incorreta! A resposta correta era: ${correta}. Você perdeu 2 pontos.`,
             "erro"
         );
 
     }
 
     bloquearRespostas();
 }
 
 
 // ==========================================
 // RESPOSTA DIGITADA
 // Correta: +3 pontos
 // Incorreta: -2 pontos
 // ==========================================
 
 function normalizarResposta(texto) {
 
     return texto
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .toLowerCase()
         .replace(/[^\p{L}\p{N}\s]/gu, "")
         .replace(/\s+/g, " ")
         .trim();
 
 }
 
 
 function responderDigitando(evento) {
 
     evento.preventDefault();
 
     if (perguntaRespondida) return;
 
     const respostaUsuario =
         normalizarResposta(respostaDigitada.value);
 
     const respostaCorreta =
         normalizarResposta(perguntas[perguntaAtual].respostaCorreta);
 
     if (!respostaUsuario) {
 
         mostrarMensagem(
             "Digite uma resposta antes de confirmar.",
             "neutra"
         );
 
         return;
     }
 
     if (respostaUsuario === respostaCorreta) {
 
         atualizarPontuacao(3);
         acertos++;
 
         mostrarMensagem(
             "Excelente! Você acertou e ganhou +3 pontos!",
             "sucesso"
         );
 
     } else {
 
         atualizarPontuacao(-2);
         erros++;
 
         mostrarMensagem(
             `Resposta incorreta! A resposta correta era: ${perguntas[perguntaAtual].respostaCorreta}. Você perdeu 2 pontos.`,
             "erro"
         );
 
     }
 
     bloquearRespostas();
 }
 
 
 // ==========================================
 // PULAR PERGUNTA
 // Não ganha nem perde pontos.
 // ==========================================
 
 function pularPergunta() {
 
     if (perguntaRespondida) return;
 
     puladas++;
 
     mostrarMensagem(
         `Você pulou esta pergunta. Nenhum ponto foi alterado. A resposta correta era: ${perguntas[perguntaAtual].respostaCorreta}.`,
         "neutra"
     );
 
     destacarRespostaCorreta();
 
     bloquearRespostas();
 }
 
 
 // ==========================================
 // PRÓXIMA PERGUNTA
 // ==========================================
 
 function proximaPergunta() {
 
     if (!perguntaRespondida) return;
 
     perguntaAtual++;
 
     if (perguntaAtual < perguntas.length) {
         exibirPergunta();
     } else {
         finalizarJogo();
     }
 
 }
 
 
 // ==========================================
 // RESULTADO FINAL
 // ==========================================
 
 function finalizarJogo() {
 
     barraProgresso.style.width = "100%";
 
     document.getElementById("pontuacao-final").textContent =
         pontuacao;
 
     document.getElementById("acertos").textContent = acertos;
     document.getElementById("erros").textContent = erros;
     document.getElementById("puladas").textContent = puladas;
 
     const tituloFinal =
         document.getElementById("titulo-final");
 
     const mensagemFinal =
         document.getElementById("mensagem-final");
 
     if (pontuacao >= 80) {
 
         tituloFinal.textContent = "Uma lenda do reino!";
 
         mensagemFinal.textContent =
             "Seu conhecimento brilhou muito neste desafio. Parabéns!";
 
     } else if (pontuacao >= 50) {
 
         tituloFinal.textContent = "Uma conquista real!";
 
         mensagemFinal.textContent =
             "Você foi muito bem! Continue aprendendo.";
 
     } else if (pontuacao >= 25) {
 
         tituloFinal.textContent = "Uma jornada de aprendizado!";
 
         mensagemFinal.textContent =
             "Continue praticando para conquistar ainda mais pontos!";
 
     } else {
 
         tituloFinal.textContent = "Desafio concluído!";
 
         mensagemFinal.textContent =
             "Toda jornada começa com aprendizado. Tente novamente!";
 
     }
 
     mostrarTela(telaFinal);
 }
 
 
 // ==========================================
 // EVENTOS DOS BOTÕES
 // ==========================================
 
 botaoIniciar.addEventListener("click", iniciarJogo);
 
 botaoReiniciar.addEventListener("click", iniciarJogo);
 
 botaoProxima.addEventListener("click", proximaPergunta);
 
 botaoPular.addEventListener("click", pularPergunta);
 
 modoAlternativa.addEventListener("click", () => {
     mudarModo("alternativa");
 });
 
 modoDigitacao.addEventListener("click", () => {
     mudarModo("digitacao");
 });
 
 areaDigitacao.addEventListener(
     "submit",
     responderDigitando
 );
 