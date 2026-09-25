// ===========================================================================
// verificacao.ts — "ESTE APARELHO ENTRA NESTE REGIME?" (parte do passo 5)
// ===========================================================================
//
// O QUE É
//   A consulta mais grossa ao aparelho, feita SEM abrir sessão: para cada
//   regime declarado, pergunta se o aparelho consegue rodar aquele regime.
//
// O QUE FAZ
//   Devolve uma linha por regime com a resposta (sim / não / desconhecido) e
//   uma observação legível. Alimenta a tabela de regimes e a escolha do modo
//   em que a sonda vai abrir a sessão.
//
// COMO FAZ
//   - Visor e celular: `navigator.xr.isSessionSupported(modo)`, método da API
//     WebXR que devolve uma promessa de booleano.
//   - Janela: pergunta se o navegador entrega um contexto WebGL 2, porque é
//     com WebGL 2, e não com sessão XR, que o modo janela desenha
//     (core/palco.ts). A versão do Three.js usada no projeto não desenha mais
//     com WebGL 1, então só WebGL 2 conta como "entra".
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Olhar o nome do navegador/aparelho (userAgent) e deduzir "é um Quest,
//      logo tem VR".
//   b) Perguntar `isSessionSupported('inline')` também para a janela.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) O nome do aparelho é editável, imitado por outros e envelhece a cada
//      versão. O que conta é o que a PLATAFORMA declara agora (Cap. 2, seção
//      1.5, "capacidade declarada"). Deduzir pelo nome é "a origem de uma
//      família inteira de defeitos que só aparecem no aparelho de outra pessoa".
//   b) A sessão 'inline' é outra coisa: uma sessão XR desenhada dentro da
//      página. O nosso modo janela não abre sessão nenhuma. Perguntando por
//      'inline', o iPhone (que não tem WebXR) responderia "sem resposta" para
//      a janela, com a cena rodando na tela logo acima: o relatório
//      contradiria o que a pessoa vê. A pergunta tem de ser sobre o que o
//      regime USA de verdade.
//
// COMPARADO AO PROJETO DO PROFESSOR
//   A tabela de três valores (sim / não / desconhecido) e o `try` em volta de
//   `isSessionSupported` são os dele. Lá os três regimes são perguntados à
//   WebXR, inclusive a janela ('inline'); aqui a janela é perguntada ao WebGL,
//   pelo motivo do item b acima. Os regimes imersivos seguem iguais.
//
// POR QUE PRECISAMOS
//   Sem isso, o ambiente tentaria abrir VR num PC e falharia; ou, pior, nem
//   tentaria num aparelho que suporta.
//
// BASE NO MATERIAL
//   Cap. 2, seção 1.5 (o que se pergunta a um aparelho; a resposta em três
//   valores). Projeto do professor: src/bancada/modes/verificacao.ts. A
//   consulta de WebGL é conhecimento de Web, fora do material.
// ===========================================================================

import { REGIMES, type Regime, type RegimeId } from './regimes';

/**
 * O QUE É: a resposta à pergunta "entra?".
 * POR QUE TRÊS VALORES E NÃO BOOLEANO: "desconhecido" não é "não". Um navegador
 *   sem WebXR (ex.: Safari do iPhone) ou uma página em HTTP não está dizendo
 *   que o aparelho não serve — está dizendo que não sabe responder. Com
 *   booleano, esse caso viraria "não suporta" em silêncio, e o relatório
 *   afirmaria uma mentira sobre o aparelho (Cap. 2, seção 1.5).
 */
export type Suporte = 'sim' | 'nao' | 'desconhecido';

/** Uma linha da tabela de regimes: o regime declarado + o que o aparelho respondeu. */
export interface LinhaDoRelatorio {
  readonly regime: Regime;
  readonly suporte: Suporte;
  readonly observacao: string;
}

/**
 * O QUE FAZ: pergunta se o navegador entrega WebGL 2, o que o modo janela usa.
 * COMO FAZ: cria um canvas solto (nunca entra na página) e pede WebGL 2. Em
 *   seguida devolve o contexto ao navegador.
 * POR QUE NÃO ACEITAR WEBGL 1 COMO RESERVA: o Three.js deixou de desenhar com
 *   WebGL 1 (desde a versão 163; o projeto usa a 185). Um navegador só com
 *   WebGL 1 faria a tabela dizer "entra" enquanto a cena falha ao montar.
 * POR QUE DEVOLVER O CONTEXTO (`loseContext`): o navegador limita quantos
 *   contextos WebGL uma página pode ter ao mesmo tempo (em torno de 16). Um
 *   contexto de teste esquecido ocupa uma dessas vagas até a página fechar.
 * POR QUE NUNCA DÁ 'desconhecido': a consulta é local e síncrona; ou o
 *   contexto vem, ou não vem.
 */
function suporteDaJanela(): Suporte {
  const tela: HTMLCanvasElement = document.createElement('canvas');
  const gl: WebGL2RenderingContext | null = tela.getContext('webgl2');
  if (gl === null) {
    return 'nao';
  }
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return 'sim';
}

/**
 * O QUE FAZ: pergunta ao navegador por UM modo imersivo.
 * COMO FAZ: sem `navigator.xr` → 'desconhecido'; com ele, chama
 *   `isSessionSupported` dentro de `try` porque alguns navegadores REJEITAM a
 *   promessa (em vez de responder false) para modos que não conhecem ou fora
 *   de HTTPS. Rejeição = não houve resposta utilizável = 'desconhecido'.
 */
async function suporteImersivo(id: Exclude<RegimeId, 'inline'>): Promise<Suporte> {
  const xr: XRSystem | undefined = navigator.xr;
  if (xr === undefined) {
    return 'desconhecido';
  }
  try {
    return (await xr.isSessionSupported(id)) ? 'sim' : 'nao';
  } catch {
    return 'desconhecido';
  }
}

/**
 * O QUE FAZ: escolhe a pergunta certa para cada regime.
 * POR QUE O `switch` SEM `default`: se um regime novo entrar em `RegimeId`, o
 *   compilador acusa aqui que ninguém decidiu como perguntar por ele.
 */
async function suporteDe(id: RegimeId): Promise<Suporte> {
  switch (id) {
    case 'inline':
      return suporteDaJanela();
    case 'immersive-vr':
    case 'immersive-ar':
      return suporteImersivo(id);
  }
}

/** Frase para cada resposta — o relatório precisa ser lido por quem não escreveu o código. */
function observacaoDe(id: RegimeId, suporte: Suporte): string {
  if (id === 'inline') {
    return suporte === 'sim'
      ? 'Este navegador entrega WebGL 2, que é o que o modo janela usa para desenhar. Não depende de WebXR.'
      : 'Este navegador não entregou WebGL 2, então nem o modo janela consegue desenhar a cena.';
  }
  switch (suporte) {
    case 'sim':
      return 'Ainda falta testar em sessão se o registro funciona como declaramos.';
    case 'nao':
      return 'O aparelho respondeu que não suporta este modo.';
    case 'desconhecido':
      return 'Ou o navegador não tem WebXR, ou a página não está em contexto seguro, ou a consulta falhou sem resposta.';
  }
}

/**
 * O QUE FAZ: roda a pergunta para os três regimes e monta as linhas.
 * POR QUE `async`: a API responde por promessa — o navegador pode precisar
 *   consultar o sistema do aparelho antes de saber (Cap. 1, seção 1.7.1:
 *   "perguntar ao navegador é consulta ao aparelho, e não leitura de constante").
 * POR QUE UM DE CADA VEZ (`for` + `await`) e não `Promise.all`: são só três e
 *   a ordem da tabela fica garantida; ganhar alguns milissegundos não compensa.
 */
export async function levantarRelatorio(): Promise<LinhaDoRelatorio[]> {
  const linhas: LinhaDoRelatorio[] = [];
  for (const regime of REGIMES) {
    const suporte: Suporte = await suporteDe(regime.id);
    linhas.push({ regime, suporte, observacao: observacaoDe(regime.id, suporte) });
  }
  return linhas;
}
