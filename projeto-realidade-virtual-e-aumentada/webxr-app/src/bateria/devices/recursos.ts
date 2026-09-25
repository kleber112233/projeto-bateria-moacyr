// ===========================================================================
// recursos.ts — OS RECURSOS OPCIONAIS QUE A SONDA PEDE (passo 5 da tarefa)
// ===========================================================================
//
// O QUE É
//   O catálogo dos recursos da WebXR que a bateria vai precisar (achar o chão,
//   âncoras, planos...) e a classificação do que o aparelho respondeu sobre
//   cada um depois que a sessão abriu.
//
// O QUE FAZ
//   Define a lista a pedir e transforma a resposta da sessão em um de três
//   estados: concedido, negado ou indeterminado.
//
// COMO FAZ
//   A sessão devolve `session.enabledFeatures` (lista do que foi ligado).
//   Comparamos cada nome pedido com essa lista.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Registrar só "tem / não tem" (booleano).
//
// POR QUE ESTA E NÃO A OUTRA
//   O enunciado da tarefa pede: "preserve a diferença entre recurso ausente e
//   recurso negado". A WebXR trata os dois do mesmo jeito na hora de pedir —
//   os dois simplesmente não aparecem. E existe um terceiro caso: a sessão
//   que nem manda a lista (`enabledFeatures` é opcional na especificação).
//   Com booleano, esse "não sei" viraria "negado", e o relatório ficaria MAIS
//   confiante justamente quando sabe MENOS (Cap. 2, seção 1.6).
//
// POR QUE PRECISAMOS
//   Nos próximos módulos o ambiente decide o que tentar a partir daqui: só
//   usa hit-test no celular se `hit-test` veio concedido; se veio negado,
//   avisa em vez de fingir. "Assumir capacidade que o aparelho nunca declarou
//   é a origem da maior parte das falhas silenciosas" (enunciado, passo 5).
//
// BASE NO MATERIAL
//   Cap. 2, seção 1.6 ("Concedido, negado, e o que ninguém respondeu") e o
//   catálogo com o campo "para que serve". Projeto do professor:
//   src/bancada/devices/recursos.ts.
// ===========================================================================

/**
 * O QUE É: o que se sabe sobre um recurso depois de a sessão abrir.
 *   - `concedido`: o nome está em `enabledFeatures` → pode usar;
 *   - `negado`: a sessão mandou a lista e o nome NÃO está → recusado (a razão
 *     não é exposta; inventá-la seria inventar o diagnóstico);
 *   - `indeterminado`: a sessão não mandou lista nenhuma → falta de resposta.
 */
export type EstadoDeRecurso = 'concedido' | 'negado' | 'indeterminado';

/**
 * O QUE É: um item do catálogo.
 * POR QUE `paraQueServe`: para a máquina é inútil; para as pessoas é o que
 *   impede a lista de crescer "por precaução". Recurso que ninguém justifica
 *   em uma frase não entra (Cap. 2, seção 1.6).
 */
export interface RecursoOpcional {
  /** Nome EXATO da especificação WebXR. Não traduzir: nome errado é ignorado sem aviso. */
  readonly nome: string;
  readonly paraQueServe: string;
}

/**
 * O QUE É: os recursos que a bateria pede.
 * POR QUE TODOS COMO OPCIONAIS (`optionalFeatures`) e nenhum obrigatório
 *   (`requiredFeatures`): se um obrigatório faltasse, o aparelho recusaria a
 *   sessão INTEIRA, e a sonda perderia todo o resto da informação.
 * POR QUE A LISTA É CURTA: cada recurso pedido é mais uma coisa que pode ser
 *   negada e mais um caso a tratar.
 * O QUE FICOU DE FORA E POR QUÊ:
 *   - 'unbounded': a bateria cabe numa sala; não temos uso para áreas maiores.
 *   - 'depth-sensing': exige um dicionário de configuração próprio no pedido,
 *     e um pedido malformado derruba a sessão inteira (mesmo motivo registrado
 *     pelo professor no projeto dele).
 */
export const RECURSOS_CONSULTADOS: readonly RecursoOpcional[] = [
  {
    nome: 'local-floor',
    paraQueServe: 'coloca a origem no chão real, para a plataforma nascer no piso e as alturas das estantes serem reais',
  },
  {
    nome: 'bounded-floor',
    paraQueServe: 'informa os limites da área livre no visor, para ver se cabe a área de 2,5 m por 2,5 m da seção 4',
  },
  {
    nome: 'hit-test',
    paraQueServe: 'no celular, achar o chão real onde a plataforma vai ser pousada',
  },
  {
    nome: 'anchors',
    paraQueServe: 'manter a plataforma presa ao chão enquanto a pessoa anda em volta (seção 2)',
  },
  {
    nome: 'plane-detection',
    paraQueServe: 'receber o plano do chão para saber se a plataforma redimensionada cabe (seção 5)',
  },
  {
    nome: 'hand-tracking',
    paraQueServe: 'segurar as baquetas com a mão, sem controle. Ainda está fora do escopo, pedimos só para registrar',
  },
];

/**
 * O QUE FAZ: classifica um recurso pedido contra a lista que a sessão mandou.
 * COMO FAZ: `concedidos === undefined` significa "a sessão não disse" →
 *   indeterminado; senão, está ou não está na lista.
 * POR QUE O TIPO ACEITA `undefined`: porque é isso que o navegador pode
 *   entregar de verdade. Se o tipo não aceitasse, o compilador nos deixaria
 *   esquecer esse caso.
 */
export function estadoDoRecurso(nome: string, concedidos: readonly string[] | undefined): EstadoDeRecurso {
  if (concedidos === undefined) {
    return 'indeterminado';
  }
  return concedidos.includes(nome) ? 'concedido' : 'negado';
}
