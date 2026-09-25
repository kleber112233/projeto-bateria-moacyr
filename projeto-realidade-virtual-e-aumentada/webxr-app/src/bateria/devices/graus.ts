// ===========================================================================
// graus.ts — QUANTOS GRAUS DE LIBERDADE O APARELHO RASTREIA (passo 5)
// ===========================================================================
//
// O QUE É
//   A inferência de "3 ou 6 graus de liberdade" e a classificação do aparelho
//   (PC, celular, visor com ou sem posição).
//
//   Graus de liberdade = quantos números independentes descrevem a POSE de um
//   corpo: 3 de posição (x, y, z) + 3 de orientação. Um aparelho de 3 graus
//   sabe para onde a cabeça APONTA, mas não para onde ela VAI. Com 3 graus,
//   dar um passo não move a cena — o ouvido sente o deslocamento, os olhos
//   não, e vem o enjoo (Cap. 2, seções 1.1 e 1.2).
//
// O QUE FAZ
//   A partir das poses observadas pela sonda, devolve 'tres', 'seis' ou
//   'indeterminado', e classifica o aparelho numa das sete classes.
//
// COMO FAZ
//   A API não tem um campo "graus de liberdade". O que ela tem, pose a pose, é
//   `XRPose.emulatedPosition`: verdadeiro quando a POSIÇÃO foi CALCULADA por
//   um modelo (de pescoço, de braço) em vez de MEDIDA por sensor. Uma única
//   pose com posição medida só pode vir de um aparelho de 6 graus.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Inferir pelos espaços de referência concedidos ("ganhou local-floor, logo
//   sabe onde está o chão, logo tem 6 graus"). É o caminho que o Cap. 2 do
//   livro mostra.
//
// POR QUE ESTA E NÃO A OUTRA
//   A especificação WebXR obriga quem concede 'local' a conceder também
//   'local-floor', ESTIMANDO a altura do chão se preciso. Até um visor que só
//   gira ganha 'local-floor', e a regra pelos espaços diria "seis graus" para
//   ele. O `emulatedPosition` não tem esse problema, e é também o que o projeto
//   de referência do professor usa.
//
// POR QUE PRECISAMOS
//   A tarefa pede que a sonda informe quantos graus o aparelho rastreia. E, lá
//   na frente, um aparelho de 3 graus não pode receber uma cena que dependa de
//   andar até as peças (seção 5 da especificação: alcance de 90 cm).
//
// BASE NO MATERIAL
//   Cap. 2, seções 1.1, 1.2 e 1.2.1 ("a pergunta que a plataforma se recusa a
//   responder"); projeto do professor, src/bancada/devices/graus.ts (versão
//   com emulatedPosition). Ressalva do Cap. 2: a função devolve uma LEITURA,
//   não um veredito. O campo `interactionMode` usado na classificação é do
//   módulo de AR da especificação WebXR, fora do material.
// ===========================================================================

import type { Suporte } from '../modes/verificacao';

/** Três valores: quando a evidência não decide, dizemos isso em vez de apostar. */
export type GrausDeLiberdade = 'tres' | 'seis' | 'indeterminado';

/**
 * O QUE É: a classe do aparelho, deduzida do que ele FAZ.
 * OUTRA OPÇÃO: ler o nome no userAgent. POR QUE NÃO: é editável, imitado e
 *   envelhece a cada versão; o que a sessão concede é o que o aparelho faz
 *   agora, na mão de quem está usando (Cap. 2, seção 1.5).
 * POR QUE DUAS CLASSES "SEM CERTEZA" ('inconclusivo' e 'imersivo-sem-leitura'):
 *   uma classificação só pode afirmar o que a evidência sustenta. Quando o
 *   navegador não respondeu, ou quando a sessão não entregou pose nem forma de
 *   interação, a classe diz isso, em vez de escolher o palpite mais provável.
 */
export type ClasseDeAparelho =
  | 'sem-api'
  | 'inconclusivo'
  | 'somente-janela'
  | 'aparelho-de-mao-com-camera'
  | 'aparelho-de-mao-provavel'
  | 'visor-sem-posicao'
  | 'visor-com-posicao'
  | 'imersivo-sem-leitura';

/** O que a sonda contou nos quadros observados. */
export interface LeituraDasPoses {
  /** Quadros em que a sessão entregou a pose de quem observa. */
  readonly posesObservadas: number;
  /** Dessas, quantas vieram com a posição calculada e não medida. */
  readonly posesComPosicaoEmulada: number;
}

/**
 * O QUE FAZ: a regra da inferência, escrita por extenso para poder ser contestada:
 *   - nenhuma pose observada → `indeterminado`;
 *   - pelo menos uma pose com posição MEDIDA → `seis`;
 *   - todas emuladas → `tres`.
 * LIMITE CONHECIDO: um visor de 6 graus que perdeu o rastreamento a janela
 *   inteira (sala escura, câmeras tapadas) também entrega só poses emuladas.
 *   De dentro da página os dois casos são iguais — por isso o relatório mostra
 *   as duas contagens ao lado da conclusão.
 */
export function grausDeLiberdade(leitura: LeituraDasPoses): GrausDeLiberdade {
  if (leitura.posesObservadas === 0) {
    return 'indeterminado';
  }
  return leitura.posesComPosicaoEmulada < leitura.posesObservadas ? 'seis' : 'tres';
}

/**
 * O QUE É: tudo o que a classificação leva em conta, num objeto só.
 * POR QUE UM OBJETO E NÃO QUATRO PARÂMETROS SOLTOS: com parâmetros do mesmo
 *   tipo em fila, trocar dois de lugar compila sem erro e classifica errado.
 *   Com nomes, cada evidência chega no campo certo.
 */
export interface EvidenciaDoAparelho {
  readonly temApiXr: boolean;
  /** Resposta da consulta `isSessionSupported('immersive-vr')`. */
  readonly vr: Suporte;
  /** Resposta da consulta `isSessionSupported('immersive-ar')`. */
  readonly ar: Suporte;
  /** O que as poses observadas indicam ('indeterminado' se não houve sessão). */
  readonly graus: GrausDeLiberdade;
  /**
   * Como a pessoa interage com a sessão AR, segundo o próprio aparelho:
   *   'screen-space' = tela na mão (celular, tablet);
   *   'world-space'  = aparelho vestido (visor).
   * `undefined` quando não houve sessão AR ou o navegador não informa.
   */
  readonly modoDeInteracao: XRInteractionMode | undefined;
}

/**
 * O QUE FAZ: classifica o aparelho a partir da evidência.
 * AS REGRAS, NA ORDEM:
 *   1. sem `navigator.xr` → 'sem-api';
 *   2. nenhum modo imersivo respondeu 'sim':
 *      - se alguma consulta ficou sem resposta → 'inconclusivo' (falta de
 *        resposta não é prova de ausência);
 *      - se as duas responderam 'não' → 'somente-janela';
 *   3. a sessão AR informou 'screen-space' → 'aparelho-de-mao-com-camera';
 *   4. sem essa informação, AR sim e VR não → 'aparelho-de-mao-provavel'.
 *      É uma HIPÓTESE, e a classe diz isso no nome: aceitar AR não prova o
 *      formato físico do aparelho (um óculos de AR também aceita AR e pode
 *      não aceitar VR). Só o `interactionMode` confirma;
 *   5. o resto é aparelho vestido ou sem leitura, conforme os graus:
 *      'tres' → 'visor-sem-posicao'; 'seis' → 'visor-com-posicao';
 *      'indeterminado' → 'imersivo-sem-leitura'.
 * OUTRA OPÇÃO: decidir só pelos modos: "AR sem VR é celular, o resto é visor".
 * POR QUE NÃO: essa regra depende de o celular responder 'não' para VR, e há
 *   celulares que respondem 'sim' (VR de papelão). Com ela, um celular assim
 *   seria classificado como "visor". O `interactionMode` é a resposta que o
 *   próprio aparelho dá para exatamente essa pergunta.
 * COMPARADO AO PROJETO DO PROFESSOR: a regra pelos modos é a dele ("aparelho
 *   que faz AR e não faz VR é o celular"), e ela continua aqui como passo 4,
 *   agora marcada como hipótese. O que acrescentamos foi a leitura do
 *   `interactionMode` antes dela e as duas classes sem certeza, porque a
 *   nossa classe decide depois se a bateria vai para o chão pelo celular.
 */
export function classificarAparelho(e: EvidenciaDoAparelho): ClasseDeAparelho {
  if (!e.temApiXr) {
    return 'sem-api';
  }
  if (e.vr !== 'sim' && e.ar !== 'sim') {
    return e.vr === 'desconhecido' || e.ar === 'desconhecido' ? 'inconclusivo' : 'somente-janela';
  }
  if (e.modoDeInteracao === 'screen-space') {
    return 'aparelho-de-mao-com-camera';
  }
  if (e.modoDeInteracao === undefined && e.ar === 'sim' && e.vr !== 'sim') {
    return 'aparelho-de-mao-provavel';
  }
  switch (e.graus) {
    case 'tres':
      return 'visor-sem-posicao';
    case 'seis':
      return 'visor-com-posicao';
    case 'indeterminado':
      return 'imersivo-sem-leitura';
  }
}

/** Frase legível para cada classe, usada no topo do relatório da sonda. */
export function descreverClasse(classe: ClasseDeAparelho): string {
  switch (classe) {
    case 'sem-api':
      return 'Navegador sem WebXR, ou página fora de contexto seguro.';
    case 'inconclusivo':
      return 'O navegador tem WebXR, mas não respondeu se aceita os modos imersivos. Não dá para dizer o que este aparelho oferece.';
    case 'somente-janela':
      return 'Aparelho que só abre o modo janela, como o PC do laboratório.';
    case 'aparelho-de-mao-com-camera':
      return 'Aparelho de mão que desenha a cena sobre a imagem da própria câmera. A própria sessão informou que é segurado na mão.';
    case 'aparelho-de-mao-provavel':
      return 'Provavelmente um aparelho de mão com câmera: aceita AR e não aceita VR. É uma hipótese, porque a sessão não informou a forma de interação que confirmaria isso.';
    case 'visor-sem-posicao':
      return 'Visor em que todas as poses observadas vieram com a posição emulada: ou ele só acompanha a rotação da cabeça, ou perdeu o rastreamento durante a observação.';
    case 'visor-com-posicao':
      return 'Visor que acompanha rotação e deslocamento.';
    case 'imersivo-sem-leitura':
      return 'Aparelho com modo imersivo, mas não houve leitura de pose nem da forma de interação (a sessão foi recusada ou não entregou esses dados). Não dá para dizer se é visor ou celular, nem quantos graus ele rastreia.';
  }
}
