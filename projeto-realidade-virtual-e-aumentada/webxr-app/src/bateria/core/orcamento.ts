// ===========================================================================
// orcamento.ts — O TETO DO QUADRO E A MEDIDA CONTRA ELE (passo 9)
// ===========================================================================
//
// O QUE É
//   O orçamento de tempo por quadro: um TETO declarado + uma janela com as
//   medidas dos últimos 120 quadros.
//
//   "Envelope do quadro": um visor a 72 imagens por segundo tem 1000/72 =
//   13,9 ms entre uma imagem e a seguinte. O trabalho que não couber não sai
//   atrasado — ele NÃO SAI, e a imagem anterior aparece de novo (Cap. 3,
//   seção 1.5.1). A queda é em degraus: 15 ms num aparelho de 13,9 ms não
//   roda "um pouco mais lento", roda a METADE das imagens.
//
// O QUE FAZ
//   O laço registra, a cada quadro, o custo, o intervalo, as chamadas de
//   desenho e os triângulos. `ler()` resume a janela; `linhasDoOrcamento()`
//   transforma em texto para a folha de medição, e `linhasDoPainel()` numa
//   versão curta para o painel dentro da cena.
//
// COMO FAZ
//   Dois `Float64Array` de tamanho fixo usados como fila circular.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Não declarar teto agora e otimizar "quando ficar pesado".
//   b) Guardar a média da sessão inteira.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) "Teto declarado depois da cena pronta não é orçamento, é laudo do que já
//      foi gasto" (Cap. 3 e Cap. 5). E sem teto "a primeira cena pesada vira
//      discussão de gosto em vez de conta" (enunciado, passo 9).
//   b) A média da sessão dilui um engasgo de 1 s em minutos de quadros bons: ele
//      some do número enquanto o corpo de quem usava sentiu inteiro. Janela
//      curta + contagem de quadros acima do teto mostram o engasgo na hora.
//
// POR QUE PRECISAMOS
//   Passo 9: "exiba o custo do quadro dentro da própria cena; declare um teto
//   para esse custo" — e "o teto existe antes de haver conteúdo pesado".
//
// BASE NO MATERIAL
//   Cap. 3, seção 1.5 (envelope, as duas metades do teto, custo × intervalo,
//   janela circular); Cap. 5, seção 1.5.1 (teto declarado antes da despesa).
//   Projeto do professor: src/bancada/core/orcamento.ts.
// ===========================================================================

/** Janela (PC): monitor de 60 Hz → 1000 / 60 = 16,7 ms entre duas imagens. */
export const TETO_JANELA_MS: number = 16.7;

/**
 * Visor: meta de 72 imagens por segundo da especificação, seção 10 →
 * 1000 / 72 = 13,9 ms. (O professor usa 90 Hz = 11,1 ms; a nossa
 * especificação declarou 72 fps, a taxa padrão do Quest.)
 */
export const TETO_VISOR_MS: number = 13.9;

/**
 * O QUE É: o teto que a cena respeita — o do VISOR, mesmo desenvolvendo no PC.
 * POR QUE: a mesma cena abre nos dois pela mesma URL. Se coubesse só nos
 *   16,7 ms do PC, estouraria no visor — e lá estourar dá enjoo, não só uma
 *   animação menos lisa.
 * O PREÇO: a versão de PC fica mais modesta do que a máquina aguentaria. O
 *   professor defende a mesma troca ("prefiro pagar em aparência", Cap. 3).
 * POR QUE DOIS TETOS DECLARADOS E NÃO UMA MÉDIA: média entre tetos é um valor
 *   que não corresponde a aparelho nenhum, e não pode ser conferido contra nada.
 */
export const TETO_ADOTADO_MS: number = TETO_VISOR_MS;

/**
 * O QUE É: quantos quadros a janela guarda: 120 ≈ 2 s a 60 Hz.
 * POR QUE 120: poucas dezenas cobrem menos de um segundo e o número "dança";
 *   centenas começam a diluir o engasgo que queremos ver (Cap. 3, seção 1.5.2).
 */
const JANELA_DE_QUADROS: number = 120;

/**
 * O QUE É: quantos quadros do começo ficam FORA da medição: os 5 primeiros.
 * POR QUE: no primeiro quadro a placa de vídeo compila os programas de cada
 *   material (aqui, dezenas de milissegundos) e as texturas sobem pela primeira
 *   vez. É um custo real, mas de UMA vez só, e não do quadro típico. Dentro da
 *   janela de 120 quadros ele ocuparia o "pior custo" e o "acima do teto" por
 *   2 segundos, e uma medição registrada logo ao abrir a página pareceria pior
 *   do que a cena é.
 * POR QUE 5 E NÃO MAIS: a compilação acontece no primeiro desenho; os outros
 *   quatro cobrem o painel e a primeira troca de tamanho do canvas. Descartar
 *   mais esconderia custo que se repete.
 * O QUE NÃO É DESCARTADO: um material novo que aparece depois (a linha amarela
 *   da demonstração, por exemplo) também compila na primeira vez. Esse pico
 *   fica na medição de propósito: é o tipo de engasgo que a pessoa sente.
 * COMPARADO AO PROJETO DO PROFESSOR: lá a janela de medição começa no
 *   primeiro quadro. Na demonstração dele a medição é lida olhando o painel
 *   por alguns segundos, e o pico some sozinho da janela; aqui existe o botão
 *   "Registrar a medição agora", que pode ser clicado logo ao abrir, e o
 *   número salvo não pode carregar a compilação.
 */
const QUADROS_DE_AQUECIMENTO: number = 5;

/** O resumo da janela de medição. */
export interface LeituraDoOrcamento {
  readonly tetoMs: number;
  readonly quadrosMedidos: number;
  /** CUSTO: tempo do NOSSO trabalho por quadro (CPU). É o que dá para cortar. */
  readonly custoMedioMs: number;
  readonly piorCustoMs: number;
  /** INTERVALO: tempo real entre duas imagens. Inclui o que não é nosso (placa, navegador, tela). */
  readonly intervaloMedioMs: number;
  readonly piorIntervaloMs: number;
  /** Quadros cujo CUSTO passou do teto adotado. */
  readonly quadrosAcimaDoTeto: number;
  /**
   * Quadros cujo intervalo passou de 0,1 s e foi cortado pelo relógio. Se este
   * número cresce, a cena está andando mais devagar que o relógio de parede
   * (relogio.ts), e a medição precisa dizer isso.
   */
  readonly quadrosComSaltoCortado: number;
  /** Trabalho PEDIDO (não tempo): se o custo sobe e estes ficam parados, a causa está fora da cena. */
  readonly chamadasDeDesenho: number;
  readonly triangulos: number;
}

/*
 * ONDE DIFERIMOS DO PROFESSOR, E POR QUÊ
 * No projeto dele, o que se compara com o teto é o INTERVALO, porque o teto
 * dele no demo é o do próprio PC (16,7 ms). Aqui o teto adotado é o do visor
 * (13,9 ms) e o monitor do PC atualiza a 60 Hz: o intervalo nunca desce de
 * ~16,7 ms, e compará-lo com 13,9 daria "100% acima do teto" para sempre, sem
 * dizer nada. O que precisa caber no envelope do visor é o NOSSO trabalho —
 * então comparamos o CUSTO.
 * Custo e intervalo são grandezas diferentes (Cap. 3, seção 1.5.2): custo
 * baixo com intervalo alto = gargalo fora do programa. Por isso mostramos as duas.
 * LIMITE CONHECIDO: o custo medido aqui é tempo de CPU; o tempo que a placa de
 * vídeo leva para desenhar não entra nele.
 */
export class Orcamento {
  // Float64Array de tamanho fixo: não cresce, não cria lixo para o coletor.
  private readonly custos: Float64Array = new Float64Array(JANELA_DE_QUADROS);
  private readonly intervalos: Float64Array = new Float64Array(JANELA_DE_QUADROS);
  // 1 = o relógio cortou o intervalo deste quadro; 0 = não cortou.
  private readonly saltos: Uint8Array = new Uint8Array(JANELA_DE_QUADROS);
  private proximo: number = 0; // posição onde entra a próxima medida
  private preenchidos: number = 0; // quantas posições já têm medida
  private chamadas: number = 0;
  private triangulos: number = 0;
  private aquecimentoRestante: number = QUADROS_DE_AQUECIMENTO;

  constructor(private readonly tetoMs: number) {}

  /**
   * O QUE FAZ: guarda o quadro que acabou de sair.
   * COMO FAZ (fila circular): escreve na posição `proximo` e avança; ao chegar
   *   ao fim volta ao começo (`% JANELA`), escrevendo por cima do mais antigo.
   */
  public registrar(
    custoMs: number,
    intervaloMs: number,
    chamadas: number,
    triangulos: number,
    saltoCortado: boolean = false,
  ): void {
    this.chamadas = chamadas;
    this.triangulos = triangulos;
    if (this.aquecimentoRestante > 0) {
      this.aquecimentoRestante -= 1; // quadro de aquecimento: conta o trabalho pedido, não o tempo
      return;
    }
    this.custos[this.proximo] = custoMs;
    this.intervalos[this.proximo] = intervaloMs;
    this.saltos[this.proximo] = saltoCortado ? 1 : 0;
    this.proximo = (this.proximo + 1) % JANELA_DE_QUADROS;
    this.preenchidos = Math.min(this.preenchidos + 1, JANELA_DE_QUADROS);
  }

  /**
   * O QUE FAZ: resume a janela — médias, piores valores e quadros acima do teto.
   * POR QUE O PIOR VALOR: "o corpo registra o engasgo e não registra a média"
   *   (Cap. 5, seção 1.6).
   */
  public ler(): LeituraDoOrcamento {
    let somaCusto: number = 0;
    let somaIntervalo: number = 0;
    let piorCusto: number = 0;
    let piorIntervalo: number = 0;
    let acima: number = 0;
    let saltos: number = 0;
    for (let i: number = 0; i < this.preenchidos; i += 1) {
      const custo: number = this.custos[i] ?? 0;
      const intervalo: number = this.intervalos[i] ?? 0;
      somaCusto += custo;
      somaIntervalo += intervalo;
      piorCusto = Math.max(piorCusto, custo);
      piorIntervalo = Math.max(piorIntervalo, intervalo);
      if (custo > this.tetoMs) {
        acima += 1;
      }
      saltos += this.saltos[i] ?? 0;
    }
    const n: number = Math.max(this.preenchidos, 1); // evita divisão por zero
    return {
      tetoMs: this.tetoMs,
      quadrosMedidos: this.preenchidos,
      custoMedioMs: somaCusto / n,
      piorCustoMs: piorCusto,
      intervaloMedioMs: somaIntervalo / n,
      piorIntervaloMs: piorIntervalo,
      quadrosAcimaDoTeto: acima,
      quadrosComSaltoCortado: saltos,
      chamadasDeDesenho: this.chamadas,
      triangulos: this.triangulos,
    };
  }
}

/**
 * O QUE FAZ: transforma a leitura nas linhas completas da folha de medição.
 * POR QUE MORA AQUI E NÃO NO PAINEL: quem sabe o que cada número significa é
 *   quem mediu, e as duas versões (completa e curta) ficam lado a lado aqui.
 * POR QUE "AINDA SEM QUADROS" EM VEZ DE ZEROS: imprimir 0,0 ms antes de medir
 *   pareceria medição — "seria a única linha mentirosa de uma página inteira de
 *   fatos" (Cap. 5, seção 1.7.3).
 */
export function linhasDoOrcamento(l: LeituraDoOrcamento): string[] {
  if (l.quadrosMedidos === 0) {
    return ['Ainda sem quadros medidos.'];
  }
  const acima: number = Math.round((l.quadrosAcimaDoTeto / l.quadrosMedidos) * 100);
  return [
    `Teto (visor 72 Hz): ${l.tetoMs.toFixed(1)} ms`,
    `Custo: médio ${l.custoMedioMs.toFixed(2)} ms, pior ${l.piorCustoMs.toFixed(2)} ms`,
    `Acima do teto: ${acima}% de ${l.quadrosMedidos} quadros`,
    `Intervalo: médio ${l.intervaloMedioMs.toFixed(1)} ms, pior ${l.piorIntervaloMs.toFixed(1)} ms`,
    `Chamadas de desenho: ${l.chamadasDeDesenho}, triângulos: ${l.triangulos}`,
    `Quadros com salto de tempo cortado (mais de 0,1 s): ${l.quadrosComSaltoCortado}`,
  ];
}

/**
 * O QUE FAZ: a versão CURTA das linhas, para o painel dentro da cena.
 * POR QUE UMA VERSÃO CURTA: o painel é lido de longe, dentro da cena; com
 *   seis linhas a letra fica pequena demais para ler da câmera inicial. No
 *   painel fica o que o passo 9 cobra (o custo do quadro contra o teto); o
 *   intervalo e o trabalho pedido continuam na folha de medição completa.
 */
export function linhasDoPainel(l: LeituraDoOrcamento): string[] {
  if (l.quadrosMedidos === 0) {
    return ['Ainda sem quadros medidos.'];
  }
  const acima: number = Math.round((l.quadrosAcimaDoTeto / l.quadrosMedidos) * 100);
  return [
    `Teto: ${l.tetoMs.toFixed(1)} ms (visor 72 Hz)`,
    `Custo médio: ${l.custoMedioMs.toFixed(2)} ms`,
    `Pior custo: ${l.piorCustoMs.toFixed(2)} ms`,
    `Acima do teto: ${acima}% dos quadros`,
  ];
}
