// ===========================================================================
// sonda.ts — A SONDA DE CAPACIDADES (passo 5 da tarefa)
// ===========================================================================
//
// O QUE É
//   A peça que PERGUNTA ao aparelho o que ele oferece e guarda a resposta numa
//   estrutura (`ResultadoDaSonda`) que o resto do ambiente pode consultar.
//
// O QUE FAZ
//   1. Sem sessão: pergunta que regimes o aparelho aceita e se a página está
//      em HTTPS.
//   2. Abre uma sessão imersiva de verdade (no melhor modo disponível), pede
//      os recursos opcionais e lê: recursos concedidos, espaços de referência,
//      composição do fundo e forma de interação (mão ou vestido).
//   3. Observa 90 quadros contando poses ausentes e poses com posição emulada
//      (estabilidade e graus de liberdade), e anota toda fonte de entrada que
//      aparecer nesse tempo.
//   4. Fecha a sessão e devolve tudo. Se a sessão for recusada, terminar no
//      meio ou os quadros pararem de chegar, devolve o que já tinha descoberto
//      junto com o motivo.
//
// COMO FAZ
//   Com a API WebXR direto: `navigator.xr.requestSession`,
//   `session.enabledFeatures`, `requestReferenceSpace`, `inputSources`,
//   `environmentBlendMode`, `interactionMode`, `requestAnimationFrame` da
//   sessão, o evento `end` e `frame.getViewerPose`.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Perguntar tudo de FORA da sessão, ao carregar a página.
//   b) Presumir pelo tipo de aparelho ("celular sempre tem hit-test").
//
// POR QUE ESTA E NÃO A OUTRA
//   a) Metade das respostas só existe DENTRO da sessão: recursos concedidos,
//      espaços, fontes de entrada e composição são propriedades da sessão,
//      não do navegador. A consulta de fora "responde rápido, funciona no
//      PC, dispensa aparelho... e devolve a lista do que o navegador DIZ
//      suportar" (Cap. 2, seção 1.5). E abrir sessão imersiva exige GESTO
//      de quem usa: o navegador recusa pedido que não venha de um clique.
//      Por isso `sondar()` é chamada pelo botão, nunca ao carregar.
//   b) O enunciado diz: "pronto quando a consulta é feita de verdade contra o
//      aparelho, não simulada nem presumida".
//
// POR QUE PRECISAMOS
//   Sem a sonda o ambiente assumiria capacidades que o aparelho não tem, e
//   falharia em silêncio (ex.: pousar a plataforma com hit-test num celular
//   que negou hit-test → a plataforma aparece em lugar nenhum, sem erro).
//
// A REGRA QUE ATRAVESSA O ARQUIVO: A SONDA SEMPRE TERMINA
//   Uma sonda que fica esperando para sempre é a pior falha silenciosa: a
//   página diz "sondando..." e nada mais acontece, sem erro em lugar nenhum.
//   Por isso cada espera tem saída: o fim da sessão, um tempo limite e a
//   captura de qualquer exceção dentro do quadro. E, no visor, sessão
//   esquecida aberta prende quem está com o aparelho no rosto numa tela vazia.
//
// BASE NO MATERIAL
//   Cap. 2, seções 1.5 a 1.7 (capacidade declarada, três estados, gesto,
//   contexto seguro, "o segundo estado da Bancada"). Projeto do professor:
//   src/bancada/devices/sonda.ts (versão com emulatedPosition). O evento
//   `end`, o `interactionMode` e o retorno `null` de `getViewerPose` são da
//   especificação WebXR, fora do material.
// ===========================================================================

import { REGIMES, type Regime, type RegimeId } from '../modes/regimes';
import { levantarRelatorio, type LinhaDoRelatorio, type Suporte } from '../modes/verificacao';
import { RECURSOS_CONSULTADOS, estadoDoRecurso, type EstadoDeRecurso } from './recursos';
import { ContadorDeEstabilidade, diagnosticar, type Estabilidade } from './estabilidade';
import { classificarAparelho, grausDeLiberdade, type ClasseDeAparelho, type GrausDeLiberdade } from './graus';
import { descreverRecusaDeSessao } from './recusa';

/**
 * O QUE É: o erro que marca uma recusa NA ABERTURA da sessão (`requestSession`).
 * POR QUE UMA CLASSE PRÓPRIA: a mesma exceção (por exemplo `InvalidStateError`)
 *   quer dizer coisas diferentes antes e depois de a sessão abrir. Na abertura
 *   é "já existe outra sessão aberta"; depois, é "esta sessão terminou". Só a
 *   recusa marcada com esta classe recebe as frases de devices/recusa.ts.
 */
class RecusaDeSessao extends Error {
  constructor(public readonly original: unknown) {
    super(original instanceof Error ? original.message : 'recusa sem descrição');
  }
}

/** Os dois modos em que dá para abrir sessão de sondagem ('inline' não tem o que sondar). */
export type ModoSondavel = 'immersive-vr' | 'immersive-ar';

/**
 * O QUE É: os espaços de referência que tentamos obter, do que mais promete
 *   ao mínimo que toda sessão entrega ('viewer').
 * POR QUE TENTAR VÁRIOS: o conjunto concedido é uma das coisas que o relatório
 *   precisa mostrar (Cap. 1, seção 1.4.2: cada espaço promete algo diferente
 *   sobre o mundo físico).
 * POR QUE 'unbounded' NÃO ESTÁ AQUI: um espaço além de 'viewer' e 'local' só é
 *   concedido se tiver sido PEDIDO na abertura da sessão, e 'unbounded' ficou
 *   fora do pedido de propósito (recursos.ts). Tentar mesmo assim daria "não
 *   concedido" em todo aparelho, por causa do nosso código e não do aparelho.
 */
const ESPACOS_TENTADOS: readonly XRReferenceSpaceType[] = ['bounded-floor', 'local-floor', 'local', 'viewer'];

/**
 * O QUE É: quantos quadros a sonda observa antes de fechar: 90 ≈ 1 segundo a
 *   72–90 Hz.
 * OUTRA OPÇÃO: observar por mais tempo. POR QUE NÃO: a sessão imersiva ocupa a
 *   tela inteira do aparelho; 1 s basta para uma leitura e não prende quem
 *   usa. O relatório avisa que a janela é curta.
 */
export const QUADROS_OBSERVADOS: number = 90;

/**
 * O QUE É: quanto tempo, no máximo, a sonda espera pelos 90 quadros: 10 s.
 * POR QUE PRECISAMOS: com a sessão escondida (menu do sistema aberto, visor
 *   tirado do rosto) o aparelho pode parar de entregar quadros SEM encerrar a
 *   sessão. Sem limite, a sonda esperaria para sempre.
 * POR QUE 10 s: 90 quadros levam pouco mais de 1 s a 72 Hz e 3 s a 30 Hz, o
 *   pior aparelho que aceitamos (seção 10). 10 s é folga de sobra para uma
 *   sessão viva e pouco para quem está esperando uma resposta.
 */
const TEMPO_MAXIMO_DE_OBSERVACAO_MS: number = 10_000;

/** Um recurso pedido + o que o aparelho respondeu. */
export interface RecursoSondado {
  readonly nome: string;
  readonly paraQueServe: string;
  readonly estado: EstadoDeRecurso;
}

/**
 * O QUE É: uma "fonte de entrada" — o objeto com que a pessoa age na cena.
 * AS DUAS PROPRIEDADES QUE DECIDEM QUASE TUDO (Cap. 2, seção 1.5):
 *   tem raio (direção de apontamento)? tem pose própria (é rastreada no espaço)?
 *   Dedo na tela: raio sim, pose não. Controle: os dois. Mouse: nenhum.
 *   Para as baquetas da bateria, precisamos de pose própria (velocidade do golpe).
 */
export interface FonteDeEntradaSondada {
  readonly lado: string; // 'left' | 'right' | 'none'
  readonly mira: string; // 'tracked-pointer' (controle) | 'gaze' (olhar) | 'screen' (toque)
  readonly temPoseDePunho: boolean; // gripSpace não nulo → pose própria no espaço
  readonly temMao: boolean; // hand não nulo → mão articulada
  readonly perfis: readonly string[]; // modelos declarados, do mais específico ao genérico
}

/** O que se descobre SEM abrir sessão. */
export interface SondaSemSessao {
  readonly temApiXr: boolean;
  readonly contextoSeguro: boolean;
  readonly regimes: readonly LinhaDoRelatorio[];
  readonly modosSuportados: readonly string[];
}

/** O que só a SESSÃO responde. */
export interface SondaEmSessao {
  readonly modo: ModoSondavel;
  readonly recursos: readonly RecursoSondado[];
  readonly espacosConcedidos: readonly string[];
  readonly composicaoObservada: XREnvironmentBlendMode;
  /** 'screen-space' (na mão) ou 'world-space' (vestido); `undefined` se a sessão não informa. */
  readonly modoDeInteracao: XRInteractionMode | undefined;
  /** Todas as fontes de entrada que apareceram DURANTE a observação. */
  readonly fontesDeEntrada: readonly FonteDeEntradaSondada[];
  readonly graus: GrausDeLiberdade;
  readonly posesObservadas: number;
  readonly posesComPosicaoEmulada: number;
  readonly estabilidade: Estabilidade;
  readonly diagnostico: string;
  /** Por que a observação parou antes dos 90 quadros; `undefined` se foi até o fim. */
  readonly interrupcao: string | undefined;
}

/**
 * O QUE É: a estrutura que "o resto do ambiente pode consultar" (enunciado).
 * POR QUE `emSessao` PODE SER `undefined`: no PC não existe sessão imersiva, e
 *   no aparelho que recusou não chegou a existir; o tipo obriga quem lê a
 *   tratar esse caso, e `motivoSemSessao` diz por quê.
 */
export interface ResultadoDaSonda {
  readonly semSessao: SondaSemSessao;
  readonly emSessao: SondaEmSessao | undefined;
  readonly motivoSemSessao: string | undefined;
  readonly classe: ClasseDeAparelho;
}

/**
 * O QUE FAZ: a parte que não precisa de sessão nem de gesto.
 * POR QUE ACEITA AS LINHAS JÁ CONSULTADAS: a página faz essa consulta ao
 *   carregar. Reaproveitá-la no clique faz o pedido de sessão sair logo depois
 *   do clique; refazer as três consultas antes poderia gastar o tempo em que o
 *   navegador ainda aceita o clique como gesto (em alguns aparelhos a primeira
 *   consulta de AR demora).
 * POR QUE CONFERIR `isSecureContext`: fora de contexto seguro a API WebXR nem
 *   aparece, e o sintoma é idêntico ao de um aparelho sem suporte — "uma
 *   mentira sobre o aparelho causada pela URL" (Cap. 2, seção 1.7).
 * POR QUE "CONTEXTO SEGURO" E NÃO SÓ "HTTPS" NOS TEXTOS: é isso que
 *   `isSecureContext` responde. HTTPS dá contexto seguro, mas endereços locais
 *   (localhost, 127.0.0.1) também recebem esse tratamento mesmo em HTTP. Dizer
 *   "está em HTTPS" seria afirmar uma coisa que a verificação não confere.
 */
export async function sondarSemSessao(regimesJaConsultados?: readonly LinhaDoRelatorio[]): Promise<SondaSemSessao> {
  const regimes: readonly LinhaDoRelatorio[] = regimesJaConsultados ?? (await levantarRelatorio());
  return {
    temApiXr: navigator.xr !== undefined,
    contextoSeguro: window.isSecureContext,
    regimes,
    modosSuportados: regimes.filter((l) => l.suporte === 'sim').map((l) => l.regime.id),
  };
}

/** O QUE FAZ: lê na tabela a resposta dada para um regime ('desconhecido' se ele não estiver lá). */
function suporteNaTabela(semSessao: SondaSemSessao, id: RegimeId): Suporte {
  return semSessao.regimes.find((l) => l.regime.id === id)?.suporte ?? 'desconhecido';
}

/**
 * O QUE FAZ: pede cada espaço de referência e guarda os que vieram.
 * COMO FAZ: `requestReferenceSpace` REJEITA quando o espaço não é concedido.
 * POR QUE O `catch` VAZIO NÃO ESCONDE ERRO: aqui a rejeição É a resposta
 *   ("não concedido"), não uma falha do código.
 */
async function espacosConcedidos(sessao: XRSession): Promise<string[]> {
  const obtidos: string[] = [];
  for (const tipo of ESPACOS_TENTADOS) {
    try {
      await sessao.requestReferenceSpace(tipo);
      obtidos.push(tipo);
    } catch {
      // não concedido — é resposta, não erro
    }
  }
  return obtidos;
}

/**
 * O QUE FAZ: copia os dados de uma fonte de entrada para o formato do relatório.
 * POR QUE `!= null` (e não `!== undefined`) EM `gripSpace` E `hand`: a
 *   especificação WebXR declara os dois como anuláveis, e o navegador entrega
 *   `null` quando a fonte não tem aquele espaço (toque na tela e olhar não
 *   têm punho; controle não tem mão articulada). Testando só `undefined`, um
 *   `null` passaria como "tem", e o relatório afirmaria uma capacidade que a
 *   fonte nunca declarou. O `!= null` (com um sinal de igual só) recusa os
 *   dois de uma vez. É o mesmo cuidado de `getViewerPose` (ver observarQuadros).
 * COMPARADO AO PROJETO DO PROFESSOR: lá os dois campos são comparados com
 *   `undefined`, seguindo os tipos do pacote @types/webxr. Aqui seguimos a
 *   especificação, que é o que o navegador faz de fato.
 */
function lerFonte(fonte: XRInputSource): FonteDeEntradaSondada {
  return {
    lado: fonte.handedness,
    mira: fonte.targetRayMode,
    temPoseDePunho: fonte.gripSpace != null,
    temMao: fonte.hand != null,
    perfis: [...fonte.profiles],
  };
}

/**
 * O QUE É: uma camada de desenho mínima para a sessão.
 * POR QUE PRECISAMOS: a especificação WebXR só entrega quadros a uma sessão
 *   que tenha superfície de composição (`baseLayer`). Não desenhamos nada
 *   nela — ela existe só para os quadros começarem a chegar.
 * POR QUE NÃO USAR O RENDERER DO THREE.JS AQUI: a sonda é independente da
 *   cena (Cap. 3: módulos que se ignoram). Com um canvas próprio, a sonda
 *   funciona mesmo se a cena não existir ou falhar.
 * POR QUE DEVOLVE O CONTEXTO: para ser liberado depois que a sessão fecha
 *   (ver `sondarEmSessao`); cada sondagem cria um, e o navegador limita
 *   quantos contextos WebGL uma página pode ter ao mesmo tempo.
 */
function camadaMinima(sessao: XRSession): WebGL2RenderingContext {
  const tela: HTMLCanvasElement = document.createElement('canvas');
  const gl: WebGL2RenderingContext | null = tela.getContext('webgl2', { xrCompatible: true });
  if (gl === null) {
    throw new Error('Este navegador não entregou contexto WebGL 2 compatível com XR.');
  }
  // Se a camada não puder ser criada (a sessão já terminou, por exemplo), o
  // contexto recém-criado não chegaria a quem o libera; ele é devolvido aqui.
  try {
    sessao.updateRenderState({ baseLayer: new XRWebGLLayer(sessao, gl) });
  } catch (erro: unknown) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw erro;
  }
  return gl;
}

/** O que a observação dos quadros devolve. */
interface Observacao {
  readonly estabilidade: Estabilidade;
  readonly posesObservadas: number;
  readonly posesComPosicaoEmulada: number;
  readonly fontes: readonly FonteDeEntradaSondada[];
  readonly interrupcao: string | undefined;
}

/**
 * O QUE FAZ: observa até `QUADROS_OBSERVADOS` quadros da sessão.
 * COMO FAZ: usa o `requestAnimationFrame` DA SESSÃO (não o da janela — dentro
 *   da sessão imersiva o da janela não é chamado; Cap. 3, seção 1.4.1). Em
 *   cada quadro pede a pose de quem observa e anota: veio? estava visível?
 *   a posição era emulada? E anota as fontes de entrada presentes.
 *
 * AS TRÊS SAÍDAS ALÉM DO FIM NORMAL (todas passam por `concluir`, que só age
 *   uma vez):
 *   1. evento `end`: a pessoa saiu da sessão (botão do sistema, visor tirado).
 *      O `requestAnimationFrame` da sessão para de chamar, e sem isto a
 *      promessa nunca resolveria;
 *   2. tempo limite: a sessão continua viva mas os quadros pararam (sessão
 *      escondida);
 *   3. exceção dentro do quadro: um erro no callback não vira rejeição da
 *      promessa sozinho; ele sumiria no console e a sonda ficaria parada.
 *   Nas duas primeiras a observação PARCIAL é devolvida com o motivo, porque
 *   o que já foi contado continua sendo resposta do aparelho. Na terceira, a
 *   promessa rejeita: é defeito, não resposta.
 *
 * POR QUE `pose !== null && pose !== undefined`: a especificação WebXR diz
 *   que `getViewerPose` devolve `null` quando não há pose (comum nos primeiros
 *   quadros, enquanto o rastreamento começa). Os tipos do pacote @types/webxr
 *   declaram `undefined`, e por isso o compilador aceitaria testar só isso.
 *   Testando só `undefined`, um `null` contaria como pose e o acesso a
 *   `pose.emulatedPosition` lançaria erro no primeiro quadro sem rastreamento.
 *
 * COMPARADO AO PROJETO DO PROFESSOR: a contagem de poses é a mesma (pose
 *   veio? posição emulada?), e a ideia de observar 90 quadros vem de lá. Na
 *   Bancada a observação termina só ao completar os 90 quadros e a pose
 *   ausente é testada como `undefined`; aqui entram as três saídas acima e o
 *   teste de `null`, porque são justamente os casos em que o rastreamento
 *   começa ou se perde, que é o que a sonda existe para ver.
 *
 * POR QUE AS FONTES SÃO LIDAS EM TODO QUADRO E NÃO SÓ NO FIM: a lista muda
 *   durante o uso (controle ligado aparece, toque na tela aparece e some).
 *   Lida só no fim, uma fonte que existiu no meio sumiria do relatório. O
 *   `Map` usa o próprio objeto da fonte como chave, então cada uma entra uma
 *   vez só.
 */
function observarQuadros(
  sessao: XRSession,
  referencia: XRReferenceSpace,
  jaEncerrada: () => boolean,
): Promise<Observacao> {
  return new Promise<Observacao>((resolver, rejeitar) => {
    const contador: ContadorDeEstabilidade = new ContadorDeEstabilidade();
    const fontes: Map<XRInputSource, FonteDeEntradaSondada> = new Map();
    let restantes: number = QUADROS_OBSERVADOS;
    let posesObservadas: number = 0;
    let posesComPosicaoEmulada: number = 0;
    let concluida: boolean = false;

    const quadrosVistos = (): number => QUADROS_OBSERVADOS - restantes;

    function concluir(interrupcao: string | undefined): void {
      if (concluida) {
        return;
      }
      concluida = true;
      window.clearTimeout(limite);
      sessao.removeEventListener('end', aoEncerrar);
      resolver({
        estabilidade: contador.resultado(),
        posesObservadas,
        posesComPosicaoEmulada,
        fontes: [...fontes.values()],
        interrupcao,
      });
    }

    function aoEncerrar(): void {
      concluir(
        `A sessão terminou depois de ${quadrosVistos()} dos ${QUADROS_OBSERVADOS} quadros, antes do fim da observação. ` +
          'Isso acontece quando alguém sai pelo botão do sistema ou tira o visor.',
      );
    }

    const limite: number = window.setTimeout(() => {
      concluir(
        `Em ${TEMPO_MAXIMO_DE_OBSERVACAO_MS / 1000} s chegaram só ${quadrosVistos()} dos ${QUADROS_OBSERVADOS} quadros. ` +
          'A sessão estava aberta, mas o aparelho parou de entregar imagens.',
      );
    }, TEMPO_MAXIMO_DE_OBSERVACAO_MS);

    sessao.addEventListener('end', aoEncerrar);
    // A sessão pode ter terminado ANTES de este ouvinte existir (entre o
    // último pedido de espaço e esta linha). O evento já passou e não volta;
    // sem esta conferência, a sonda esperaria os 10 s e daria o motivo errado.
    if (jaEncerrada()) {
      aoEncerrar();
      return;
    }

    const passo: XRFrameRequestCallback = (_tempo: number, quadro: XRFrame): void => {
      if (concluida) {
        return;
      }
      try {
        const pose: XRViewerPose | null | undefined = quadro.getViewerPose(referencia);
        const temPose: boolean = pose !== null && pose !== undefined;
        const visivel: boolean = sessao.visibilityState === 'visible';
        contador.registrar(temPose, visivel);
        // Só pose de quadro VISÍVEL entra na leitura dos graus: com o menu do
        // sistema aberto a pose pode vir congelada ou estimada, e contá-la
        // misturaria o comportamento do menu com o do rastreamento (mesma
        // separação que o contador de estabilidade faz).
        if (visivel && pose !== null && pose !== undefined) {
          posesObservadas += 1;
          if (pose.emulatedPosition) {
            posesComPosicaoEmulada += 1;
          }
        }
        for (const fonte of sessao.inputSources) {
          if (!fontes.has(fonte)) {
            fontes.set(fonte, lerFonte(fonte));
          }
        }
        restantes -= 1;
        if (restantes > 0) {
          sessao.requestAnimationFrame(passo);
          return;
        }
        concluir(undefined);
      } catch (erro: unknown) {
        concluida = true;
        window.clearTimeout(limite);
        sessao.removeEventListener('end', aoEncerrar);
        rejeitar(erro);
      }
    };
    sessao.requestAnimationFrame(passo);
  });
}

/**
 * O QUE FAZ: abre a sessão, lê tudo o que só ela responde e fecha.
 * PASSOS: pede a sessão com os recursos OPCIONAIS → cria a camada mínima →
 *   lê `enabledFeatures` → testa os espaços → escolhe uma referência
 *   ('local-floor' se houver, senão 'viewer') → observa os quadros → monta o
 *   resultado.
 * POR QUE O `finally`: a sessão precisa terminar MESMO se algo falhar no meio.
 *   Sessão imersiva esquecida aberta prende o visor numa tela vazia, e quem
 *   está com o aparelho no rosto só sai pelo menu do sistema.
 * POR QUE GUARDAR `encerrada`: chamar `end()` numa sessão que já terminou
 *   lança `InvalidStateError`, e esse erro, lançado dentro do `finally`,
 *   esconderia o motivo verdadeiro da falha. O `catch` em volta do `end()`
 *   cobre a sessão que termina entre a conferência e o pedido.
 * COMPARADO AO PROJETO DO PROFESSOR: o `finally` que sempre fecha a sessão é
 *   dele, com o mesmo motivo (visor preso numa tela vazia). Lá o `end()` é
 *   chamado sem conferir; aqui a conferência entra porque a nossa observação
 *   pode terminar pelo evento `end`, com a sessão já fechada.
 */
export async function sondarEmSessao(modo: ModoSondavel): Promise<SondaEmSessao> {
  const xr: XRSystem | undefined = navigator.xr;
  if (xr === undefined) {
    throw new Error('Não há API WebXR neste navegador.');
  }
  let sessao: XRSession;
  try {
    sessao = await xr.requestSession(modo, {
      optionalFeatures: RECURSOS_CONSULTADOS.map((r) => r.nome),
    });
  } catch (erro: unknown) {
    throw new RecusaDeSessao(erro);
  }
  let encerrada: boolean = false;
  sessao.addEventListener('end', () => {
    encerrada = true;
  });
  let gl: WebGL2RenderingContext | undefined;

  try {
    gl = camadaMinima(sessao);
    const concedidos: readonly string[] | undefined = sessao.enabledFeatures;
    const espacos: string[] = await espacosConcedidos(sessao);
    const referencia: XRReferenceSpace = await sessao.requestReferenceSpace(
      espacos.includes('local-floor') ? 'local-floor' : 'viewer',
    );
    const obs: Observacao = await observarQuadros(sessao, referencia, () => encerrada);

    return {
      modo,
      recursos: RECURSOS_CONSULTADOS.map((r) => ({
        nome: r.nome,
        paraQueServe: r.paraQueServe,
        estado: estadoDoRecurso(r.nome, concedidos),
      })),
      espacosConcedidos: espacos,
      composicaoObservada: sessao.environmentBlendMode,
      modoDeInteracao: sessao.interactionMode,
      fontesDeEntrada: obs.fontes,
      graus: grausDeLiberdade(obs),
      posesObservadas: obs.posesObservadas,
      posesComPosicaoEmulada: obs.posesComPosicaoEmulada,
      estabilidade: obs.estabilidade,
      diagnostico: diagnosticar(obs.estabilidade),
      interrupcao: obs.interrupcao,
    };
  } catch (erro: unknown) {
    // Se a sessão acabou no meio de uma leitura, o erro que chega é um efeito
    // disso: o navegador lança `InvalidStateError` ao pedir algo de uma sessão
    // encerrada, às vezes antes de o evento `end` ter chegado. A frase diz a
    // causa em vez do efeito.
    if (encerrada || (erro instanceof DOMException && erro.name === 'InvalidStateError')) {
      throw new Error('A sessão terminou antes de a sonda terminar de ler as respostas dela.');
    }
    throw erro;
  } finally {
    if (!encerrada) {
      try {
        await sessao.end();
      } catch {
        // terminou sozinha entre a conferência e o pedido: nada a fechar
      }
    }
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/**
 * O QUE FAZ: escolhe em que modo abrir a sessão de sondagem.
 * POR QUE AR ANTES DE VR: a sessão AR responde mais coisas (câmera,
 *   superfícies, hit-test, forma de interação). Um aparelho que faz os dois é
 *   sondado em AR; o relatório avisa que o outro modo não foi aberto.
 * POR QUE NÃO ABRIR OS DOIS: cada sessão imersiva precisa de um clique
 *   próprio, e ao fim da primeira o clique já não vale para a segunda.
 */
export function modoPreferido(modosSuportados: readonly string[]): ModoSondavel | undefined {
  const ordem: readonly ModoSondavel[] = ['immersive-ar', 'immersive-vr'];
  return ordem.find((modo) => modosSuportados.includes(modo));
}

/**
 * O QUE FAZ: explica por que não houve modo para sondar.
 * OS TRÊS CASOS, DO MAIS ESPECÍFICO AO MAIS GERAL:
 *   - sem API: navegador sem WebXR ou página sem HTTPS;
 *   - alguma consulta sem resposta: a consulta falhou, e falha de consulta
 *     não prova que o aparelho não tenha o modo;
 *   - as duas consultas disseram "não": aí sim é característica do aparelho.
 */
function motivoSemModo(semSessao: SondaSemSessao, vr: Suporte, ar: Suporte): string {
  if (!semSessao.temApiXr) {
    return 'Este navegador não tem WebXR. Se a página não estiver em contexto seguro (HTTPS ou endereço local), o problema pode ser o endereço usado.';
  }
  if (vr === 'desconhecido' || ar === 'desconhecido') {
    return 'O navegador tem WebXR, mas a consulta aos modos imersivos falhou sem resposta. Isso não prova que o aparelho não tenha esses modos, então nenhuma sessão foi tentada.';
  }
  return 'Este aparelho não oferece nenhuma sessão imersiva, então a parte da sonda que precisa de sessão não pôde rodar. Isso é uma característica do aparelho.';
}

/**
 * O QUE FAZ: a sonda completa — o que o botão da página chama.
 * COMO FAZ: sempre a parte sem sessão; se houver modo imersivo, a parte em
 *   sessão; senão, devolve o MOTIVO de não ter havido sessão.
 * POR QUE A RECUSA VIRA RESULTADO E NÃO EXCEÇÃO: a recusa também diz algo
 *   sobre o aparelho, e o que a parte sem sessão já descobriu continua valendo.
 *   Se a recusa fosse lançada, quem chamou receberia só o erro, e a página
 *   perderia a tabela de regimes e o texto que vai para "Copiar dados".
 * COMPARADO AO PROJETO DO PROFESSOR: lá a recusa sobe como exceção e vira
 *   frase no diário (explicarFalha). A frase continua existindo aqui
 *   (devices/recusa.ts); a diferença é que ela também fica guardada no
 *   resultado, para o botão de exportar levar junto.
 */
export async function sondar(regimesJaConsultados?: readonly LinhaDoRelatorio[]): Promise<ResultadoDaSonda> {
  const semSessao: SondaSemSessao = await sondarSemSessao(regimesJaConsultados);
  const vr: Suporte = suporteNaTabela(semSessao, 'immersive-vr');
  const ar: Suporte = suporteNaTabela(semSessao, 'immersive-ar');
  const semLeitura = (motivo: string): ResultadoDaSonda => ({
    semSessao,
    emSessao: undefined,
    motivoSemSessao: motivo,
    classe: classificarAparelho({
      temApiXr: semSessao.temApiXr,
      vr,
      ar,
      graus: 'indeterminado',
      modoDeInteracao: undefined,
    }),
  });

  const modo: ModoSondavel | undefined = modoPreferido(semSessao.modosSuportados);
  if (modo === undefined) {
    return semLeitura(motivoSemModo(semSessao, vr, ar));
  }

  let emSessao: SondaEmSessao;
  try {
    emSessao = await sondarEmSessao(modo);
  } catch (erro: unknown) {
    // Recusa na abertura: a frase de recusa.ts. Qualquer outra falha (depois de
    // a sessão abrir): a mensagem do próprio erro, que já diz o que houve.
    const recusa: string | undefined =
      erro instanceof RecusaDeSessao ? descreverRecusaDeSessao(erro.original) : undefined;
    const detalhe: string =
      recusa ?? `A sondagem parou: ${erro instanceof Error ? erro.message : 'o navegador não descreveu o motivo.'}`;
    return semLeitura(`Tentamos abrir a sessão ${modo}. ${detalhe}`);
  }

  return {
    semSessao,
    emSessao,
    motivoSemSessao: undefined,
    classe: classificarAparelho({
      temApiXr: semSessao.temApiXr,
      vr,
      ar,
      graus: emSessao.graus,
      modoDeInteracao: emSessao.modoDeInteracao,
    }),
  };
}

/**
 * O QUE FAZ: compara a composição que DECLARAMOS em regimes.ts com a que a
 *   sessão informou.
 * POR QUE PRECISAMOS: é a primeira linha do relatório capaz de DESMENTIR o
 *   grupo. "O desmentido é o resultado mais valioso dos dois: custa uma
 *   correção de uma linha agora e evita construir duas etapas sobre uma
 *   premissa falsa" (Cap. 2, seção 1.6).
 */
export function conferirComposicao(emSessao: SondaEmSessao): string {
  const regime: Regime | undefined = REGIMES.find((r) => r.id === emSessao.modo);
  if (regime === undefined) {
    return 'O regime sondado não consta da declaração de regimes.';
  }
  if (regime.composicaoEsperada === emSessao.composicaoObservada) {
    return `A composição declarada (${regime.composicaoEsperada}) foi confirmada pela sessão.`;
  }
  return (
    `Declaramos a composição ${regime.composicaoEsperada}, mas a sessão informou ` +
    `${emSessao.composicaoObservada}. Precisamos corrigir a declaração em regimes.ts.`
  );
}
