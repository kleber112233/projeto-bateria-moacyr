// ===========================================================================
// hierarquia.ts — TROCAR DE PAI SEM SAIR DO LUGAR (passo 8 da tarefa)
// ===========================================================================
//
// O QUE É
//   A operação de REPARENTAR: mudar de quem um objeto é filho, mantendo a
//   posição, a rotação e a escala que ele tem NO MUNDO. Mais duas ajudas:
//   ler a posição no mundo e imprimir a árvore em texto.
//
// O QUE FAZ
//   "Fixar o bumbo na plataforma" = trocar o pai do bumbo de `chao` para
//   `plataforma`. O bumbo não se mexe; mas a partir daí, mover a plataforma
//   move o bumbo junto, sem código nenhum para acompanhar.
//
// COMO FAZ (a conta)
//   A posição no mundo de um nó é  M_mundo = M_pai · M_local.
//   Ao trocar de pai queremos o MESMO M_mundo com o pai novo, então:
//
//         M_local_novo = (M_pai_novo)⁻¹ · M_mundo
//
//   A inversa da matriz do pai responde: "que coordenadas, no sistema do pai
//   novo, apontam para o mesmo lugar do mundo?". A multiplicação se lê da
//   DIREITA para a ESQUERDA (Cap. 3, seção 1.2).
//   Se só trocássemos o pai mantendo os números antigos, o objeto PULARIA:
//   aqueles números eram distâncias até o pai antigo e passariam a ser lidos
//   como distâncias até o novo (Cap. 3, seção 1.3).
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Deixar o bumbo filho do chão e, a cada quadro, copiar a posição da
//   plataforma para ele (somando a distância entre os dois).
//
// POR QUE ESTA E NÃO A OUTRA
//   A cópia por quadro produz a mesma imagem hoje, e por isso é tentadora.
//   Mas quebra em quatro momentos (Cap. 3, seção 1.3):
//   (1) quando a plataforma GIRAR: somar posição não basta, é preciso compor
//       rotações — o bumbo fica fora do lugar;
//   (2) quando algo ACIMA da plataforma se mover: a soma foi escrita para um
//       nível só;
//   (3) quando for preciso SOLTAR: não existe operação inversa, porque nunca
//       houve operação;
//   (4) se alguém puser outro passo antes da cópia no laço, o bumbo passa a
//       seguir a plataforma com UM QUADRO de atraso — tremor quando ela acelera.
//   Reparentar é UMA operação, feita uma vez, que nunca sai de sincronia.
//
// POR QUE ESCREVEMOS À MÃO SE O THREE.JS TEM `attach()`
//   O `attach()` faz a mesma conta. Escrevemos para (a) DEVOLVER a posição
//   antes, depois e o desvio — o passo 8 exige conferir "em números, não a
//   olho" — e (b) tratar os casos de fronteira abaixo, que o attach não recusa.
//   COMPARADO AO PROJETO DO PROFESSOR: a conta é a mesma dele, na mesma
//   ordem. Lá a função não confere ciclo nem escala do pai, e na Bancada isso
//   basta, porque nenhum pai é escalado. Na bateria o piso é redimensionável,
//   então a recusa de escala não uniforme e de escala zero entra aqui, junto
//   com o desvio de orientação.
//
// POR QUE PRECISAMOS
//   É a operação que a montagem vai consumir nos próximos módulos: pegar,
//   encaixar e soltar peça são trocas de pai.
//
// BASE NO MATERIAL
//   Cap. 3, seções 1.2 (ordem das operações; leitura da direita para a
//   esquerda) e 1.3 ("Posse não é posição"; reparentagem que preserva o
//   mundo). Projeto do professor: src/bancada/core/hierarquia.ts.
// ===========================================================================

import { Matrix4, Object3D, Quaternion, Vector3 } from 'three';

// Objetos reaproveitados entre chamadas: criar Matrix4/Vector3 novos a cada
// chamada gera lixo que o coletor de memória cobra depois (e o coletor rodando
// no meio de um quadro é um engasgo).
const matrizLocal: Matrix4 = new Matrix4();
const posicaoDoPai: Vector3 = new Vector3();
const rotacaoDoPai: Quaternion = new Quaternion();
const escalaDoPai: Vector3 = new Vector3();
const rotacaoAntes: Quaternion = new Quaternion();
const rotacaoDepois: Quaternion = new Quaternion();
// Recebem a posição e a escala quando só a ROTAÇÃO do filho interessa
// (`decompose` sempre preenche os três).
const posicaoDescartada: Vector3 = new Vector3();
const escalaDescartada: Vector3 = new Vector3();

/**
 * O QUE É: a menor escala que um pai pode ter no mundo para a troca ser feita.
 * POR QUE PRECISAMOS: um pai com escala zero (ou quase) "achata" tudo num
 *   ponto, e a matriz dele não tem inversa: a conta `(M_pai)⁻¹` devolve lixo e
 *   o filho não fica no lugar. 1e-6 é um milésimo de milímetro por metro,
 *   pequeno demais para existir numa cena de propósito.
 */
const MENOR_ESCALA_ACEITA: number = 1e-6;

/**
 * O QUE É: o resultado da troca, em números.
 * POR QUE DEVOLVER O DESVIO: o ideal seria zero, e o resultado real fica no
 *   ruído do ponto flutuante (entre 0 e ~1e-16 m). O valor da medida está em
 *   distinguir esse caso do outro: um desvio de MILÍMETROS significa que a
 *   conta usou uma matriz vencida em algum ponto do caminho até a raiz.
 *   "Uma função que devolve sempre zero não informa nada" (Cap. 3). Limiar
 *   prático: acima de 1 mm é um salto que alguém vai sentir na mão.
 */
export interface ResultadoDaTroca {
  /** Posição do nó no MUNDO antes da troca, em metros. */
  readonly antes: Vector3;
  /** Posição do nó no MUNDO depois da troca, em metros. */
  readonly depois: Vector3;
  /** Distância entre as duas, em metros. */
  readonly desvio: number;
  /**
   * Quanto a ORIENTAÇÃO no mundo mudou com a troca, em graus. O ideal é zero.
   * POR QUE ALÉM DA POSIÇÃO: com a plataforma girada, uma conta errada pode
   *   acertar a posição e errar a rotação (a peça fica no lugar, mas virada).
   *   Só a posição não pegaria esse erro.
   */
  readonly desvioAngularGraus: number;
}

/**
 * O QUE FAZ: o ângulo, em graus, da rotação que leva a orientação `a` à `b`.
 * COMO FAZ: monta a rotação relativa (`a` invertida seguida de `b`) e lê o
 *   ângulo dela com `atan2(|parte vetorial|, |parte escalar|)`.
 * OUTRA OPÇÃO: `a.angleTo(b)` do Three.js, que usa `acos` do produto escalar.
 * POR QUE NÃO: perto de ângulo zero o `acos` amplifica o ruído do ponto
 *   flutuante (acos de 0,9999999999999999 já dá cerca de um milionésimo de
 *   grau). Para uma conferência cujo resultado esperado é justamente zero,
 *   isso apareceria como um desvio que não existe. O `atan2` não tem esse
 *   problema.
 */
const rotacaoRelativa: Quaternion = new Quaternion();
function anguloEntreGraus(a: Quaternion, b: Quaternion): number {
  rotacaoRelativa.copy(a).invert().multiply(b);
  const parteVetorial: number = Math.hypot(rotacaoRelativa.x, rotacaoRelativa.y, rotacaoRelativa.z);
  return (2 * Math.atan2(parteVetorial, Math.abs(rotacaoRelativa.w)) * 180) / Math.PI;
}

/**
 * O QUE FAZ: devolve um nome legível para as mensagens de erro.
 * POR QUE: nós sem nome (as malhas de forma) deixariam a frase vazia
 *   ('"" está dentro de ""'). Nesse caso, o tipo do objeto ajuda a achar qual é.
 */
function nomeDe(no: Object3D): string {
  return no.name !== '' ? no.name : `(${no.type} sem nome)`;
}

/**
 * O QUE FAZ: diz se `talvezAncestral` está no caminho de `no` até a raiz.
 * COMO FAZ: sobe pelos `parent` até acabar (null).
 * POR QUE PRECISAMOS: para impedir ciclos (ver `reparentar`).
 */
function ehAncestral(talvezAncestral: Object3D, no: Object3D): boolean {
  for (let atual: Object3D | null = no; atual !== null; atual = atual.parent) {
    if (atual === talvezAncestral) {
      return true;
    }
  }
  return false;
}

/**
 * O QUE FAZ: torna `filho` filho de `novoPai` sem que ele saia do lugar no mundo.
 *
 * CASOS DE FRONTEIRA TRATADOS (onde uma troca de pai costuma errar sem avisar):
 *   1. MATRIZ DESATUALIZADA: o Three.js recalcula as matrizes de mundo uma vez
 *      por quadro, ao desenhar. Se alguém mudou uma posição neste quadro (ex.:
 *      moveu a plataforma e clicou em fixar logo depois), a matriz ainda é a
 *      antiga e a peça pularia. `updateWorldMatrix(true, false)` recalcula o
 *      caminho até a raiz antes da conta.
 *   2. CICLO: pôr um nó dentro dele mesmo ou de um descendente dele quebraria
 *      a árvore (o caminho até a raiz nunca acabaria). Recusado com mensagem.
 *   3. PAI COM ESCALA NÃO UNIFORME: a matriz resultante teria cisalhamento
 *      (o objeto "entortado"), que posição + rotação + escala não conseguem
 *      representar — a peça sairia deformada. Recusado. É por isso que a
 *      plataforma nunca é escalada no nó (cena.ts).
 *   4. PAI COM ESCALA ZERO: a matriz não tem inversa (ver MENOR_ESCALA_ACEITA).
 *      Recusado.
 *   (Um quinto caso, trocar para o MESMO pai, funciona naturalmente: a conta
 *    devolve a mesma matriz local.)
 */
export function reparentar(filho: Object3D, novoPai: Object3D): ResultadoDaTroca {
  // Caso 2: ciclo.
  if (ehAncestral(filho, novoPai)) {
    throw new Error(`"${nomeDe(novoPai)}" está dentro de "${nomeDe(filho)}": a troca criaria um ciclo na árvore.`);
  }

  // Caso 1: matrizes atualizadas antes da conta.
  // (true = atualiza também os ancestrais; false = não precisa descer aos filhos.)
  filho.updateWorldMatrix(true, false);
  novoPai.updateWorldMatrix(true, false);

  // Caso 4 primeiro: escala zero. O teste é pelo DETERMINANTE (o produto das
  // três escalas, que diz quanto a matriz encolhe um volume), e não pela
  // escala lida com `decompose`: para uma matriz sem inversa o `decompose` do
  // Three.js devolve escala 1, e o teste pela escala deixaria passar
  // justamente o caso que ele devia pegar. A raiz cúbica volta à unidade de
  // escala, para comparar com MENOR_ESCALA_ACEITA.
  if (Math.cbrt(Math.abs(novoPai.matrixWorld.determinant())) < MENOR_ESCALA_ACEITA) {
    throw new Error(`"${nomeDe(novoPai)}" tem escala zero no mundo; não há como pôr um filho dentro dele sem perder a posição.`);
  }

  // Caso 3: escala do pai novo no mundo precisa ser igual nos três eixos.
  novoPai.matrixWorld.decompose(posicaoDoPai, rotacaoDoPai, escalaDoPai);
  const tolerancia: number = 1e-6;
  if (Math.abs(escalaDoPai.x - escalaDoPai.y) > tolerancia || Math.abs(escalaDoPai.y - escalaDoPai.z) > tolerancia) {
    throw new Error(`"${nomeDe(novoPai)}" tem escala não uniforme no mundo; o filho sairia deformado.`);
  }

  const antes: Vector3 = new Vector3().setFromMatrixPosition(filho.matrixWorld);
  filho.matrixWorld.decompose(posicaoDescartada, rotacaoAntes, escalaDescartada);

  // A CONTA: M_local_novo = (M_pai_novo)⁻¹ · M_mundo_do_filho
  //   .copy(pai) → .invert() → .multiply(mundo do filho)   [direita p/ esquerda]
  matrizLocal.copy(novoPai.matrixWorld).invert().multiply(filho.matrixWorld);

  // `add` tira o nó do pai antigo automaticamente (um nó só tem um pai).
  novoPai.add(filho);

  // A matriz local vira de novo posição + rotação + escala do nó, que é o que
  // o Three.js guarda e recompõe a cada quadro.
  matrizLocal.decompose(filho.position, filho.quaternion, filho.scale);

  filho.updateWorldMatrix(true, false);
  const depois: Vector3 = new Vector3().setFromMatrixPosition(filho.matrixWorld);
  filho.matrixWorld.decompose(posicaoDescartada, rotacaoDepois, escalaDescartada);
  return {
    antes,
    depois,
    desvio: antes.distanceTo(depois),
    desvioAngularGraus: anguloEntreGraus(rotacaoAntes, rotacaoDepois),
  };
}

/**
 * O QUE FAZ: lê a posição de um nó no mundo.
 * POR QUE ATUALIZA ANTES: ler `matrixWorld` logo depois de mexer numa posição
 *   devolve o valor ANTIGO — não está errado, está atrasado; a conta só é feita
 *   ao desenhar (Cap. 3, seção 1.1.1). Atualizando antes, lemos o valor de agora.
 */
export function posicaoNoMundo(no: Object3D): Vector3 {
  no.updateWorldMatrix(true, false);
  return new Vector3().setFromMatrixPosition(no.matrixWorld);
}

/**
 * O QUE FAZ: formata um vetor em metros, com 3 casas (milímetro).
 * POR QUE 3 CASAS: é a precisão que a conferência a olho aguenta; o desvio,
 *   que é muito menor, é mostrado à parte em notação científica.
 */
export function emMetros(v: Vector3): string {
  return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}) m`;
}

/**
 * O QUE FAZ: escreve a árvore da cena em texto, um nível por recuo.
 * COMO FAZ: percorre a árvore recursivamente; só nós COM NOME aparecem (as
 *   malhas de forma não têm nome, e o recuo não conta um nível para elas).
 * POR QUE PRECISAMOS: o teste do professor para "hierarquia montada por
 *   acaso": ler a árvore em voz alta e procurar frase sem sentido no mundo
 *   ("a baqueta é filha do bumbo"?).
 */
export function descreverArvore(raiz: Object3D): string[] {
  const linhas: string[] = [];
  function percorrer(no: Object3D, nivel: number): void {
    if (no.name !== '') {
      linhas.push(`${'   '.repeat(nivel)}${no.name}`);
    }
    for (const filho of no.children) {
      percorrer(filho, no.name !== '' ? nivel + 1 : nivel);
    }
  }
  percorrer(raiz, 0);
  return linhas;
}
