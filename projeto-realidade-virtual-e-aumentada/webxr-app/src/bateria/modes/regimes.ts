// ===========================================================================
// regimes.ts — OS TRÊS REGIMES DA BATERIA, DECLARADOS (passo 3 da tarefa)
// ===========================================================================
//
// O QUE É
//   "Regime" é cada maneira como o ambiente trata o mundo de quem observa:
//   substituí-lo (visor), mantê-lo e pôr a cena por cima (celular), ou mostrar
//   a cena numa janela sem tocá-lo (PC). Este arquivo DECLARA, para cada um:
//   o espaço de referência, o que é rastreado e contra o que a cena é registrada.
//
// O QUE FAZ
//   Nada roda aqui: é uma lista de dados. Ela é lida pela tabela de regimes
//   (relatorio.ts), pela pergunta "este aparelho entra?" (verificacao.ts) e
//   pela conferência da composição do fundo (sonda.ts).
//
// COMO FAZ
//   Um tipo `Regime` com os mesmos campos para os três + a constante `REGIMES`.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Descrever os regimes só por rótulo ("VR", "AR", "desktop").
//   b) Um campo booleano `imersivo: true/false`.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) Rótulo não decide nada: "é realidade aumentada" não diz que espaço de
//      referência pedir nem o que fazer quando não houver câmera (Cap. 1, seção
//      1.1). Os três campos, sim, viram código.
//   b) Booleano só tem dois valores e os regimes são três; no dia do terceiro
//      caso, dezenas de lugares estariam perguntando "é imersivo?" (Cap. 1,
//      seção 1.2).
//
// POR QUE PRECISAMOS
//   A declaração é uma PROMESSA escrita antes de o regime existir. Nos módulos
//   seguintes cada regime vai ter de provar o que está aqui — e a sonda já
//   confronta uma das promessas (a composição do fundo) com o aparelho real.
//
// BASE NO MATERIAL
//   Cap. 1, seções 1.2 (os três tratamentos do mundo), 1.4 (composição do
//   fundo como RESPOSTA do aparelho; espaço de referência e seus três degraus)
//   e a conferência "se dois regimes têm os mesmos campos, um não existe".
//   Projeto do professor: src/bancada/modes/regimes.ts.
// ===========================================================================

/**
 * O QUE É: identificador de cada regime.
 * POR QUE ESSES NOMES: são exatamente os modos de sessão da API WebXR
 *   ('inline', 'immersive-vr', 'immersive-ar'). Assim dá para perguntar ao
 *   navegador `isSessionSupported(id)` sem tabela de tradução no meio.
 */
export type RegimeId = 'inline' | 'immersive-vr' | 'immersive-ar';

/**
 * O QUE É: o que o regime faz com o mundo real de quem observa.
 * OUTRA OPÇÃO: booleano `imersivo`.
 * POR QUE TRÊS VALORES: porque são três casos, e o compilador obriga todo
 *   `switch` a tratar os três (Cap. 1, seção 1.2).
 */
export type TratamentoDoMundo =
  | 'substitui' // o sintético toma o lugar do real (visor: tela opaca)
  | 'preserva' // o real continua visível e recebe a cena por cima (celular)
  | 'exibe'; // a cena aparece numa janela e o real nem é tocado (PC)

/**
 * O QUE É: o modo de composição do fundo, com os nomes da API WebXR.
 *   - 'opaque': a tela esconde o mundo (VR);
 *   - 'additive': a luz sintética SOMA à luz real (óculos transparentes) — preto vira invisível;
 *   - 'alpha-blend': mistura por transparência (celular e passthrough).
 * POR QUE AQUI É "ESPERADA": o valor real só existe com a sessão aberta e quem
 *   responde é o aparelho (Cap. 1, seção 1.4.1: "o modo de composição é
 *   resposta, e nunca configuração"). Guardamos a expectativa aqui e a sonda
 *   compara com o que veio — se diferir, a declaração é que estava errada.
 */
export type ModoDeComposicao = 'opaque' | 'additive' | 'alpha-blend';

/**
 * O QUE É: a declaração de um regime, campo a campo.
 * POR QUE OS MESMOS CAMPOS PARA OS TRÊS: um regime que precisasse de um campo
 *   exclusivo seria "categoria com outra roupa" (Cap. 1, seção 1.4.2). E dá
 *   para conferir mecanicamente: se dois regimes têm os mesmos valores em
 *   espaço de referência, rastreia e registro, um deles não existe.
 */
export interface Regime {
  readonly id: RegimeId;
  readonly nome: string;
  readonly tratamentoDoMundo: TratamentoDoMundo;
  /**
   * Espaço de referência pretendido: o sistema de coordenadas e a regra que
   * fixa onde fica o "zero" do mundo virtual (Cap. 1, seção 1.4.2):
   *   'viewer' — acompanha a cabeça; 'local' — onde a sessão começou;
   *   'local-floor' — idem, com a promessa de saber onde está o chão;
   *   'unbounded' — áreas maiores que a sala, com origem que pode ser corrigida.
   */
  readonly espacoDeReferencia: 'viewer' | 'local' | 'local-floor' | 'unbounded';
  /** O que o sistema rastreia neste regime, em uma frase. */
  readonly rastreia: string;
  /** A que coisa do mundo (ou da cena) a posição da bateria fica presa. */
  readonly registroContra: string;
  readonly composicaoEsperada: ModoDeComposicao;
  /** O que este regime vai ter de provar adiante — hoje ainda é promessa. */
  readonly provaAdiante: string;
}

/**
 * O QUE É: os três regimes da bateria.
 * POR QUE ESSES VALORES:
 *   - Janela usa 'viewer' e origem arbitrária da cena (degrau 1 do Cap. 1):
 *     liberdade total, sem escala corporal — não há corpo no PC.
 *   - Visor usa 'local-floor' (degrau 2): a plataforma nasce no piso real, e
 *     "estante de 1,20 m" passa a ser 1,20 m de verdade.
 *   - Celular também usa 'local-floor' como origem; a superfície real chega
 *     por teste de impacto + âncora, SOBRE essa origem (degrau 3). A WebXR não
 *     tem um espaço de referência "superfície" — por isso o registro é descrito
 *     no campo `registroContra`, e não no espaço. A bateria fica no chão real,
 *     em tamanho real (especificação, seção 4), e não numa mesa em escala menor.
 * POR QUE OS TEXTOS SÃO OS MESMOS DA ESPECIFICAÇÃO, LETRA POR LETRA: o passo 4
 *   pede que esta declaração entre na especificação "como está, sem
 *   reescrita" (seção 9). Duas versões da mesma declaração acabam dizendo
 *   coisas diferentes; mudou aqui, muda lá.
 * OUTRA OPÇÃO: pedir 'unbounded' no visor. Descartada: "quanto mais o espaço
 *   promete sobre o mundo físico, mais coisas ele pode errar" (Cap. 1), e a
 *   bateria cabe numa sala.
 */
export const REGIMES: readonly Regime[] = [
  {
    id: 'inline',
    nome: 'Janela (PC)',
    tratamentoDoMundo: 'exibe',
    espacoDeReferencia: 'viewer',
    rastreia: 'nada do corpo; a câmera obedece ao mouse',
    registroContra: 'a origem da cena, que escolhemos no centro da plataforma, no chão',
    composicaoEsperada: 'opaque',
    provaAdiante: 'que o kit inteiro pode ser montado só com mouse e teclado',
  },
  {
    id: 'immersive-vr',
    nome: 'Visor (VR)',
    tratamentoDoMundo: 'substitui',
    espacoDeReferencia: 'local-floor',
    rastreia: 'a cabeça e os dois controles, com seis graus de liberdade',
    registroContra: 'o chão físico onde a pessoa está; a plataforma nasce no nível do piso real',
    composicaoEsperada: 'opaque',
    provaAdiante: 'escala corporal, alcance de 90 cm e a velocidade do controle virando intensidade do som',
  },
  {
    id: 'immersive-ar',
    nome: 'Celular (AR)',
    tratamentoDoMundo: 'preserva',
    espacoDeReferencia: 'local-floor',
    rastreia: 'a pose do celular e as superfícies que ele encontra',
    registroContra:
      'o chão real encontrado por teste de impacto, com uma âncora que mantém a plataforma no lugar enquanto a pessoa anda',
    composicaoEsperada: 'alpha-blend',
    provaAdiante: 'que a plataforma não desliza nem flutua quando a pessoa caminha',
  },
];

/**
 * O QUE FAZ: escreve em frase o que cada tratamento faz com o mundo real.
 * POR QUE PRECISAMOS: o tipo guarda um rótulo curto ('exibe'), bom para o
 *   compilador conferir; a pessoa que lê a tabela precisa da frase. A mesma
 *   frase está na seção 9 da especificação.
 * POR QUE `switch` SEM `default`: tratamento novo sem frase não compila.
 */
export function descreverTratamento(tratamento: TratamentoDoMundo): string {
  switch (tratamento) {
    case 'exibe':
      return 'exibe a cena numa janela, sem tocar no mundo';
    case 'substitui':
      return 'substitui o mundo pela cena';
    case 'preserva':
      return 'preserva o mundo e põe a cena por cima';
  }
}

/**
 * O QUE FAZ: acha um regime pelo id.
 * POR QUE O `throw`: só aconteceria se alguém acrescentasse um id ao tipo
 *   `RegimeId` e esquecesse a entrada na lista — melhor parar com mensagem
 *   clara do que seguir com `undefined` e quebrar em outro lugar.
 */
export function regimePorId(id: RegimeId): Regime {
  const encontrado: Regime | undefined = REGIMES.find((regime) => regime.id === id);
  if (encontrado === undefined) {
    throw new Error(`Regime não declarado: ${id}`);
  }
  return encontrado;
}
