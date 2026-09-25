// ===========================================================================
// estrutura.ts — A ÁRVORE DA CENA E A MEDIÇÃO, ESCRITAS NA PÁGINA
// ===========================================================================
//
// O QUE É
//   Duas funções que escrevem texto fixo na página: a árvore da cena (um nível
//   por recuo) e a folha de medição do quadro.
//
// O QUE FAZ / POR QUE PRECISAMOS
//   - A árvore permite conferir o parentesco LENDO. O professor propõe o teste
//     "imprima a árvore com um nível por recuo e leia em voz alta: onde a
//     leitura produzir uma frase que não faz sentido no mundo, há um parentesco
//     a corrigir" (Cap. 3, seção 1.1.2).
//   - A medição fica num <pre> para ser copiada para a documentação: o
//     enunciado exige que "número de slide tem de estar na documentação, com a
//     máquina em que foi medido".
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Mostrar isso só no painel dentro da cena.
//
// POR QUE ESTA E NÃO A OUTRA
//   O painel mostra o que MUDA a cada quadro e precisa ser lido de dentro do
//   ambiente; a árvore e a medição são texto parado, que se lê melhor fora da
//   cena e se copia com o mouse (mesma divisão do projeto do professor,
//   src/bancada/relatorio/estrutura.ts).
// ===========================================================================

/** Escreve a árvore num <pre> (fonte de largura fixa, para os recuos alinharem). */
export function montarEstrutura(raiz: HTMLElement, arvore: readonly string[]): void {
  raiz.replaceChildren();
  const titulo: HTMLHeadingElement = document.createElement('h2');
  titulo.textContent = 'Como a cena está montada (um nível por recuo)';
  raiz.appendChild(titulo);
  const bloco: HTMLPreElement = document.createElement('pre');
  bloco.textContent = arvore.join('\n');
  raiz.appendChild(bloco);
}

/** Escreve a folha de medição num <pre>, pronta para copiar. */
export function montarMedicao(raiz: HTMLElement, linhas: readonly string[]): void {
  raiz.replaceChildren();
  const titulo: HTMLHeadingElement = document.createElement('h2');
  titulo.textContent = 'Medição do quadro';
  raiz.appendChild(titulo);
  const bloco: HTMLPreElement = document.createElement('pre');
  bloco.textContent = linhas.join('\n');
  raiz.appendChild(bloco);
}
