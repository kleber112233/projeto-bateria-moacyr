// ===========================================================================
// laco.ts — O LAÇO DE RENDERIZAÇÃO (passo 9)
// ===========================================================================
//
// O QUE É
//   O "laço": a função que roda uma vez por quadro, dezenas de vezes por
//   segundo, e redesenha a cena.
//
// O QUE FAZ
//   Em cada quadro, nesta ordem:
//     1. ajusta o tamanho do desenho ao canvas;
//     2. mede o tempo desde o quadro anterior (relógio);
//     3. avança a cena (roda os "passos" registrados: animação, painel...);
//     4. desenha;
//     5. mede o custo do quadro que acabou de sair e registra no orçamento.
//
// COMO FAZ
//   `renderer.setAnimationLoop(quadro)` — o Three.js chama `quadro` a cada
//   imagem nova.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   `window.requestAnimationFrame`, o jeito tradicional de animar páginas.
//
// POR QUE ESTA E NÃO A OUTRA
//   Dentro de uma sessão imersiva o `requestAnimationFrame` da JANELA não é
//   chamado: o visor tem cadência própria e quem entrega os quadros é a
//   SESSÃO. A cena ficaria congelada no visor, com a página respondendo
//   normalmente e o console sem erro nenhum. O `setAnimationLoop` troca de
//   fonte sozinho quando a sessão começa. Adotar agora custa nada e evita o
//   retrabalho nos módulos de VR/AR (Cap. 3, seção 1.4.1).
//
// POR QUE A ORDEM IMPORTA
//   - Desenhar ANTES de avançar mostraria sempre o estado do quadro anterior:
//     um quadro de atraso que, no visor, soma à latência que o aparelho já tem.
//   - Medir o tempo DEPOIS de avançar faria cada passo usar a medida do quadro
//     anterior: certo em média, errado em cada instante.
//   - Medir o custo é a única etapa que PRECISA ficar no fim (ver abaixo).
//
// POR QUE PRECISAMOS
//   Sem laço não há animação nem medição de custo. E a lista de passos deixa
//   acrescentar comportamento sem editar este arquivo.
//
// BASE NO MATERIAL
//   Cap. 3, seção 1.4.1 ("A fonte de quadros e a sequência dentro deles").
//   Projeto do professor: src/bancada/core/laco.ts.
// ===========================================================================

import type { Scene } from 'three';

import type { Palco } from './palco';
import type { Amostra, Relogio } from './relogio';
import type { Orcamento } from './orcamento';

/**
 * O QUE É: um comportamento que roda a cada quadro, antes de desenhar.
 * O SEGUNDO PARÂMETRO: o quadro da sessão XR. Só existe dentro de sessão
 *   imersiva — fora dela o Three.js chama com um argumento a menos, então o
 *   tipo declara `| undefined` para o compilador obrigar a conferir.
 *   ATENÇÃO para os próximos módulos: esse objeto vale só DURANTE o quadro;
 *   guardá-lo para usar depois dá exceção.
 */
export type PassoDoQuadro = (amostra: Amostra, quadroXR: XRFrame | undefined) => void;

export interface Laco {
  /** Acrescenta um comportamento ao quadro SEM editar este arquivo. */
  aoPasso(passo: PassoDoQuadro): void;
  iniciar(): void;
  parar(): void;
}

/**
 * POR QUE O LAÇO RECEBE PALCO, CENA, RELÓGIO E ORÇAMENTO PRONTOS: cada um é
 *   um módulo que ignora os outros (Cap. 3, seção 1.6). O laço só os coordena.
 */
export function montarLaco(palco: Palco, cena: Scene, relogio: Relogio, orcamento: Orcamento): Laco {
  const passos: PassoDoQuadro[] = [];

  function quadro(instanteMs: number, quadroXR: XRFrame | undefined): void {
    const inicio: number = performance.now(); // começo do NOSSO trabalho

    palco.ajustar(); // 1
    const amostra: Amostra = relogio.avancar(instanteMs); // 2
    for (const passo of passos) {
      passo(amostra, quadroXR); // 3
    }
    palco.desenhar(cena); // 4

    // 5 — MEDIDO DEPOIS DE DESENHAR: o Three.js zera as contagens de desenho
    // (`renderer.info`) no começo de cada render. Lendo aqui, lemos o quadro que
    // acabou de sair; lendo antes, leríamos o anterior — diferença que ninguém
    // nota e que estraga qualquer diagnóstico.
    const custoMs: number = performance.now() - inicio;
    orcamento.registrar(
      custoMs,
      amostra.intervaloReal * 1000, // s → ms
      palco.renderer.info.render.calls,
      palco.renderer.info.render.triangles,
      amostra.saltoDescartado, // o corte do relógio fica registrado, não some
    );
  }

  return {
    aoPasso(passo: PassoDoQuadro): void {
      passos.push(passo);
    },
    iniciar(): void {
      palco.renderer.setAnimationLoop(quadro);
    },
    parar(): void {
      palco.renderer.setAnimationLoop(null);
      relogio.reiniciar(); // senão o 1º quadro de volta mediria o tempo parado
    },
  };
}
