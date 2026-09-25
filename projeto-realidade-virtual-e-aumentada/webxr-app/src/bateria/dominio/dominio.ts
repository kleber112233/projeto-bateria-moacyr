// ===========================================================================
// dominio.ts — O DOMÍNIO DA BATERIA ESCRITO COMO DADO (passo 2 da tarefa)
// ===========================================================================
//
// O QUE É
//   A descrição, em TypeScript, do que existe no ambiente e do que conclui a
//   tarefa: as 15 peças do kit, o papel de cada uma, as medidas em metros, a
//   plataforma, a folga de encaixe, a tarefa em uma frase e o estado final.
//
// O QUE FAZ
//   1. Guarda o inventário num lugar só. A cena (core/cena.ts) lê as medidas
//      daqui, e o relatório (relatorio/relatorio.ts) mostra a tabela daqui.
//   2. Confere se o próprio domínio é coerente (`inconsistenciasDoDominio`)
//      antes de existir qualquer polígono na tela.
//
// COMO FAZ
//   Tipos de união literal (`PecaId`, `Papel`) + uma constante `BATERIA` com
//   os dados + duas funções puras que leem essa constante.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Deixar o inventário só no docs/especificacao.md (texto).
//   b) Espalhar as medidas direto no código da cena (ex.: `new Cylinder(0.28…)`).
//
// POR QUE ESTA E NÃO A OUTRA
//   a) Texto não é conferido por ninguém: um nome de peça digitado errado num
//      documento só aparece no dia em que alguém procura a peça na cena.
//      Aqui, um id inventado é recusado pelo compilador, com a linha do erro.
//   b) Número espalhado pela cena vira "número mágico": quando a medida muda na
//      especificação, alguém precisa caçar cada lugar. Aqui é um lugar só.
//
// POR QUE PRECISAMOS
//   O professor cobra que a árvore do Módulo 03 contenha EXATAMENTE os objetos
//   prometidos no passo 2 ("o 7 só se confere contra o 2"). Com o domínio como
//   dado, a cena é construída a partir dele — não tem como prometer uma coisa
//   e desenhar outra.
//
// BASE NO MATERIAL
//   Cap. 1 ("O contínuo entre o sintético e o real"), seção 1.6: tarefa em uma
//   frase + inventário (só os objetos que a tarefa toca) + estado final
//   observável; "o modelo que se confere sozinho" (a função de conferência que
//   devolve frases, e não booleano, e roda sempre na abertura).
//   Projeto do professor: src/bancada/dominio/dominio.ts.
//
// ONDE A NOSSA CENA DIFERE DA DO PROFESSOR
//   Na Bancada do professor cada peça tem um encaixe (socket) certo no suporte,
//   e a conferência procura "encaixe órfão". Na bateria não existe encaixe por
//   peça: a pessoa monta o kit como quiser sobre a plataforma (especificação,
//   seção 6, "ordem livre"). Por isso, no lugar dos sockets, cada peça tem um
//   PAPEL (fixa e soa / fixa e não soa / acompanha a mão), e a conferência
//   procura o que quebraria o NOSSO estado final.
// ===========================================================================

/**
 * O QUE É: a lista fechada de identificadores das peças que a pessoa manipula.
 * COMO FAZ: união de strings literais — só esses 15 textos são aceitos.
 * OUTRA OPÇÃO: `string` comum, ou um `enum` numérico.
 * POR QUE ESTA: com `string`, um erro de digitação ('bumbu') passaria calado;
 *   com enum numérico, o relatório e o diário mostrariam "3" em vez de "caixa".
 *   String literal é ao mesmo tempo conferida pelo compilador e legível.
 *   (Cap. 1, seção 1.2: "quem lê `preserva` entende na hora; quem lê `1` vai
 *   procurar a tabela".)
 * POR QUE PRECISAMOS: todo o resto do código (cena, relatório) se refere às
 *   peças por esses nomes.
 */
export type PecaId =
  | 'bumbo'
  | 'caixa'
  | 'pedal-bumbo-esquerdo'
  | 'pedal-bumbo-direito'
  | 'chimbal'
  | 'tom-1'
  | 'tom-2'
  | 'tom-de-chao'
  | 'prato-ataque'
  | 'prato-conducao'
  | 'estante-de-prato'
  | 'estante-de-caixa'
  | 'banco'
  | 'baqueta-esquerda'
  | 'baqueta-direita';

/**
 * O QUE É: o papel da peça na tarefa.
 * O QUE FAZ: decide o que o estado final cobra de cada peça:
 *   - `instrumento`: precisa ser fixado na plataforma E soar ao ser batido;
 *   - `ferragem`: precisa ser fixado, mas não soa (estantes, pedais, banco);
 *   - `baqueta`: nunca é fixada — acompanha a mão de quem toca.
 * OUTRA OPÇÃO: dois booleanos, `fixa: boolean` e `soa: boolean`.
 * POR QUE ESTA: dois booleanos permitem uma combinação sem sentido (soa mas
 *   não fixa). Com três valores nomeados, só as combinações reais existem.
 * POR QUE PRECISAMOS: sem o papel, o estado final teria de exigir que TODAS
 *   as peças fossem fixadas e soassem, incluindo baquetas e banco, e isso não
 *   pode ser conferido: baqueta não é fixada e banco não soa. Com o papel,
 *   cada peça é cobrada só pelo que ela faz de verdade.
 */
export type Papel = 'instrumento' | 'ferragem' | 'baqueta';

/**
 * O QUE É: a caixa que envolve a peça, em METROS.
 * POR QUE METROS: a WebXR e o Three.js trabalham em metros; no visor, 1 unidade
 *   vai valer 1 metro do chão real. Escala errada é o erro mais caro de
 *   corrigir depois (Cap. 1, seção 1.3.2: "escala correta antes de material
 *   bonito"; Cap. 5, convenção da cena).
 * POR QUE Y É A ALTURA: é a convenção do Three.js e do formato glTF (Cap. 5).
 *   Usar outro eixo (X, por exemplo) brigaria com a biblioteca e com os
 *   modelos importados no Módulo 05.
 */
export interface Dimensoes {
  readonly largura: number; // eixo X
  readonly altura: number; // eixo Y (vertical)
  readonly profundidade: number; // eixo Z
}

/**
 * O QUE É: o curso de ajuste do suporte de uma peça (especificação, seção 4,
 *   coluna "Faixa de ajuste").
 * OS DOIS TIPOS:
 *   - `altura`, em METROS: até onde o suporte sobe e desce (haste do chimbal,
 *     estantes, banco, pés do tom de chão);
 *   - `inclinacao`, em GRAUS: quanto o prato inclina no braço da estante.
 * POR QUE MORA NO DOMÍNIO E NÃO NA CENA: é número do instrumento, igual às
 *   medidas. Escrita direto na cena, a faixa do chimbal (70 a 90 cm) poderia
 *   discordar da especificação sem ninguém ver. Aqui a cena lê, o relatório
 *   mostra e a conferência confere.
 * POR QUE A CAIXA NÃO TEM FAIXA: quem sobe e desce é a ESTANTE da caixa (60 a
 *   75 cm); a caixa só vai junto. A faixa fica na peça que tem o mecanismo.
 */
export interface FaixaDeAjuste {
  readonly grandeza: 'altura' | 'inclinacao';
  readonly minimo: number;
  readonly maximo: number;
}

/**
 * O QUE É: uma peça do inventário.
 * POR QUE `origemDaMedida`: número sem procedência vira folclore ("por que
 *   0,4 e não 0,5?" e ninguém lembra). Cada medida diz de onde veio — seção da
 *   especificação ou "provisório". O professor faz o mesmo com os tetos de
 *   orçamento (Cap. 3, seção 1.5.1).
 */
export interface Peca {
  readonly id: PecaId;
  readonly nome: string;
  readonly papel: Papel;
  /**
   * Caixa envolvente da peça EM REPOUSO: suporte na altura inicial e, no
   * chimbal, pedal solto (pratos 2 cm abertos, topo do prato de cima na
   * altura declarada). A animação só fecha o chimbal (o prato de cima desce),
   * então nunca passa dessa caixa; o ajuste de altura muda a peça naquele
   * instante, não a medida do inventário.
   */
  readonly dimensoes: Dimensoes;
  /** Curso do suporte; ausente quando a peça não tem ajuste (seção 4: "não tem"). */
  readonly ajuste?: FaixaDeAjuste;
  readonly origemDaMedida: string;
}

/**
 * O QUE É: a tarefa em uma frase e o estado que a conclui.
 * POR QUE JUNTOS NO MESMO TIPO: tarefa sem estado final é só intenção — produz
 *   "a cena bonita e vazia" (Cap. 1, seção 1.6.1). Lado a lado, um cobra o outro.
 * POR QUE TEXTO E NÃO LÓGICA: nesta fase a frase é conferida por gente, agora;
 *   a verificação automática do estado final chega com a manipulação.
 */
export interface TarefaDoAmbiente {
  readonly enunciado: string;
  readonly estadoFinal: string;
}

/** O domínio completo. Os números da plataforma e da folga vêm das seções 4 e 7. */
export interface Dominio {
  readonly nome: string;
  readonly descricao: string;
  readonly tarefa: TarefaDoAmbiente;
  /** Lado da plataforma quadrada, em metros: inicial, mínimo e máximo (seção 4). */
  readonly plataforma: { readonly ladoInicial: number; readonly ladoMinimo: number; readonly ladoMaximo: number };
  /** Folga do encaixe na plataforma, em metros (seção 7: 8 cm). */
  readonly folgaDeEncaixe: number;
  readonly pecas: readonly Peca[];
}

/**
 * Folga do encaixe na plataforma, em metros (seção 7: 8 cm).
 * POR QUE UMA CONSTANTE FORA DO OBJETO: o número aparece em dois lugares do
 *   domínio (no campo `folgaDeEncaixe` e na frase do estado final). Com a
 *   constante, a frase é montada a partir do número e os dois não têm como
 *   discordar.
 */
const FOLGA_DE_ENCAIXE_M: number = 0.08;

/** Atalho só para a tabela abaixo ficar legível: caixa(largura, altura, profundidade). */
function caixa(largura: number, altura: number, profundidade: number): Dimensoes {
  return { largura, altura, profundidade };
}

/** Atalhos para as faixas de ajuste: faixaDeAltura(mínimo, máximo) em metros, faixaDeInclinacao(mínimo, máximo) em graus. */
function faixaDeAltura(minimo: number, maximo: number): FaixaDeAjuste {
  return { grandeza: 'altura', minimo, maximo };
}
function faixaDeInclinacao(minimo: number, maximo: number): FaixaDeAjuste {
  return { grandeza: 'inclinacao', minimo, maximo };
}

/**
 * O QUE É: o domínio da bateria, como constante.
 * COMO AS MEDIDAS FORAM ESCOLHIDAS: caixa envolvente da peça já montada no
 *   próprio suporte, quando ela tem um (ex.: o chimbal inclui a haste). Onde a
 *   especificação não diz, o valor é marcado "provisório" e vai ser conferido
 *   contra os modelos do Módulo 05.
 * POR QUE `readonly` EM TUDO: o domínio é a promessa do projeto; nenhum código
 *   deveria alterá-la em tempo de execução por acidente.
 */
export const BATERIA: Dominio = {
  nome: 'Bateria acústica',
  descricao:
    'Uma plataforma vazia e as peças de um kit de bateria soltas no chão em volta. ' +
    'A pessoa leva cada peça até a plataforma, fixa, ajusta altura e ângulo, e toca.',
  tarefa: {
    enunciado:
      'Montar o kit de bateria sobre a plataforma, fixando cada peça obrigatória e ' +
      'ajustando altura e ângulo até ele poder ser tocado.',
    estadoFinal:
      `Todos os instrumentos e ferragens estão fixados sobre a plataforma, a até ${Math.round(FOLGA_DE_ENCAIXE_M * 100)} cm ` +
      'da superfície útil, e cada instrumento produz som ao ser atingido pela baqueta.',
  },
  plataforma: { ladoInicial: 1.5, ladoMinimo: 1.0, ladoMaximo: 2.5 },
  folgaDeEncaixe: FOLGA_DE_ENCAIXE_M,
  pecas: [
    { id: 'bumbo', nome: 'Bumbo', papel: 'instrumento', dimensoes: caixa(0.56, 0.56, 0.4), origemDaMedida: 'seção 4' },
    { id: 'caixa', nome: 'Caixa', papel: 'instrumento', dimensoes: caixa(0.35, 0.14, 0.35), origemDaMedida: 'seção 4 (diâmetro); altura do casco provisória' },
    { id: 'pedal-bumbo-esquerdo', nome: 'Pedal de bumbo (esquerdo)', papel: 'ferragem', dimensoes: caixa(0.1, 0.08, 0.3), origemDaMedida: 'provisório' },
    { id: 'pedal-bumbo-direito', nome: 'Pedal de bumbo (direito)', papel: 'ferragem', dimensoes: caixa(0.1, 0.08, 0.3), origemDaMedida: 'provisório' },
    { id: 'chimbal', nome: 'Chimbal', papel: 'instrumento', dimensoes: caixa(0.35, 0.8, 0.35), ajuste: faixaDeAltura(0.7, 0.9), origemDaMedida: 'seção 4 (suporte de 70 a 90 cm); pratos de 35 cm provisórios' },
    { id: 'tom-1', nome: 'Tom suspenso 1', papel: 'instrumento', dimensoes: caixa(0.25, 0.2, 0.25), origemDaMedida: 'seção 4 (diâmetro); profundidade provisória' },
    { id: 'tom-2', nome: 'Tom suspenso 2', papel: 'instrumento', dimensoes: caixa(0.3, 0.22, 0.3), origemDaMedida: 'seção 4 (diâmetro); profundidade provisória' },
    { id: 'tom-de-chao', nome: 'Tom de chão', papel: 'instrumento', dimensoes: caixa(0.4, 0.48, 0.4), ajuste: faixaDeAltura(0.45, 0.5), origemDaMedida: 'seção 4' },
    { id: 'prato-ataque', nome: 'Prato de ataque', papel: 'instrumento', dimensoes: caixa(0.4, 0.01, 0.4), ajuste: faixaDeInclinacao(0, 45), origemDaMedida: 'seção 4 (35 a 50 cm)' },
    { id: 'prato-conducao', nome: 'Prato de condução', papel: 'instrumento', dimensoes: caixa(0.5, 0.01, 0.5), ajuste: faixaDeInclinacao(0, 45), origemDaMedida: 'seção 4 (35 a 50 cm)' },
    { id: 'estante-de-prato', nome: 'Estante de prato', papel: 'ferragem', dimensoes: caixa(0.5, 1.2, 0.5), ajuste: faixaDeAltura(0.9, 1.45), origemDaMedida: 'seção 4 (90 a 145 cm); base do tripé provisória' },
    { id: 'estante-de-caixa', nome: 'Estante de caixa', papel: 'ferragem', dimensoes: caixa(0.45, 0.65, 0.45), ajuste: faixaDeAltura(0.6, 0.75), origemDaMedida: 'seção 4 (60 a 75 cm); base provisória' },
    { id: 'banco', nome: 'Banco', papel: 'ferragem', dimensoes: caixa(0.35, 0.5, 0.35), ajuste: faixaDeAltura(0.45, 0.55), origemDaMedida: 'seção 4 (45 a 55 cm); assento provisório' },
    { id: 'baqueta-esquerda', nome: 'Baqueta (esquerda)', papel: 'baqueta', dimensoes: caixa(0.015, 0.015, 0.4), origemDaMedida: 'seção 4' },
    { id: 'baqueta-direita', nome: 'Baqueta (direita)', papel: 'baqueta', dimensoes: caixa(0.015, 0.015, 0.4), origemDaMedida: 'seção 4' },
  ],
};

/**
 * O QUE É: quantas peças o estado final cobra, CONTADAS a partir do domínio.
 * POR QUE CONTAR EM VEZ DE ESCREVER O NÚMERO: número digitado à mão fica
 *   errado no primeiro dia em que o inventário muda e ninguém lembra de
 *   atualizá-lo. Contado, ele acompanha qualquer mudança no inventário sozinho.
 */
export interface ContagemDoEstadoFinal {
  readonly aFixar: number;
  readonly aSoar: number;
  readonly foraDoEstadoFinal: number;
}

/**
 * O QUE FAZ: conta as peças a fixar (instrumentos + ferragens), as que precisam
 *   soar (instrumentos) e as que ficam fora (baquetas).
 * COMO FAZ: `filter` pelo papel e `length`.
 */
export function contarEstadoFinal(dominio: Dominio): ContagemDoEstadoFinal {
  const aFixar: number = dominio.pecas.filter((p) => p.papel !== 'baqueta').length;
  const aSoar: number = dominio.pecas.filter((p) => p.papel === 'instrumento').length;
  return { aFixar, aSoar, foraDoEstadoFinal: dominio.pecas.length - aFixar };
}

/**
 * O QUE É: a conferência do modelo — procura incoerências no domínio.
 * O QUE FAZ: devolve uma lista de FRASES (vazia quando está tudo certo). Confere:
 *   - lado inicial da plataforma dentro do intervalo mínimo–máximo;
 *   - peça repetida no inventário;
 *   - medida zero ou negativa;
 *   - peça a fixar mais larga que a menor plataforma (tarefa impossível);
 *   - faixa de ajuste com mínimo maior que o máximo, ou altura em repouso
 *     fora da faixa do próprio suporte;
 *   - nenhum instrumento (o estado final não teria o que exigir que soe).
 * COMO FAZ: um laço pelas peças, empurrando uma frase para cada problema.
 * OUTRA OPÇÃO: devolver `true/false`, ou rodar só num teste automatizado.
 * POR QUE ESTA: um `false` diz que há defeito e obriga a caçar qual; a frase já
 *   diz QUAL peça e POR QUÊ (Cap. 1, seção 1.6.2). E roda sempre que a página
 *   abre (custa microssegundos) porque "o teste que roda em outro lugar é o
 *   teste que alguém desliga na semana em que ele atrapalha" (mesma seção).
 * POR QUE PRECISAMOS: nenhum desses erros impede o programa de rodar — todos
 *   produzem, mais adiante, uma tarefa que ninguém consegue concluir, sem
 *   mensagem nenhuma. Aqui eles viram texto no começo.
 */
export function inconsistenciasDoDominio(dominio: Dominio): string[] {
  const problemas: string[] = [];
  const vistos: Set<PecaId> = new Set();
  const { ladoInicial, ladoMinimo, ladoMaximo } = dominio.plataforma;

  if (!(ladoMinimo <= ladoInicial && ladoInicial <= ladoMaximo)) {
    problemas.push(
      `O lado inicial da plataforma (${ladoInicial} m) está fora do intervalo de ${ladoMinimo} a ${ladoMaximo} m.`,
    );
  }

  for (const peca of dominio.pecas) {
    // Set guarda os ids já vistos: se aparecer de novo, está duplicado.
    if (vistos.has(peca.id)) {
      problemas.push(`A peça "${peca.id}" aparece duas vezes no inventário.`);
    }
    vistos.add(peca.id);

    const { largura, altura, profundidade } = peca.dimensoes;
    if (largura <= 0 || altura <= 0 || profundidade <= 0) {
      problemas.push(`A peça "${peca.nome}" tem uma dimensão zero ou negativa.`);
    }
    // Baquetas ficam de fora: elas não são fixadas, então não precisam caber.
    if (peca.papel !== 'baqueta' && Math.max(largura, profundidade) > ladoMinimo) {
      problemas.push(
        `A peça "${peca.nome}" não cabe na plataforma mínima de ${ladoMinimo} m, e a tarefa não fecharia.`,
      );
    }

    // Faixa de ajuste: o mínimo vem antes do máximo, e, quando a faixa é de
    // ALTURA, a altura em repouso da peça tem de estar dentro dela (a peça
    // nasce numa posição que o próprio suporte consegue ter).
    const ajuste: FaixaDeAjuste | undefined = peca.ajuste;
    if (ajuste !== undefined) {
      if (!(ajuste.minimo < ajuste.maximo)) {
        problemas.push(`A faixa de ajuste de "${peca.nome}" tem o mínimo maior ou igual ao máximo.`);
      } else if (ajuste.grandeza === 'altura' && (altura < ajuste.minimo || altura > ajuste.maximo)) {
        problemas.push(
          `A altura de "${peca.nome}" (${altura} m) está fora da faixa do próprio suporte (${ajuste.minimo} a ${ajuste.maximo} m).`,
        );
      }
    }
  }

  if (contarEstadoFinal(dominio).aSoar === 0) {
    problemas.push('Nenhuma peça é instrumento: o estado final não teria o que exigir que soe.');
  }

  return problemas;
}
