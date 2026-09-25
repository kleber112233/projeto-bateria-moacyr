// ===========================================================================
// cena.ts — A CENA DA BATERIA MONTADA COMO ÁRVORE (passo 7 da tarefa)
// ===========================================================================
//
// O QUE É
//   A construção da cena: luzes, chão, plataforma e as 15 peças do domínio,
//   organizadas como uma ÁRVORE de nós (grafo de cena).
//
//   Grafo de cena: cada nó guarda posição, rotação e escala em relação ao PAI,
//   e não ao mundo. A posição no mundo é CALCULADA multiplicando as
//   transformações de todos os nós no caminho até a raiz. Por isso, mover um
//   nó move tudo o que está abaixo dele sem ninguém somar coordenada (Cap. 3,
//   seção 1.1.1).
//
// O QUE FAZ
//   Monta esta árvore (cada nome abaixo é um nó da cena):
//
//     sala
//     ├── luz-ambiente, luz-direcional
//     ├── chao                      ← peças SOLTAS (estado inicial, seção 6)
//     │   ├── bumbo, caixa, toms, pratos, estantes, banco, pedais, baquetas
//     │   └── chimbal               (tripé e tubo fixo moram aqui)
//     │       └── chimbal-haste     ← sobe e desce (ajuste de 70–90 cm, seção 4)
//     │           ├── chimbal-prato-de-baixo
//     │           └── chimbal-prato-de-cima
//     └── plataforma                ← peças FIXADAS passam a ser filhas daqui
//         ├── piso-da-plataforma    ← a única malha que muda de tamanho
//         └── suporte-do-painel
//             └── painel
//
//   E oferece duas operações do domínio: redimensionar a plataforma e ajustar
//   a altura do chimbal.
//
// COMO FAZ
//   `Group` (nó sem forma) para cada peça e para chão/plataforma; `Mesh`
//   (forma visível) pendurada dentro de cada Group.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Uma LISTA de objetos, cada um com coordenadas absolutas medidas a partir de
//   um canto da sala.
//
// POR QUE ESTA E NÃO A OUTRA
//   As duas produzem a MESMA imagem parada. A diferença aparece no primeiro
//   movimento: com a lista, arrastar a plataforma deixaria para trás as peças
//   fixadas, flutuando onde estavam, e seria preciso recalcular cada coordenada
//   à mão. Coordenada é "um fato sobre agora"; relação é "um fato sobre sempre"
//   (Cap. 3, seção 1.1).
//
// REGRA DE PARENTESCO (o critério usado em todo o arquivo)
//   "Um nó é filho de outro quando mover o segundo tem de mover o primeiro
//   junto" (Cap. 3, seção 1.1.2). Não é proximidade, nem ordem de criação.
//   Os parentescos que existem por razão de projeto:
//     - plataforma → peças fixadas: arrastar a plataforma leva o kit montado;
//     - chimbal-haste → pratos: regular a altura do chimbal sobe os pratos;
//     - plataforma → painel: o painel é um cartaz preso à plataforma.
//
// POR QUE PRECISAMOS
//   Passo 7. E é a operação que a montagem vai consumir: fixar uma peça =
//   trocá-la de pai (hierarquia.ts).
//
// ESCALA
//   1 unidade = 1 metro, Y vertical, medidas lidas de dominio.ts. Geometria
//   CRUA (cilindros e caixas) de propósito: modelagem é o Módulo 04 e ativos
//   externos o 05; peça bonita esconde erro de estrutura, e "objeto certo no
//   lugar certo" vem antes de "objeto vistoso" (enunciado do Módulo 03).
//
// BASE NO MATERIAL
//   Cap. 3, seções 1.1 e 1.6; Cap. 4 (materiais compartilhados); Cap. 5
//   (convenção da cena: origem no ponto de apoio). Projeto do professor:
//   src/bancada/core/cena.ts.
// ===========================================================================

import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
} from 'three';

import { BATERIA, type Dominio, type FaixaDeAjuste, type Peca, type PecaId } from '../dominio/dominio';

/** Espessura do piso da plataforma, em metros. A "superfície útil" fica em y = 0,05. */
export const ESPESSURA_DO_PISO: number = 0.05;

/**
 * Quanto o prato de cima do chimbal fica acima do de baixo com o pedal solto:
 * 2 cm (provisório, a conferir com o modelo do Módulo 05).
 * POR QUE MORA AQUI E É EXPORTADO: a geometria (onde nasce cada prato) e a
 * animação do main.ts (quanto o prato desce ao "pisar") usam o MESMO número;
 * escrito duas vezes, um dia os dois discordam e o prato atravessa o outro.
 */
export const ABERTURA_DO_CHIMBAL_M: number = 0.02;

/** Espessura de cada prato do chimbal, em metros (forma crua, provisória). */
const ESPESSURA_DO_PRATO_M: number = 0.006;

/**
 * O tubo de baixo do chimbal, fixo no tripé, e o ponto onde começa a haste
 * que desliza dentro dele (alturas no sistema do nó do chimbal, em metros).
 * POR QUE DOIS TUBOS: a haste de um chimbal real é telescópica. Se a haste
 * inteira subisse, abriria um vão entre o tripé e a haste (10 cm no ajuste
 * máximo). Com o tubo fixo de 0 a 45 cm e a haste começando em 30 cm, a
 * haste fica dentro do tubo em todo o curso: de 20 cm (ajuste em 70 cm) a
 * 40 cm (ajuste em 90 cm), sempre abaixo dos 45 cm do topo do tubo.
 */
const ALTURA_DO_TUBO_FIXO_M: number = 0.45;
const INICIO_DA_HASTE_M: number = 0.3;

/**
 * Distância do centro da plataforma até o anel onde as peças nascem: 1,5 m.
 * POR QUE: fora da plataforma inicial (meio lado = 0,75 m) e dentro do alcance
 * de alguns passos — o "monte de peças em volta de uma plataforma vazia" da
 * seção 2 da especificação.
 */
const RAIO_DAS_PECAS_SOLTAS: number = 1.5;

/**
 * Ângulo onde começa o anel de peças: 90° (lado direito da plataforma, +X).
 * POR QUE: a primeira peça da lista é o bumbo, a peça da demonstração. Com o
 * anel começando em 0°, ele nasceria bem na frente da câmera, grande e cortado
 * na borda da tela, escondendo a plataforma. À direita ele aparece inteiro, e
 * "mover a plataforma 40 cm" (em +X) o leva para mais longe do centro — fácil
 * de ver.
 */
const ANGULO_INICIAL_DO_ANEL: number = Math.PI / 2;

/** O que a cena oferece ao resto do programa. */
export interface CenaDaBateria {
  readonly sala: Scene;
  readonly chao: Group;
  readonly plataforma: Group;
  readonly piso: Mesh;
  readonly suporteDoPainel: Object3D;
  /** O nó (Group) de cada peça do domínio. */
  readonly pecas: ReadonlyMap<PecaId, Group>;
  readonly hasteDoChimbal: Group;
  readonly pratoDeCimaDoChimbal: Mesh;
  /** Muda o lado da plataforma (limitado a 1,0–2,5 m) e devolve o valor aplicado. */
  redimensionarPlataforma(ladoM: number): number;
  /** Muda a altura do chimbal (limitada à faixa do domínio, 70–90 cm) e devolve o valor aplicado. */
  ajustarAlturaDoChimbal(alturaM: number): number;
}

/**
 * O QUE FAZ: cria um material CRU: só a cor muda de um para outro.
 * POR QUE CRU: o enunciado do Módulo 03 pede geometria crua e "nenhum
 *   material trabalhado"; aparência é assunto dos Módulos 04 e 05. Rugosidade e
 *   brilho metálico diferentes para metal, madeira e casco já seriam material
 *   trabalhado. Aqui a cor existe só para distinguir as peças umas das outras.
 * POR QUE MeshStandardMaterial E NÃO UMA COR SEM LUZ (MeshBasicMaterial): sem
 *   luz, um cilindro vira um retângulo chapado e não se vê a forma nem a
 *   escala. É a mesma escolha do projeto do professor (core/cena.ts): uma
 *   fábrica com os mesmos parâmetros, trocando só a cor.
 * COMPARADO AO PROJETO DO PROFESSOR: lá cada malha chama a fábrica e ganha
 *   uma instância própria de material. Aqui a fábrica roda cinco vezes, uma
 *   por cor, e todas as peças apontam para essas cinco (ver MATERIAIS logo
 *   abaixo), porque a bateria tem mais peças repetidas e cada instância a
 *   mais é uma troca de estado a mais na placa de vídeo (Cap. 4).
 */
function materialCru(cor: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: cor, roughness: 0.7, metalness: 0.1 });
}

/*
 * MATERIAIS: cinco para a cena inteira, e COMPARTILHADOS.
 * O QUE É: cada material é, para a placa de vídeo, um programa compilado.
 * POR QUE POUCOS E COMPARTILHADOS: trocar de material entre dois desenhos
 *   custa uma troca de estado, e DUAS INSTÂNCIAS IGUAIS contam como duas — a
 *   placa não compara valores (Cap. 4, seção 1.3.3). Por isso criamos cada um
 *   uma vez e todas as peças apontam para a mesma instância.
 */
const MATERIAIS = {
  casco: materialCru(0x9c3b3b), // tambores: vermelho
  metal: materialCru(0xc9b26b), // pratos: dourado
  ferragem: materialCru(0x8a8f99), // estantes, pedais, haste: cinza
  madeira: materialCru(0x6b5238), // banco, baquetas, plataforma: marrom
  chao: materialCru(0x2a2d35), // chão da sala: cinza escuro
} as const;

/**
 * O QUE FAZ: cria um cilindro com a BASE no y = 0 do nó.
 * POR QUE A BASE NO ZERO: convenção da cena — a origem da peça fica no ponto
 *   em que ela toca a superfície de apoio. Assim, pousar uma peça em qualquer
 *   lugar é só dar a altura do apoio, sem "meia altura" de correção por peça
 *   (Cap. 5, seção 1.1.2). O cilindro do Three.js nasce centrado; subimos
 *   metade da altura.
 */
function cilindroDeBase(raio: number, altura: number, material: MeshStandardMaterial): Mesh {
  const malha: Mesh = new Mesh(new CylinderGeometry(raio, raio, altura, 24), material);
  malha.position.y = altura / 2;
  return malha;
}

/**
 * O QUE FAZ: monta o chimbal, a peça com hierarquia INTERNA.
 * POR QUE A HASTE É PAI DOS PRATOS: na bateria real, regular a altura do
 *   chimbal sobe os dois pratos junto. Então a haste é pai, e o ajuste mexe SÓ
 *   na haste — os pratos acompanham sem código nenhum. É o "algo que se move
 *   junto com outra coisa porque está preso a ela" que o passo 7 pede, com
 *   razão vinda do domínio.
 * OUTRA OPÇÃO: pratos filhos direto do nó do chimbal e, ao ajustar, mover os
 *   três separados. POR QUE NÃO: três coordenadas somadas à mão, que saem de
 *   sincronia no primeiro esquecimento.
 * AS ALTURAS (a peça em repouso tem EXATAMENTE a altura do domínio, 80 cm):
 *   - o topo do prato de cima fica na altura do domínio;
 *   - o prato de baixo fica 2 cm abaixo dele (pedal solto = chimbal aberto,
 *     como num chimbal de verdade parado);
 *   - a haste vai de 30 cm até a base do prato de cima e desliza dentro do
 *     tubo fixo (ver ALTURA_DO_TUBO_FIXO_M).
 *   OUTRA OPÇÃO: pôr o prato de baixo nos 80 cm e o de cima 2 cm acima dele.
 *   POR QUE NÃO: a peça construída passaria a ter 82 cm, e a caixa envolvente
 *   da cena deixaria de bater com a do inventário (passo 7: "na escala em
 *   metros que a especificação fixou").
 */
function montarChimbal(peca: Peca, no: Group): { haste: Group; pratoDeCima: Mesh } {
  const raioDoPrato: number = peca.dimensoes.largura / 2;
  const alturaTotal: number = peca.dimensoes.altura;
  const e: number = ESPESSURA_DO_PRATO_M;

  no.add(cilindroDeBase(0.17, 0.02, MATERIAIS.ferragem)); // tripé (forma crua)
  no.add(cilindroDeBase(0.016, ALTURA_DO_TUBO_FIXO_M, MATERIAIS.ferragem)); // tubo fixo, preso ao tripé

  const haste: Group = new Group();
  haste.name = 'chimbal-haste';
  no.add(haste);
  const comprimentoDaHaste: number = alturaTotal - e - INICIO_DA_HASTE_M;
  const tuboDaHaste: Mesh = new Mesh(new CylinderGeometry(0.012, 0.012, comprimentoDaHaste, 8), MATERIAIS.ferragem);
  tuboDaHaste.position.y = INICIO_DA_HASTE_M + comprimentoDaHaste / 2;
  haste.add(tuboDaHaste);

  const pratoDeBaixo: Mesh = new Mesh(new CylinderGeometry(raioDoPrato, raioDoPrato, e, 32), MATERIAIS.metal);
  pratoDeBaixo.name = 'chimbal-prato-de-baixo';
  pratoDeBaixo.position.y = alturaTotal - e - ABERTURA_DO_CHIMBAL_M - e / 2; // centro do prato
  haste.add(pratoDeBaixo);

  // `clone()` reaproveita a MESMA geometria e o MESMO material (só a posição muda).
  const pratoDeCima: Mesh = pratoDeBaixo.clone();
  pratoDeCima.name = 'chimbal-prato-de-cima';
  pratoDeCima.position.y = alturaTotal - e / 2; // topo do prato = altura do domínio
  haste.add(pratoDeCima);

  return { haste, pratoDeCima };
}

/**
 * O QUE FAZ: dá a forma crua de cada peça a partir das medidas do domínio.
 * POR QUE AS MALHAS NÃO TÊM NOME: só os nós que importam para a estrutura têm
 *   nome; assim a árvore impressa na página mostra peças, não "cilindro 1,
 *   cilindro 2".
 * POR QUE `switch` POR ID SEM `default`: se alguém acrescentar uma peça ao
 *   domínio e esquecer a forma, o compilador acusa aqui.
 */
function vestirPeca(peca: Peca, no: Group): void {
  const { largura, altura, profundidade } = peca.dimensoes;
  switch (peca.id) {
    case 'bumbo': {
      // O bumbo fica DEITADO: o eixo do cilindro aponta para a frente (Z),
      // por isso a rotação de 90° em X e a subida de um raio.
      const casco: Mesh = new Mesh(new CylinderGeometry(largura / 2, largura / 2, profundidade, 32), MATERIAIS.casco);
      casco.rotation.x = Math.PI / 2;
      casco.position.y = largura / 2;
      no.add(casco);
      return;
    }
    case 'caixa':
    case 'tom-1':
    case 'tom-2':
    case 'tom-de-chao':
      no.add(cilindroDeBase(largura / 2, altura, MATERIAIS.casco));
      return;
    case 'prato-ataque':
    case 'prato-conducao':
      no.add(cilindroDeBase(largura / 2, altura, MATERIAIS.metal));
      return;
    case 'estante-de-prato':
    case 'estante-de-caixa':
      no.add(cilindroDeBase(largura / 2, 0.02, MATERIAIS.ferragem)); // base do tripé
      no.add(cilindroDeBase(0.012, altura, MATERIAIS.ferragem)); // haste
      return;
    case 'banco':
      no.add(cilindroDeBase(largura / 2, altura, MATERIAIS.madeira));
      return;
    case 'pedal-bumbo-esquerdo':
    case 'pedal-bumbo-direito': {
      const pedal: Mesh = new Mesh(new BoxGeometry(largura, altura, profundidade), MATERIAIS.ferragem);
      pedal.position.y = altura / 2;
      no.add(pedal);
      return;
    }
    case 'baqueta-esquerda':
    case 'baqueta-direita': {
      const baqueta: Mesh = new Mesh(new CylinderGeometry(largura / 2, largura / 2, profundidade, 8), MATERIAIS.madeira);
      baqueta.rotation.x = Math.PI / 2; // deitada no chão
      baqueta.position.y = largura / 2;
      no.add(baqueta);
      return;
    }
    case 'chimbal':
      return; // montado à parte (montarChimbal), por ter hierarquia interna
  }
}

/**
 * O QUE FAZ: monta a cena inteira e devolve os nós que o resto do programa usa.
 * POR QUE RECEBE O DOMÍNIO COMO PARÂMETRO: a cena contém EXATAMENTE os objetos
 *   que o domínio promete — é assim que o passo 7 "se confere contra o 2".
 */
export function montarCena(dominio: Dominio = BATERIA): CenaDaBateria {
  const sala: Scene = new Scene();
  sala.name = 'sala';
  sala.background = new Color(0x15171c);

  // LUZES: duas, e nenhuma a mais — cada luz custa em todo material que a
  // recebe. A hemisférica dá o "entorno" (sem ela, as partes metálicas ficam
  // escuras por não terem o que refletir; Cap. 4, seção 1.3.4) e a direcional
  // dá volume às formas.
  const ambiente: HemisphereLight = new HemisphereLight(0xdfe6f5, 0x2a2c33, 1.2);
  ambiente.name = 'luz-ambiente';
  sala.add(ambiente);
  const direcional: DirectionalLight = new DirectionalLight(0xffffff, 1.5);
  direcional.name = 'luz-direcional';
  direcional.position.set(2, 4, 3);
  sala.add(direcional);

  // CHÃO: um nó próprio porque as peças SOLTAS pertencem a ele — é dele que
  // elas saem quando são fixadas na plataforma (troca de pai).
  // OUTRA OPÇÃO: peças soltas filhas direto da `sala`. POR QUE NÃO: o chão dá
  // nome ao estado "solta" e deixa a troca de pai legível: chao → plataforma.
  const chao: Group = new Group();
  chao.name = 'chao';
  sala.add(chao);
  const superficieDoChao: Mesh = new Mesh(new PlaneGeometry(8, 8), MATERIAIS.chao);
  superficieDoChao.rotation.x = -Math.PI / 2; // o plano nasce em pé; deitamos no chão
  chao.add(superficieDoChao);

  // PLATAFORMA: um Group com escala SEMPRE 1.
  // O tamanho ajustável (seção 4: 1,0 a 2,5 m) mora na malha do PISO, que não
  // tem filhos.
  // OUTRA OPÇÃO: escalar o próprio Group da plataforma.
  // POR QUE NÃO: escala no pai se aplica a TODOS os filhos. Um bumbo fixado
  // numa plataforma de 2,5 m (escala 1,67 sobre 1,5 m) ficaria 1,67 vez mais
  // largo. E como a escala seria só em X e Z (não uniforme), um filho girado
  // sairia torto (Cap. 3, seção 1.2: "escala não uniforme é evitada em nós que
  // tenham descendência"). Esse é um caso de fronteira da NOSSA cena — a do
  // professor não tem peça redimensionável.
  const plataforma: Group = new Group();
  plataforma.name = 'plataforma';
  sala.add(plataforma);

  const piso: Mesh = new Mesh(new BoxGeometry(1, ESPESSURA_DO_PISO, 1), MATERIAIS.madeira);
  piso.name = 'piso-da-plataforma';
  piso.position.y = ESPESSURA_DO_PISO / 2;
  plataforma.add(piso);

  // SUPORTE DO PAINEL: um nó vazio (Object3D, sem forma) preso à plataforma.
  // POR QUE UM NÓ VAZIO: "um nó sem geometria é legítimo: existe para dar aos
  // filhos um sistema de coordenadas comum" (Cap. 3, seção 1.1.1). Aqui ele
  // marca o meio da borda direita (+X) da plataforma; o painel pendura nele.
  // POR QUE A BORDA DIREITA E NÃO A DE TRÁS: o chimbal nasce atrás da
  // plataforma, bem no eixo da câmera, e é ele que mostra a animação contra o
  // relógio. Um cartaz na borda de trás, no tamanho que se lê da câmera,
  // esconderia justamente os pratos. Na borda direita ele fica ao lado da cena,
  // acima das peças baixas (bumbo, caixa, pedais), sem cobrir nenhuma.
  // POR QUE PRESO À PLATAFORMA E NÃO À CÂMERA: arrastar a plataforma leva o
  // painel junto, e no visor ele será um objeto do mundo, não texto grudado no
  // rosto (Cap. 3, seção 1.6.2).
  const suporteDoPainel: Object3D = new Object3D();
  suporteDoPainel.name = 'suporte-do-painel';
  plataforma.add(suporteDoPainel);

  // PEÇAS: nascem SOLTAS no chão, num anel em volta da plataforma.
  // OUTRA OPÇÃO: nascerem já em cima da plataforma, com o kit montado.
  // POR QUE NÃO: "nascer no destino apagaria justamente a operação que o módulo
  // existe para ensinar" (Cap. 3, seção 1.1.2). A cena inicial é desarrumada de
  // propósito — é o estado inicial da seção 6 da especificação.
  const pecas: Map<PecaId, Group> = new Map();
  let haste: Group | undefined;
  let pratoDeCima: Mesh | undefined;
  dominio.pecas.forEach((peca: Peca, i: number) => {
    const no: Group = new Group();
    no.name = peca.id;
    // Distribui as peças em volta: ângulo proporcional à posição na lista.
    const angulo: number = ANGULO_INICIAL_DO_ANEL + (i / dominio.pecas.length) * Math.PI * 2;
    no.position.set(Math.sin(angulo) * RAIO_DAS_PECAS_SOLTAS, 0, Math.cos(angulo) * RAIO_DAS_PECAS_SOLTAS);
    if (peca.id === 'chimbal') {
      ({ haste, pratoDeCima } = montarChimbal(peca, no));
    } else {
      vestirPeca(peca, no);
    }
    chao.add(no);
    pecas.set(peca.id, no);
  });
  if (haste === undefined || pratoDeCima === undefined) {
    throw new Error('O domínio não declara o chimbal, e a cena depende dele para o ajuste de altura.');
  }
  const hasteDoChimbal: Group = haste;
  // A altura em repouso e o curso do suporte vêm do domínio (seção 4), não
  // de números escritos aqui. Sem faixa declarada, o chimbal não teria ajuste,
  // e a demonstração do passo 7 depende dele: parar com mensagem clara.
  const pecaChimbal: Peca | undefined = dominio.pecas.find((p) => p.id === 'chimbal');
  const faixaDeclarada: FaixaDeAjuste | undefined = pecaChimbal?.ajuste;
  if (pecaChimbal === undefined || faixaDeclarada === undefined || faixaDeclarada.grandeza !== 'altura') {
    throw new Error('O domínio não declara a faixa de altura do chimbal, e a cena depende dela para o ajuste.');
  }
  // Cópia depois da conferência: a garantia de "não é undefined" do `if`
  // acima não entra na função interna `ajustarAlturaDoChimbal`.
  const faixaDoChimbal: FaixaDeAjuste = faixaDeclarada;
  const alturaBaseDoChimbal: number = pecaChimbal.dimensoes.altura;

  /**
   * O QUE FAZ: muda o lado da plataforma, dentro de 1,0–2,5 m (seção 4).
   * COMO FAZ: escala SÓ a malha do piso (X e Z; Y fica 1) e leva o suporte do
   *   painel para a nova borda direita.
   * POR QUE LIMITAR (clamp) AQUI: o domínio define o intervalo; quem chama não
   *   precisa saber dele, e o valor aplicado volta para ser mostrado.
   */
  function redimensionarPlataforma(ladoM: number): number {
    const { ladoMinimo, ladoMaximo } = dominio.plataforma;
    const lado: number = Math.min(Math.max(ladoM, ladoMinimo), ladoMaximo);
    piso.scale.set(lado, 1, lado);
    suporteDoPainel.position.set(lado / 2, ESPESSURA_DO_PISO, 0);
    return lado;
  }

  /**
   * O QUE FAZ: regula a altura do chimbal, dentro da faixa do domínio (seção 4:
   *   70 a 90 cm). A altura é a do topo do prato de cima.
   * COMO FAZ: move SÓ a haste; os pratos, filhos dela, sobem junto, e o tubo
   *   fixo continua no tripé.
   */
  function ajustarAlturaDoChimbal(alturaM: number): number {
    const altura: number = Math.min(Math.max(alturaM, faixaDoChimbal.minimo), faixaDoChimbal.maximo);
    hasteDoChimbal.position.y = altura - alturaBaseDoChimbal;
    return altura;
  }

  redimensionarPlataforma(dominio.plataforma.ladoInicial);

  return {
    sala,
    chao,
    plataforma,
    piso,
    suporteDoPainel,
    pecas,
    hasteDoChimbal,
    pratoDeCimaDoChimbal: pratoDeCima,
    redimensionarPlataforma,
    ajustarAlturaDoChimbal,
  };
}
