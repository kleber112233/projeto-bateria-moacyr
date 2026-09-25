// ===========================================================================
// ligacao.ts — MOSTRAR NA CENA QUE UMA PEÇA ESTÁ PRESA À PLATAFORMA
// ===========================================================================
//
// O QUE É
//   Um marcador visual de parentesco: uma linha amarela do centro da
//   plataforma até a peça fixada, e um anel amarelo no chão em volta da peça.
//
// O QUE FAZ
//   Liga quando a peça passa a ser filha da plataforma e desliga quando ela é
//   solta. Como a linha é FILHA DA PLATAFORMA e o anel é FILHO DA PEÇA, os dois
//   acompanham qualquer movimento sem código nenhum de sincronização.
//
// COMO FAZ
//   `Line` (dois pontos) pendurada na plataforma, com o ponto final na posição
//   LOCAL da peça — que, depois da troca de pai, está justamente no sistema de
//   coordenadas da plataforma. `Mesh` com `RingGeometry` pendurada na peça.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Não mostrar nada (a troca de pai não move a peça, então a tela não muda).
//   b) Mudar a cor da peça fixada.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) A troca de pai é invisível por natureza — "posse não é posição"
//      (Cap. 3, seção 1.3). Na demonstração isso parece "o botão não fez nada".
//      O professor resolve com o eixo girando (a peça presa passa a orbitar);
//      a nossa cena não tem nada girando, então desenhamos a posse.
//   b) O bumbo divide o material "casco" com os toms e a caixa (materiais
//      compartilhados, Cap. 4). Mudar a cor mudaria todos — ou exigiria um
//      material a mais só para isso.
//
// POR QUE PRECISAMOS
//   Para o item 3 da demonstração ser VISTO: o bumbo troca de pai, continua
//   onde estava (a linha mostra que ele pode estar fora da plataforma e mesmo
//   assim preso a ela — reparentar não é encaixar), e ao mover a plataforma
//   linha, anel e bumbo vão juntos.
//
// POR QUE A LINHA NÃO TEM NOME
//   Só nós do domínio têm nome, e a árvore impressa na página mostra apenas
//   nós com nome: o marcador é instrumento de visualização, não objeto da cena.
// ===========================================================================

import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  Vector3,
} from 'three';

/** Amarelo: destaca sobre o chão escuro e a madeira da plataforma. */
const COR_DA_LIGACAO: number = 0xffd24a;

/** Altura da linha e do anel acima do chão, em metros: logo acima do piso da plataforma (5 cm). */
const ALTURA_DO_MARCADOR_M: number = 0.06;

export interface LigacaoDeParentesco {
  /** Mostra a ligação entre `pai` e `filho` (o filho já deve ser filho do pai). */
  ligar(pai: Object3D, filho: Object3D, raioDoAnel: number): void;
  /** Esconde a ligação (a peça foi solta). */
  desligar(): void;
}

export function montarLigacao(): LigacaoDeParentesco {
  // Linha de 2 pontos: [origem do pai] → [posição local do filho].
  // Material básico (sem luz): marcador não deve mudar com a iluminação.
  const pontos: Float32Array = new Float32Array(6);
  const geometria: BufferGeometry = new BufferGeometry();
  geometria.setAttribute('position', new BufferAttribute(pontos, 3));
  const linha: Line = new Line(geometria, new LineBasicMaterial({ color: COR_DA_LIGACAO }));
  linha.visible = false;

  // Anel no chão em volta da peça: RingGeometry nasce em pé; deitamos no chão.
  const materialDoAnel: MeshBasicMaterial = new MeshBasicMaterial({ color: COR_DA_LIGACAO });
  let anel: Mesh | undefined;

  /**
   * O QUE FAZ: tira o anel da cena E devolve a geometria dele à placa de vídeo.
   * POR QUE O `dispose`: tirar da árvore não libera nada; a geometria continua
   *   ocupando memória na placa até alguém chamar `dispose()`. Como cada
   *   `ligar` cria um anel novo (o raio muda com a peça), clicar em fixar e
   *   soltar várias vezes acumularia geometrias esquecidas. O material é um
   *   só, reaproveitado, e por isso fica.
   */
  function descartarAnel(): void {
    if (anel === undefined) {
      return;
    }
    anel.removeFromParent();
    anel.geometry.dispose();
    anel = undefined;
  }

  return {
    ligar(pai: Object3D, filho: Object3D, raioDoAnel: number): void {
      // A posição do filho JÁ está no sistema do pai (é o que a troca de pai
      // calculou), então ela é exatamente o ponto final da linha.
      const destino: Vector3 = filho.position;
      pontos.set([0, ALTURA_DO_MARCADOR_M, 0, destino.x, ALTURA_DO_MARCADOR_M, destino.z]);
      geometria.attributes.position.needsUpdate = true; // avisa a placa que os pontos mudaram
      geometria.computeBoundingSphere(); // sem isto o Three.js pode achar que a linha está fora da tela
      pai.add(linha);
      linha.visible = true;

      descartarAnel();
      anel = new Mesh(new RingGeometry(raioDoAnel, raioDoAnel + 0.03, 40), materialDoAnel);
      anel.rotation.x = -Math.PI / 2;
      anel.position.y = 0.005; // milímetros acima do chão, para não "brigar" com ele no desenho
      filho.add(anel);
    },
    desligar(): void {
      linha.visible = false;
      descartarAnel();
    },
  };
}
