// ===========================================================================
// painel.ts — O INDICADOR DE CUSTO DENTRO DA CENA (passo 9)
// ===========================================================================
//
// O QUE É
//   Um cartaz 3D (uma haste com um retângulo no alto) preso à plataforma, que
//   mostra o custo do quadro e o tempo da cena.
//
// O QUE FAZ
//   Recebe linhas de texto e as desenha numa textura aplicada ao retângulo —
//   no máximo 4 vezes por segundo.
//
// COMO FAZ
//   Desenha o texto num <canvas> 2D escondido e usa esse canvas como textura
//   (`CanvasTexture`) de um plano. (Técnica de Three.js, fora do material.)
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Um texto em HTML sobreposto ao canvas (um "HUD" no canto da tela).
//
// POR QUE ESTA E NÃO A OUTRA
//   No visor NÃO existe "canto da tela": existe um campo de visão que
//   acompanha a cabeça, e texto grudado nele fica a poucos centímetros dos
//   olhos, sempre presente e desconfortável em minutos. Preso à plataforma, o
//   painel é um objeto do mundo (DIEGÉTICO): quem quer ler olha para ele;
//   aproximar aumenta o texto (Cap. 3, seção 1.6.2). E o enunciado pede o
//   indicador "visível DENTRO da cena".
//
// POR QUE PRECISAMOS
//   Passo 9, item 4 da demonstração: "o indicador de custo do quadro está
//   visível dentro da cena".
//
// BASE NO MATERIAL
//   Cap. 3, seções 1.5.2 e 1.6.2 (painel preso à bancada; atualização algumas
//   vezes por segundo, não a cada quadro). Projeto do professor:
//   src/bancada/ui/painel.ts.
// ===========================================================================

import { CanvasTexture, CylinderGeometry, Group, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

/**
 * Tamanho físico do cartaz: 1,2 × 0,7 m.
 * POR QUE ESSE TAMANHO: a câmera inicial da janela fica a uns 4,5 m do cartaz.
 * OUTRA OPÇÃO: um cartaz menor, de 60 × 34 cm, do tamanho de uma placa de
 *   estante. POR QUE NÃO: a essa distância ele apareceria com uns 80 pixels de
 *   largura, e o texto não se leria sem aproximar. Com 1,2 m e cinco linhas,
 *   cada linha fica com letra de leitura já na primeira imagem. No visor,
 *   1,2 m na borda de uma plataforma de 1,5 m ainda é um cartaz de palco, não
 *   uma parede.
 * COMPARADO AO PROJETO DO PROFESSOR: o cartaz dele tem 62 × 34 cm, e serve
 *   porque a câmera da Bancada fica a 1,5 m da mesa. A bateria é espalhada
 *   (anel de peças de 1,5 m de raio) e a câmera precisa ficar três vezes mais
 *   longe; o cartaz cresceu na mesma proporção. A técnica (canvas 2D como
 *   textura, redesenho 4 vezes por segundo, preso à peça e não à câmera) é a
 *   mesma.
 */
const LARGURA_M: number = 1.2;
const ALTURA_M: number = 0.7;
/** Altura da base do cartaz acima do piso: a borda de cima fica em 1,5 m, perto do olho de quem está de pé. */
const ALTURA_DE_LEITURA_M: number = 0.8;
/** Resolução da textura: 1000 px por metro, mesma proporção do cartaz (texto nítido sem desperdício). */
const LARGURA_PX: number = 1200;
const ALTURA_PX: number = 700;

/**
 * O QUE É: o intervalo mínimo entre dois redesenhos: 0,25 s (4 por segundo).
 * POR QUE NÃO A CADA QUADRO: (1) escrever texto numa textura e enviá-la à placa
 *   de vídeo está entre as operações MAIS CARAS de um quadro — um painel que
 *   estourasse o orçamento enquanto mede o orçamento "produziria um número
 *   sobre si mesmo" (Cap. 3); (2) número que muda 60 vezes por segundo não se lê.
 */
const INTERVALO_DE_REDESENHO_S: number = 0.25;

export interface Painel {
  /** O nó a prender na cena: a haste com o cartaz no alto. */
  readonly no: Group;
  /** Entrega o texto; o redesenho só acontece quando vale a pena. */
  atualizar(linhas: readonly string[], decorridoS: number): void;
}

export function montarPainel(titulo: string): Painel {
  // O canvas 2D onde o texto é desenhado (nunca aparece na página).
  const tela: HTMLCanvasElement = document.createElement('canvas');
  tela.width = LARGURA_PX;
  tela.height = ALTURA_PX;
  const ctx: CanvasRenderingContext2D | null = tela.getContext('2d');
  if (ctx === null) {
    throw new Error('Este navegador não fornece contexto 2D para desenhar o painel.');
  }
  // Cópia em constante: o `if` acima garante que não é null, mas essa garantia
  // do compilador não "entra" nas funções internas abaixo.
  const pincel: CanvasRenderingContext2D = ctx;

  const textura: CanvasTexture = new CanvasTexture(tela);
  // Sem mipmaps + filtro linear: texto lido de longe BORRA em vez de CINTILAR,
  // que é o defeito menos ruim dos dois; e poupa gerar mipmaps a cada redesenho.
  textura.minFilter = LinearFilter;
  textura.generateMipmaps = false;
  // O canvas 2D guarda cores em sRGB (o espaço das cores da web). Sem avisar
  // o Three.js, ele trata os valores como lineares e o texto sai lavado,
  // com o fundo escuro virando cinza.
  textura.colorSpace = SRGBColorSpace;

  const no: Group = new Group();
  no.name = 'painel';

  // Haste fina até o piso: sem ela o cartaz parece flutuar e se perde a leitura
  // de que ele está PRESO à plataforma.
  const haste: Mesh = new Mesh(
    new CylinderGeometry(0.01, 0.01, ALTURA_DE_LEITURA_M, 8),
    new MeshBasicMaterial({ color: 0x555a66 }),
  );
  haste.position.y = ALTURA_DE_LEITURA_M / 2;
  no.add(haste);

  // MeshBasicMaterial = material que NÃO recebe luz. POR QUE: painel que
  // escurece quando a luz muda de lugar deixa de ser instrumento de leitura.
  const cartaz: Mesh = new Mesh(new PlaneGeometry(LARGURA_M, ALTURA_M), new MeshBasicMaterial({ map: textura }));
  cartaz.position.y = ALTURA_DE_LEITURA_M + ALTURA_M / 2;
  no.add(cartaz);

  let ultimoDesenho: number = Number.NEGATIVE_INFINITY; // força o primeiro desenho
  let ultimoTexto: string = '';

  /** Pinta o fundo, o título e as linhas; depois avisa o Three.js que a textura mudou. */
  function desenhar(linhas: readonly string[]): void {
    pincel.fillStyle = '#11131a';
    pincel.fillRect(0, 0, LARGURA_PX, ALTURA_PX);
    pincel.fillStyle = '#f2f4fa';
    // Letra grande (76 px de 700 = 11% da altura do cartaz) e no máximo cinco
    // linhas: é o que cabe para ser lido da câmera inicial da janela.
    pincel.font = 'bold 88px system-ui, sans-serif';
    pincel.fillText(titulo, 40, 100);
    pincel.font = '76px system-ui, sans-serif';
    let y: number = 208;
    for (const linha of linhas) {
      if (y > ALTURA_PX - 10) {
        break; // não escreve fora do cartaz
      }
      pincel.fillText(linha, 40, y, LARGURA_PX - 80); // o último argumento encolhe a linha que passaria da borda
      y += 112;
    }
    textura.needsUpdate = true; // sem isto a placa continua com a imagem antiga
  }

  desenhar(['Aguardando o primeiro quadro.']);

  return {
    no,
    /**
     * POR QUE DOIS FILTROS (tempo E texto igual): pelo tempo, no máximo 4/s;
     *   pelo texto, nem redesenha se nada mudou.
     * POR QUE USA `decorridoS` (tempo da cena) E NÃO O RELÓGIO DO SISTEMA: o
     *   painel segue o mesmo relógio que o resto da cena.
     */
    atualizar(linhas: readonly string[], decorridoS: number): void {
      // Se o tempo da cena voltou para trás (o relógio foi reiniciado ao parar
      // e retomar o laço), o último desenho ficou "no futuro" e o painel
      // congelaria até o tempo alcançá-lo. Voltar a marca resolve.
      if (decorridoS < ultimoDesenho) {
        ultimoDesenho = Number.NEGATIVE_INFINITY;
      }
      const texto: string = linhas.join('\n');
      if (decorridoS - ultimoDesenho < INTERVALO_DE_REDESENHO_S || texto === ultimoTexto) {
        return;
      }
      ultimoDesenho = decorridoS;
      ultimoTexto = texto;
      desenhar(linhas);
    },
  };
}
