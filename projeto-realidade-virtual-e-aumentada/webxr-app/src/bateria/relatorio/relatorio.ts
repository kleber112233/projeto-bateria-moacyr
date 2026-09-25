// ===========================================================================
// relatorio.ts — O RELATÓRIO VISÍVEL: DOMÍNIO, REGIMES E SONDA (passo 6)
// ===========================================================================
//
// O QUE É
//   A parte que APRESENTA os resultados em HTML comum na página: o domínio
//   (tarefa, estado final, inventário), a tabela dos três regimes com a
//   resposta do aparelho, e o resultado da sonda.
//
// O QUE FAZ
//   Recebe dados prontos e cria parágrafos e tabelas.
//
// COMO FAZ
//   Com a API do DOM (`createElement`, `insertRow`...) e `textContent`.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Um framework de interface (React, Vue).
//   b) Colocar o relatório dentro da cena 3D já agora.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) Seriam dependências e conceitos novos para uma página de tabelas; o DOM
//      puro basta e qualquer integrante lê.
//   b) O relatório tem tabelas largas; dentro da cena ficaria ilegível. O
//      painel DENTRO da cena existe (ui/painel.ts) para o que muda a cada
//      quadro; o que é fixo fica aqui. Quando o painel diegético crescer, é
//      este arquivo que muda de lugar — declarado como provisório, como faz o
//      professor (Cap. 2, seção 1.7.2).
//
// POR QUE PRECISAMOS
//   Passo 6: "mostre o resultado da sonda em algum lugar que qualquer pessoa
//   consiga ler no próprio aparelho". Pronto quando "o mesmo endereço, aberto
//   em aparelhos de classes diferentes, produz relatórios diferentes e legíveis".
//
// DECISÃO DE ARQUITETURA
//   Este arquivo NÃO sabe nada de sessão, recurso ou inferência — só apresenta.
//   Essa ignorância é o que permite trocá-lo inteiro sem tocar numa linha da
//   sonda (mesma separação do projeto do professor, relatorio/capacidades.ts).
// ===========================================================================

import { contarEstadoFinal, type Dominio, type FaixaDeAjuste, type Papel } from '../dominio/dominio';
import type { EstadoDeRecurso } from '../devices/recursos';
import { descreverClasse, type GrausDeLiberdade } from '../devices/graus';
import type { ResultadoDaSonda, SondaEmSessao } from '../devices/sonda';
import { descreverTratamento } from '../modes/regimes';
import type { LinhaDoRelatorio, Suporte } from '../modes/verificacao';

// --- Pequenas peças de montagem ---------------------------------------------
// POR QUE EXISTEM: todas as tabelas e parágrafos saem das mesmas quatro funções,
// e assim as seções da página ficam com a mesma cara.

/** Uma célula de tabela: `th` no cabeçalho, `td` no corpo. `textContent` evita interpretar HTML. */
function celula(texto: string, cabecalho: boolean = false): HTMLTableCellElement {
  const elemento: HTMLTableCellElement = document.createElement(cabecalho ? 'th' : 'td');
  elemento.textContent = texto;
  return elemento;
}

/**
 * O QUE FAZ: monta uma tabela inteira a partir dos títulos e das linhas de texto.
 * POR QUE CADA CÉLULA LEVA O NOME DA COLUNA (`data-coluna`): numa tela
 *   estreita (celular) uma tabela de cinco ou seis colunas não cabe, e a
 *   página passaria a rolar para o lado, com as colunas da direita fora da
 *   vista. Lá o CSS (index.html) transforma cada linha num bloco e escreve o
 *   nome da coluna antes de cada valor, lido deste atributo. No PC a tabela
 *   continua tabela.
 * OUTRA OPÇÃO: pôr cada tabela numa caixa com rolagem lateral própria.
 * POR QUE NÃO: a página para de alargar, mas ler uma linha ainda exige rolar
 *   de lado e perder de vista o nome da peça ou do regime, que é justamente o
 *   que dá sentido aos valores. No bloco, o nome fica junto de cada valor.
 */
function tabela(titulos: readonly string[], linhas: readonly (readonly string[])[]): HTMLTableElement {
  const t: HTMLTableElement = document.createElement('table');
  const cab: HTMLTableRowElement = t.insertRow();
  cab.className = 'cabecalho'; // o CSS esconde esta linha na tela estreita (os nomes vão para cada célula)
  for (const titulo of titulos) {
    cab.appendChild(celula(titulo, true));
  }
  for (const linha of linhas) {
    const fileira: HTMLTableRowElement = t.insertRow();
    linha.forEach((texto: string, i: number) => {
      const c: HTMLTableCellElement = celula(texto);
      c.dataset['coluna'] = titulos[i] ?? '';
      fileira.appendChild(c);
    });
  }
  return t;
}

function paragrafo(texto: string): HTMLParagraphElement {
  const p: HTMLParagraphElement = document.createElement('p');
  p.textContent = texto;
  return p;
}

function titulo(nivel: 'h2' | 'h3', texto: string): HTMLHeadingElement {
  const h: HTMLHeadingElement = document.createElement(nivel);
  h.textContent = texto;
  return h;
}

// --- Domínio e regimes: respondem SEM sessão ---------------------------------

/**
 * Rótulos em português para os valores dos tipos.
 * POR QUE `switch` SEM `default`: se alguém acrescentar um valor novo ao tipo,
 *   o compilador acusa que este `switch` não trata o caso novo.
 */
function rotuloDoPapel(papel: Papel): string {
  switch (papel) {
    case 'instrumento':
      return 'fixa e soa';
    case 'ferragem':
      return 'fixa, não soa';
    case 'baqueta':
      return 'acompanha a mão';
  }
}

/**
 * O QUE FAZ: escreve a faixa de ajuste de uma peça como na especificação
 *   ("70 a 90 cm", "0° a 45°", "não tem").
 * POR QUE CENTÍMETROS NA TELA SE O DOMÍNIO GUARDA METROS: a seção 4 escreve as
 *   faixas em centímetros, que é como se fala de altura de estante. O cálculo
 *   continua em metros; só a leitura muda.
 */
function rotuloDoAjuste(ajuste: FaixaDeAjuste | undefined): string {
  if (ajuste === undefined) {
    return 'não tem';
  }
  switch (ajuste.grandeza) {
    case 'altura':
      return `altura de ${Math.round(ajuste.minimo * 100)} a ${Math.round(ajuste.maximo * 100)} cm`;
    case 'inclinacao':
      return `inclinação de ${ajuste.minimo}° a ${ajuste.maximo}°`;
  }
}

function rotuloDoSuporte(suporte: Suporte): string {
  switch (suporte) {
    case 'sim':
      return 'Entra';
    case 'nao':
      return 'Não entra';
    case 'desconhecido':
      return 'Sem resposta';
  }
}

/**
 * O QUE FAZ: escreve o bloco do domínio e a tabela de regimes.
 * POR QUE MOSTRAR A CONTAGEM DO ESTADO FINAL: é um número conferível ("13 a
 *   fixar, 8 a soar") — qualquer mudança no inventário aparece aqui na hora.
 * POR QUE MOSTRAR A CONFERÊNCIA DO DOMÍNIO MESMO QUANDO ESTÁ TUDO CERTO: uma
 *   linha vazia seria ambígua (não houve problema, ou ninguém conferiu?).
 *   Dizer "nenhuma inconsistência" fecha a dúvida (Cap. 5, seção 1.3.1, a
 *   mesma ideia aplicada à lista de divergências).
 */
export function montarRelatorio(
  raiz: HTMLElement,
  dominio: Dominio,
  problemas: readonly string[],
  linhas: readonly LinhaDoRelatorio[],
): void {
  raiz.replaceChildren();
  const contagem = contarEstadoFinal(dominio);

  raiz.appendChild(titulo('h2', `Domínio: ${dominio.nome}`));
  raiz.appendChild(paragrafo(dominio.descricao));
  raiz.appendChild(paragrafo(`Tarefa: ${dominio.tarefa.enunciado}`));
  raiz.appendChild(paragrafo(`Concluída quando: ${dominio.tarefa.estadoFinal}`));
  raiz.appendChild(
    paragrafo(
      `Para concluir a tarefa, ${contagem.aFixar} peças precisam estar fixadas e ${contagem.aSoar} delas precisam soar. ` +
        `As ${contagem.foraDoEstadoFinal} baquetas não entram nessa conta. A plataforma tem ` +
        `${dominio.plataforma.ladoInicial} m de lado e a folga de encaixe é de ${dominio.folgaDeEncaixe * 100} cm.`,
    ),
  );
  raiz.appendChild(
    paragrafo(
      problemas.length === 0
        ? 'Conferência do domínio: nenhuma inconsistência.'
        : `Conferência do domínio: ${problemas.join(' ')}`,
    ),
  );
  raiz.appendChild(
    tabela(
      ['Peça', 'Papel', 'Largura x altura x profundidade (m)', 'Faixa de ajuste', 'Origem da medida'],
      dominio.pecas.map((p) => [
        p.nome,
        rotuloDoPapel(p.papel),
        `${p.dimensoes.largura} x ${p.dimensoes.altura} x ${p.dimensoes.profundidade}`,
        rotuloDoAjuste(p.ajuste),
        p.origemDaMedida,
      ]),
    ),
  );

  // A tabela junta, na mesma linha, o que o grupo DECLAROU e o que o aparelho
  // RESPONDEU — é esse lado a lado que torna a declaração confrontável.
  raiz.appendChild(titulo('h2', 'Regimes: o que declaramos e o que este aparelho respondeu'));
  raiz.appendChild(
    tabela(
      ['Regime', 'Trata o mundo', 'Espaço de referência', 'Rastreia', 'Registrado contra', 'Neste aparelho'],
      linhas.map((l) => [
        l.regime.nome,
        descreverTratamento(l.regime.tratamentoDoMundo),
        l.regime.espacoDeReferencia,
        l.regime.rastreia,
        l.regime.registroContra,
        `${rotuloDoSuporte(l.suporte)}. ${l.observacao}`,
      ]),
    ),
  );
}

// --- Sonda: só a sessão responde ---------------------------------------------

/**
 * POR QUE "SEM RESPOSTA" E NÃO "NÃO CONCEDIDO" PARA `indeterminado`: são
 *   situações diferentes e o texto precisa mostrar isso (Cap. 2, seção 1.6).
 * POR QUE "NÃO CONCEDIDO" E NÃO SÓ "NEGADO" NA TELA: a lista da sessão diz
 *   que o recurso ficou de fora, mas não diz por quê (o aparelho não tem, o
 *   navegador não implementa ou a pessoa recusou). "Negado" sugeriria uma
 *   recusa; a frase diz só o que se sabe. O tipo continua 'negado', que é o
 *   nome do material para esse estado.
 */
function rotuloDoEstado(estado: EstadoDeRecurso): string {
  switch (estado) {
    case 'concedido':
      return 'concedido';
    case 'negado':
      return 'não concedido (motivo não informado)';
    case 'indeterminado':
      return 'sem resposta';
  }
}

function rotuloDosGraus(graus: GrausDeLiberdade): string {
  switch (graus) {
    // A frase de 'tres' leva a ressalva de graus.ts: pela página não dá para
    // separar "só gira" de "perdeu o rastreamento", e o texto não pode ser
    // mais confiante do que a evidência (mesma ressalva do professor).
    case 'tres':
      return 'Leitura de três graus de liberdade: todas as poses observadas vieram com a posição emulada. Ou o aparelho acompanha só para onde a cabeça aponta, ou perdeu o rastreamento durante a observação.';
    case 'seis':
      return 'Seis graus de liberdade: pelo menos uma pose veio com a posição medida por sensor, então o aparelho acompanha orientação e deslocamento.';
    case 'indeterminado':
      return 'Indeterminado, porque nenhuma pose foi observada.';
  }
}

/**
 * O QUE FAZ: diz como a pessoa interage com a sessão, segundo o aparelho.
 * POR QUE MOSTRAR: é a informação que separa celular de visor na classificação
 *   (graus.ts); com ela na página, quem lê pode conferir a classe.
 */
function rotuloDaInteracao(modo: XRInteractionMode | undefined): string {
  switch (modo) {
    case 'screen-space':
      return 'Forma de interação: na tela (screen-space). O aparelho é segurado na mão.';
    case 'world-space':
      return 'Forma de interação: no espaço (world-space). O aparelho é vestido.';
    case undefined:
      return 'Forma de interação: a sessão não informou.';
  }
}

/**
 * POR QUE UMA FRASE QUANDO NÃO HÁ FONTES: tabela vazia não explica nada. No
 *   visor, lista vazia costuma ser controle desligado; no celular, é o normal
 *   antes do primeiro toque (a fonte de toque só aparece quando o dedo encosta).
 */
function blocoDeFontes(sonda: SondaEmSessao): HTMLElement {
  if (sonda.fontesDeEntrada.length === 0) {
    return paragrafo(
      'Nenhuma fonte de entrada apareceu durante a observação. Isso não quer dizer que o aparelho não tenha entrada: no visor costuma ser controle desligado, e no celular a fonte de toque só aparece enquanto o dedo está na tela.',
    );
  }
  return tabela(
    ['Lado', 'Mira', 'Pose própria', 'Mão articulada', 'Perfis'],
    sonda.fontesDeEntrada.map((f) => [
      f.lado,
      f.mira,
      f.temPoseDePunho ? 'sim' : 'não',
      f.temMao ? 'sim' : 'não',
      f.perfis.join(', '),
    ]),
  );
}

/**
 * O QUE FAZ: escreve o resultado da sonda.
 * ORDEM DAS SEÇÕES: classe do aparelho → HTTPS → recursos → espaços e graus →
 *   fontes de entrada → composição (com o confronto) → estabilidade.
 * POR QUE A LINHA DO CONTEXTO SEGURO VEM LOGO NO COMEÇO: sem contexto seguro
 *   (HTTPS ou endereço local) nada abaixo descreve o aparelho — é a URL
 *   impedindo a pergunta. Quem lê precisa saber disso
 *   antes de interpretar qualquer "sem resposta".
 * POR QUE MOSTRAR AS CONTAGENS DE POSES AO LADO DOS GRAUS: a inferência tem um
 *   limite conhecido (graus.ts); os números deixam qualquer um conferir.
 * POR QUE `confronto` VEM PRONTO DE FORA: quem sabe comparar declaração com
 *   sessão é a sonda; este arquivo só apresenta.
 */
export function montarSonda(raiz: HTMLElement, resultado: ResultadoDaSonda, confronto: string | undefined): void {
  raiz.replaceChildren();
  raiz.appendChild(titulo('h2', 'Sonda de capacidades'));
  raiz.appendChild(paragrafo(descreverClasse(resultado.classe)));
  // A classe fala dos modos imersivos. Se nem a janela desenha (sem WebGL),
  // quem lê precisa saber disso logo abaixo, senão "só abre o modo janela"
  // prometeria uma janela que não existe.
  if (resultado.semSessao.regimes.some((l) => l.regime.id === 'inline' && l.suporte === 'nao')) {
    raiz.appendChild(paragrafo('Atenção: neste navegador nem o modo janela consegue desenhar, porque ele não entregou WebGL 2.'));
  }
  raiz.appendChild(
    paragrafo(
      resultado.semSessao.contextoSeguro
        ? 'A página está em contexto seguro (HTTPS ou endereço local), então o que aparece abaixo é resposta do próprio aparelho.'
        : 'A página não está em contexto seguro (nem HTTPS, nem endereço local), então o navegador escondeu a WebXR e os dados abaixo não dizem nada sobre o aparelho.',
    ),
  );

  const sonda: SondaEmSessao | undefined = resultado.emSessao;
  if (sonda === undefined) {
    raiz.appendChild(paragrafo(resultado.motivoSemSessao ?? 'Não houve sessão, e o motivo não foi registrado.'));
    return;
  }

  // Um aparelho que aceita VR e AR é sondado só em AR (sonda.ts, modoPreferido).
  // Dizer isso evita ler os recursos abaixo como se valessem para os dois modos.
  const naoSondados: string[] = resultado.semSessao.modosSuportados.filter(
    (m) => m !== sonda.modo && m !== 'inline',
  );
  raiz.appendChild(
    paragrafo(
      `Sessão aberta em ${sonda.modo}.` +
        (naoSondados.length > 0
          ? ` Este aparelho também aceita ${naoSondados.join(', ')}, mas esse modo não foi aberto nesta sondagem, então os recursos abaixo valem só para ${sonda.modo}.`
          : ''),
    ),
  );
  if (sonda.interrupcao !== undefined) {
    raiz.appendChild(paragrafo(`A observação não chegou ao fim. ${sonda.interrupcao} Os números abaixo são do que deu para observar.`));
  }

  raiz.appendChild(titulo('h3', `Recursos opcionais pedidos em ${sonda.modo}`));
  raiz.appendChild(
    tabela(
      ['Recurso', 'Para que a bateria precisa', 'Neste aparelho'],
      sonda.recursos.map((r) => [r.nome, r.paraQueServe, rotuloDoEstado(r.estado)]),
    ),
  );

  raiz.appendChild(titulo('h3', 'Espaços de referência e graus de liberdade'));
  raiz.appendChild(
    paragrafo(
      sonda.espacosConcedidos.length === 0
        ? 'Nenhum espaço de referência concedido.'
        : `Concedidos: ${sonda.espacosConcedidos.join(', ')}.`,
    ),
  );
  raiz.appendChild(
    paragrafo(
      `${rotuloDosGraus(sonda.graus)} Foram ${sonda.posesObservadas} poses observadas, ` +
        `${sonda.posesComPosicaoEmulada} com posição emulada.`,
    ),
  );

  raiz.appendChild(titulo('h3', 'Fontes de entrada que apareceram'));
  raiz.appendChild(blocoDeFontes(sonda));
  raiz.appendChild(paragrafo(rotuloDaInteracao(sonda.modoDeInteracao)));

  raiz.appendChild(titulo('h3', 'Composição do fundo'));
  raiz.appendChild(paragrafo(`A sessão informou composição ${sonda.composicaoObservada}.`));
  if (confronto !== undefined) {
    raiz.appendChild(paragrafo(confronto));
  }

  raiz.appendChild(titulo('h3', 'Estabilidade do rastreamento'));
  raiz.appendChild(
    paragrafo(
      `${sonda.estabilidade.quadros} quadros observados, ${sonda.estabilidade.quadrosSemPose} sem pose, ` +
        `${sonda.estabilidade.quadrosOcultos} com a sessão fora de primeiro plano.`,
    ),
  );
  raiz.appendChild(paragrafo(sonda.diagnostico));
}
