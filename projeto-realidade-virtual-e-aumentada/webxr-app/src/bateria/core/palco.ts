// ===========================================================================
// palco.ts — SUPERFÍCIE DE DESENHO, CÂMERA E AJUSTE DE TAMANHO (passo 7)
// ===========================================================================
//
// O QUE É
//   O "palco": o renderer do Three.js (quem desenha no canvas), a câmera
//   (de onde se olha) e a órbita com o mouse.
//
// O QUE FAZ
//   Cria o renderer ligado ao <canvas id="cena">, posiciona a câmera, ajusta o
//   tamanho do desenho ao canvas e desenha a cena quando o laço pede.
//
// COMO FAZ
//   `WebGLRenderer` + `PerspectiveCamera` + `OrbitControls` (do Three.js).
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Criar renderer e câmera dentro do main.ts ou dentro da cena.
//
// POR QUE ESTA E NÃO A OUTRA
//   O palco sabe desenhar e NÃO sabe o que é uma bateria. Essa ignorância é o
//   que deixa trocar o jeito de desenhar (ex.: entrar na sessão imersiva nos
//   próximos módulos) sem tocar na cena (Cap. 3, seção 1.6: "o palco sabe
//   desenhar e não sabe o que é uma bancada").
//
// POR QUE PRECISAMOS
//   Sem ele não há imagem; e a forma como ele ajusta o tamanho e limita a
//   densidade de pixels pesa direto no orçamento do quadro (passo 9).
//
// BASE NO MATERIAL
//   Cap. 3, seções 1.4 e 1.6; projeto do professor, src/bancada/core/palco.ts.
//   OrbitControls é do Three.js (fora do material) e foi escolhido porque a
//   especificação, seção 9, diz que no regime de janela se olha com "câmera
//   orbital controlada por mouse".
// ===========================================================================

import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * O QUE É: o máximo de pixels físicos por pixel de tela que vamos desenhar.
 * POR QUE PRECISAMOS: telas densas (celular, notebook "retina") pedem 3×. O
 *   custo de desenhar cresce com a ÁREA: 3× custa 2,25 vezes o trabalho de 2×,
 *   por um ganho que quase não se vê. As máquinas do laboratório têm vídeo
 *   integrado, e é aqui que o orçamento estouraria primeiro.
 * OUTRA OPÇÃO: usar `window.devicePixelRatio` sem limite. POR QUE NÃO: seria
 *   deixar o aparelho decidir o nosso custo.
 */
const DENSIDADE_MAXIMA: number = 2;

/** O que o palco oferece ao resto do programa. */
export interface Palco {
  readonly renderer: WebGLRenderer;
  readonly camera: PerspectiveCamera;
  /** Acerta o buffer de desenho ao tamanho do canvas. Devolve true se mudou. */
  ajustar(): boolean;
  desenhar(cena: Scene): void;
}

export function montarPalco(canvas: HTMLCanvasElement): Palco {
  // `antialias: true` suaviza as bordas serrilhadas; o custo é pequeno numa
  // cena de poucas formas.
  const renderer: WebGLRenderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DENSIDADE_MAXIMA));

  // CÂMERA: 55° de abertura vertical; enxerga de 5 cm a 50 m.
  // Posição: 2,3 m de altura e 3,6 m à frente do centro da plataforma — um
  // pouco acima e atrás de quem chega de pé, para caber na tela a plataforma
  // inteira E o anel de peças soltas (raio 1,5 m) sem cortar as mais próximas.
  // Números em metros, como o resto da cena. A rodinha do mouse aproxima.
  const camera: PerspectiveCamera = new PerspectiveCamera(55, 16 / 9, 0.05, 50);
  camera.position.set(0, 2.3, 3.6);

  // ÓRBITA COM O MOUSE (arrastar gira, rodinha aproxima).
  // OUTRA OPÇÃO: câmera fixa, como no projeto do professor — ele fixa para que
  // o movimento da câmera não se confunda com o movimento da hierarquia.
  // POR QUE AQUI TEM ÓRBITA: a nossa especificação promete câmera orbital no
  // regime de janela (seção 9), e a cena da bateria é espalhada (anel de 1,5 m
  // em volta da plataforma). Sem amortecimento (damping), a câmera só muda
  // quando alguém arrasta; parada, ela não disputa atenção com a cena.
  const orbita: OrbitControls = new OrbitControls(camera, canvas);
  orbita.target.set(0, 0.35, -0.1); // mira o centro da plataforma, um pouco acima do piso
  orbita.update();

  /**
   * O QUE FAZ: garante que o buffer de desenho tem o tamanho do canvas na tela.
   * POR QUE A CADA QUADRO E NÃO NO EVENTO `resize` DA JANELA: o evento cobre um
   *   caso só; o canvas também muda por CSS, pelo celular girado, e ao sair de
   *   uma sessão imersiva (que não dispara evento de janela). Comparar dois
   *   números por quadro é mais barato do que rastrear todos esses eventos
   *   (Cap. 3, seção 1.4.1).
   * COMO FAZ, E A ARMADILHA DA DENSIDADE: o Three.js guarda a densidade
   *   (`setPixelRatio`) e, em `setSize(largura, altura)`, recebe o tamanho em
   *   pixels de TELA (CSS) e multiplica pela densidade sozinho. Por isso:
   *   - a COMPARAÇÃO usa pixels físicos (tamanho CSS × densidade), porque é
   *     isso que `canvas.width` guarda;
   *   - o `setSize` recebe o tamanho CSS, sem multiplicar.
   *   Passar para o `setSize` um valor já multiplicado aplica a densidade duas
   *   vezes: numa tela de densidade 2 o buffer sai com 4 vezes os pixels
   *   previstos, e como ele nunca bate com a comparação, o `setSize` roda em
   *   TODO quadro, realocando o buffer. Nenhuma das duas coisas aparece num
   *   monitor comum de densidade 1, só no notebook ou celular de outra pessoa.
   * COMPARADO AO PROJETO DO PROFESSOR: o limite de densidade 2, a conferência
   *   a cada quadro e o `false` no `setSize` são dele. Lá o `setSize` recebe o
   *   tamanho já multiplicado pela densidade; num monitor de densidade 1, como
   *   o do laboratório, as duas formas dão o mesmo resultado, e a diferença só
   *   aparece em tela densa. Como o nosso relatório também é aberto no celular,
   *   aqui o `setSize` recebe o tamanho CSS.
   * POR QUE `setPixelRatio` AQUI DENTRO E NÃO SÓ NA CRIAÇÃO: a densidade muda
   *   quando a janela é arrastada para outro monitor, ou com o zoom do
   *   navegador. Relendo a cada quadro, ela acompanha.
   * POR QUE `Math.max(1, ...)`: com o canvas escondido o tamanho CSS é zero, e
   *   um buffer de zero pixels quebra a projeção da câmera (divisão por zero).
   */
  function ajustar(): boolean {
    // Dentro de uma sessão imersiva quem decide o tamanho do buffer é o
    // aparelho, e o Three.js recusa `setSize` com um aviso no console a cada
    // quadro. Hoje nenhuma sessão desenha a cena; a guarda já fica pronta para
    // o módulo em que o visor entrar.
    if (renderer.xr.isPresenting) {
      return false;
    }
    const densidade: number = Math.min(window.devicePixelRatio, DENSIDADE_MAXIMA);
    const larguraCss: number = Math.max(1, canvas.clientWidth);
    const alturaCss: number = Math.max(1, canvas.clientHeight);
    const largura: number = Math.floor(larguraCss * densidade); // pixels físicos
    const altura: number = Math.floor(alturaCss * densidade);
    if (canvas.width === largura && canvas.height === altura) {
      return false;
    }
    renderer.setPixelRatio(densidade);
    // O `false` final impede o Three.js de escrever largura/altura no estilo do
    // canvas: quem manda no tamanho em tela é o CSS (index.html).
    renderer.setSize(larguraCss, alturaCss, false);
    camera.aspect = larguraCss / alturaCss; // sem isso a imagem sai esticada
    camera.updateProjectionMatrix();
    return true;
  }

  /** Desenha a cena vista pela câmera. Chamado pelo laço, uma vez por quadro. */
  function desenhar(cena: Scene): void {
    renderer.render(cena, camera);
  }

  return { renderer, camera, ajustar, desenhar };
}
