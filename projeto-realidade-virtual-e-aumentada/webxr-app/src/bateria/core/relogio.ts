// ===========================================================================
// relogio.ts — A CENA ANDA PELO TEMPO, NÃO PELOS QUADROS (passo 9)
// ===========================================================================
//
// O QUE É
//   O relógio do ambiente: a cada quadro diz quanto tempo passou desde o
//   quadro anterior (`delta`, em segundos) e o tempo total da cena.
//
// O QUE FAZ
//   Recebe o instante que o laço de animação informa e devolve uma `Amostra`.
//   Também corta saltos grandes (aba escondida, menu do visor aberto).
//
// COMO FAZ
//   Guarda o instante do quadro anterior e subtrai.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Somar um valor fixo por quadro ("abre o chimbal um pouquinho por quadro").
//   b) Usar o `THREE.Clock` da biblioteca.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) Por quadro, a velocidade vira propriedade da máquina: o chimbal abriria
//      60 vezes por minuto num monitor de 60 Hz, 72 no visor, 144 num monitor
//      gamer. Com tempo, "uma vez por segundo" é verdade em qualquer aparelho.
//      E o problema "aparece primeiro no aparelho de outra pessoa" — nunca na
//      máquina de quem programou, que costuma ser a mais rápida (Cap. 3, seção
//      1.4.2).
//   b) O Clock mede o tempo, mas não limita o salto nem informa que descartou
//      um salto. O nosso faz as duas coisas — e o professor fez o mesmo.
//
// POR QUE PRECISAMOS
//   Passo 9: "pronto quando o ambiente se comporta igual em máquinas de
//   velocidades diferentes". Conferência: cronometrar 10 ciclos do chimbal em
//   duas máquinas — tem que dar 10 s nas duas.
//
// BASE NO MATERIAL
//   Cap. 3, seção 1.4.2 ("O relógio contra a contagem de quadros"): primeiro
//   quadro com delta zero, teto de salto, devolver também o intervalo real e
//   o indicador de descarte. Projeto do professor: src/bancada/core/relogio.ts.
// ===========================================================================

/** O que o relógio entrega a cada quadro. Tudo em SEGUNDOS. */
export interface Amostra {
  /** Tempo desde o quadro anterior, já limitado pelo teto de salto. É o que ANIMA. */
  readonly delta: number;
  /** Soma dos deltas desde o primeiro quadro: o "tempo da cena". */
  readonly decorrido: number;
  /** Intervalo real medido, ANTES do limite. Serve para MEDIR (orçamento), não para animar. */
  readonly intervaloReal: number;
  /** Verdadeiro quando o intervalo real passou do teto e foi cortado. */
  readonly saltoDescartado: boolean;
}

/**
 * O QUE É: o maior salto de tempo que a cena aceita num quadro: 0,1 s.
 * POR QUE PRECISAMOS: com a aba escondida o navegador para de pedir quadros
 *   (comportamento desejado). Ao voltar, o intervalo real pode ser de 8 s —
 *   correto, esse tempo passou — mas aplicá-lo de uma vez faria a cena dar um
 *   pulo. No visor, um objeto que salta no campo de visão é um solavanco físico.
 * POR QUE 0,1 s: baixo demais engasgaria máquinas lentas que só atrasaram um
 *   pouco; alto demais deixaria o pulo voltar. 0,1 s cobre 6 quadros de 60 Hz
 *   de atraso e ainda é pequeno demais para virar salto visível ("alguns
 *   décimos de segundo", Cap. 3).
 * O LIMITE QUE ESSA ESCOLHA CRIA: abaixo de 10 quadros por segundo TODO
 *   quadro passa de 0,1 s e é cortado, e a cena anda mais devagar que o
 *   relógio de parede (a 5 quadros por segundo, 10 s reais viram 5 s de
 *   cena). Então "se comporta igual em máquinas diferentes" vale para
 *   máquinas acima de 10 quadros por segundo, e a especificação (seção 10)
 *   diz isso. Abaixo disso a cena já é inutilizável de qualquer jeito (o
 *   mínimo aceito é 30 quadros por segundo no celular), e cada quadro cortado
 *   sai marcado em `saltoDescartado`, então o corte nunca é silencioso.
 */
const TETO_DE_SALTO_S: number = 0.1;

export class Relogio {
  /** Instante do quadro anterior em ms; `undefined` antes do primeiro quadro. */
  private ultimoMs: number | undefined = undefined;
  private decorrido: number = 0;

  /**
   * O QUE FAZ: recebe o instante (ms) que o `setAnimationLoop` informa e devolve
   *   a amostra deste quadro.
   * POR QUE USAR O INSTANTE QUE O LAÇO INFORMA (e não `performance.now()` aqui):
   *   é o mesmo relógio que o navegador/sessão usa para agendar o quadro.
   */
  public avancar(instanteMs: number): Amostra {
    const anterior: number | undefined = this.ultimoMs;
    this.ultimoMs = instanteMs;

    // PRIMEIRO QUADRO: não há anterior, então delta = ZERO.
    // OUTRA OPÇÃO: inventar "1/60 s". POR QUE NÃO: a cena já nasceria andando —
    // um solavanco justamente na primeira imagem. Com zero, o primeiro quadro
    // mostra o estado inicial, que é o que alguém escreveu de propósito.
    if (anterior === undefined) {
      return { delta: 0, decorrido: 0, intervaloReal: 0, saltoDescartado: false };
    }

    const intervaloReal: number = (instanteMs - anterior) / 1000; // ms → s
    const saltoDescartado: boolean = intervaloReal > TETO_DE_SALTO_S;
    const delta: number = saltoDescartado ? TETO_DE_SALTO_S : intervaloReal;
    this.decorrido += delta;
    // Devolvemos também `intervaloReal` e `saltoDescartado`: não servem para
    // animar, servem para que se saiba DEPOIS que o salto foi visto e recusado.
    // Um relógio que só cortasse em silêncio apagaria a informação.
    return { delta, decorrido: this.decorrido, intervaloReal, saltoDescartado };
  }

  /**
   * O QUE FAZ: zera o relógio.
   * POR QUE PRECISAMOS: ao parar e retomar o laço, o primeiro quadro de volta
   *   mediria o tempo inteiro em que ficou parado (que pode ser meia hora).
   */
  public reiniciar(): void {
    this.ultimoMs = undefined;
    this.decorrido = 0;
  }
}
