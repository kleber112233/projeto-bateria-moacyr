// ===========================================================================
// medicao.ts — O NÚMERO DO QUADRO JUNTO COM A MÁQUINA (passo 9)
// ===========================================================================
//
// O QUE É
//   A "folha de medição": data, navegador, placa de vídeo, tela e as linhas
//   do orçamento, num bloco só.
//
// O QUE FAZ
//   Monta as linhas que o botão "Registrar a medição agora" escreve na página.
//
// COMO FAZ
//   Lê `navigator.userAgent`, `window.screen`, a extensão WebGL
//   `WEBGL_debug_renderer_info` (nome da placa) e a leitura do `Orcamento`.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Anotar só o número ("custo médio 0,8 ms").
//
// POR QUE ESTA E NÃO A OUTRA
//   "Roda bem" é uma frase sem sujeito: a mesma cena dá números diferentes em
//   máquinas diferentes, e as decisões tiradas de cada número são opostas.
//   "Nenhum número viaja sozinho" (Cap. 5, seção 1.6). Por isso a folha ABRE
//   pela máquina — o contexto chega antes do número, e fica difícil copiar o
//   número sem ele.
//
// POR QUE PRECISAMOS
//   O enunciado: "número de slide tem de estar na documentação, com a máquina
//   em que foi medido", e a medição deve ser feita na máquina MAIS MODESTA
//   prevista (a do laboratório, vídeo integrado), não na de quem programou.
//
// BASE NO MATERIAL
//   Cap. 5 ("Ativos, formatos de troca e orçamento de cena"), seções 1.5 e 1.6
//   (máquina de referência; a folha que abre pela máquina; "placa não
//   identificada" quando o navegador recusa informar).
// ===========================================================================

import type { WebGLRenderer } from 'three';

import { linhasDoOrcamento, type LeituraDoOrcamento } from '../core/orcamento';

/**
 * O QUE FAZ: tenta descobrir o nome da placa de vídeo.
 * COMO FAZ: pede ao WebGL a extensão opcional `WEBGL_debug_renderer_info` e lê
 *   `UNMASKED_RENDERER_WEBGL` (conhecimento de WebGL, fora do material).
 * POR QUE ACEITA `undefined`: a exportação da sonda continua funcionando
 *   quando a cena falhou, e aí não existe renderer.
 * POR QUE PODE FALHAR: muitos navegadores bloqueiam essa extensão por
 *   privacidade (o nome da placa ajuda a identificar a pessoa).
 * POR QUE DIZER "NÃO IDENTIFICADA" EM VEZ DE CHUTAR: um nome plausível
 *   inventado faria a medição PARECER reproduzível sem ser (Cap. 5, seção 1.6).
 */
export function identificarPlaca(renderer: WebGLRenderer | undefined): string {
  // Sem renderer (a cena não conseguiu ser montada), não há contexto WebGL a
  // quem perguntar; dizer isso é mais útil do que parar a exportação inteira.
  if (renderer === undefined) {
    return 'placa não identificada (a cena não pôde ser montada neste navegador)';
  }
  const gl: WebGLRenderingContext | WebGL2RenderingContext = renderer.getContext();
  const extensao = gl.getExtension('WEBGL_debug_renderer_info');
  if (extensao === null) {
    return 'placa não identificada (o navegador não informou)';
  }
  const nome: unknown = gl.getParameter(extensao.UNMASKED_RENDERER_WEBGL);
  return typeof nome === 'string' && nome !== '' ? nome : 'placa não identificada (resposta vazia)';
}

/**
 * O QUE FAZ: monta a folha completa, na ordem: data → navegador → placa →
 *   tela → linhas do orçamento.
 * POR QUE A TELA: o custo de desenhar cresce com a área em pixels; a mesma
 *   máquina com um monitor maior mede diferente.
 */
export function folhaDeMedicao(renderer: WebGLRenderer, leitura: LeituraDoOrcamento): string[] {
  return [
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    `Navegador: ${navigator.userAgent}`,
    `Placa de vídeo: ${identificarPlaca(renderer)}`,
    `Tela: ${window.screen.width} x ${window.screen.height}, densidade ${window.devicePixelRatio}`,
    '',
    ...linhasDoOrcamento(leitura),
  ];
}
