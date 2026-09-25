// ===========================================================================
// recusa.ts — O QUE SIGNIFICA CADA RECUSA DE SESSÃO (passo 5)
// ===========================================================================
//
// O QUE É
//   A tradução dos erros que o navegador lança ao recusar uma sessão imersiva
//   (`requestSession`) em frases que qualquer pessoa entende.
//
// O QUE FAZ
//   Recebe o erro cru de um `catch` e devolve uma frase que diz QUEM recusou e
//   o que dá para fazer.
//
// COMO FAZ
//   A recusa chega como `DOMException`, e o que distingue um caso do outro é o
//   campo `name`. Um `switch` sobre esse nome escolhe a frase.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Mostrar a mensagem original do navegador (`erro.message`).
//   b) Deixar a tradução no diário (relatorio/diario.ts), junto das outras mensagens.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) A mensagem original vem em inglês, muda de navegador para navegador e
//      parece defeito do código: "o disfarce perfeito para um defeito de
//      código inexistente" (Cap. 2).
//   b) A sonda precisa da frase para guardar o MOTIVO dentro do próprio
//      resultado (`motivoSemSessao`). Se a tradução morasse no relatório, a
//      sonda teria de importar a camada de apresentação, e a separação "a sonda
//      descobre, o relatório só mostra" se perderia. Morando aqui, a sonda e o
//      diário usam a mesma frase.
//
// COMPARADO AO PROJETO DO PROFESSOR
//   As frases para NotSupportedError, SecurityError e InvalidStateError
//   seguem o `explicarFalha` dele, que fica no diário. Aqui elas moram na
//   pasta da sonda pelo motivo do item b, e há uma a mais, NotAllowedError,
//   porque o modo celular da bateria pede a câmera e a pessoa pode recusar.
//
// POR QUE PRECISAMOS
//   "Sessão recusada: a recusa aparece como frase na página" (especificação,
//   seção 11, item 4). Uma recusa também é resultado da sonda: diz algo sobre
//   o aparelho ou sobre a página.
//
// BASE NO MATERIAL
//   Cap. 2, seção 1.7 (gesto de quem usa, contexto seguro, recusa como
//   exceção com nome em inglês). O caso `NotAllowedError` é da especificação
//   WebXR (pessoa recusou a permissão pedida pelo navegador), fora do material.
// ===========================================================================

/**
 * O QUE FAZ: devolve a frase para a recusa, ou `undefined` se o erro não for
 *   uma das recusas conhecidas.
 * OS CASOS:
 *   - NotSupportedError: o aparelho não sustenta aquele modo;
 *   - SecurityError: faltou o clique de quem usa, ou a página está sem HTTPS;
 *   - InvalidStateError: já existe uma sessão imersiva aberta neste navegador;
 *   - NotAllowedError: a pessoa recusou a permissão (no celular, a câmera).
 * POR QUE `undefined` E NÃO UMA FRASE GENÉRICA: quem chama decide o que dizer
 *   quando o erro é outro (um defeito nosso não é uma recusa do aparelho).
 */
export function descreverRecusaDeSessao(erro: unknown): string | undefined {
  if (!(erro instanceof DOMException)) {
    return undefined;
  }
  switch (erro.name) {
    case 'NotSupportedError':
      return 'O aparelho recusou a sessão porque não suporta esse modo.';
    case 'SecurityError':
      return 'O navegador recusou o pedido. Ou faltou o clique de quem usa, ou a página não está em contexto seguro (HTTPS ou endereço local).';
    case 'InvalidStateError':
      return 'Já existe uma sessão aberta neste navegador. Feche a anterior e tente de novo.';
    case 'NotAllowedError':
      return 'A permissão pedida pelo navegador foi recusada. No celular, o modo AR precisa da câmera. Clique em Sondar de novo e aceite o pedido.';
    default:
      return undefined;
  }
}
