// ===========================================================================
// diario.ts — O DIÁRIO: O QUE ACONTECEU, ESCRITO NA PÁGINA (passo 6)
// ===========================================================================
//
// O QUE É
//   Uma lista de mensagens (nota, alerta, falha) mostrada na própria página.
//
// O QUE FAZ
//   Registra o que o ambiente fez (sondagem, troca de pai, medição...) e
//   traduz erros técnicos em frases que qualquer pessoa entende.
//
// COMO FAZ
//   Guarda as entradas num array e redesenha os parágrafos do elemento destino
//   a cada entrada nova. Uma cópia vai para o console.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Usar só `console.log`.
//
// POR QUE ESTA E NÃO A OUTRA
//   Dentro do visor NÃO existe console de depuração. Quem está com o aparelho
//   no rosto não abre painel de desenvolvedor; para essa pessoa, um erro no
//   console é igual a um programa que decidiu não fazer nada (Cap. 2, seção
//   1.7.1). O enunciado do passo 6 é explícito: "não apenas no console, que
//   serve a quem escreveu o código e a mais ninguém".
//
// POR QUE PRECISAMOS
//   É o canal pelo qual a demonstração mostra números (posição antes/depois,
//   desvio) e pelo qual a sonda explica as falhas no próprio aparelho.
//
// POR QUE A CÓPIA NO CONSOLE CONTINUA
//   Com o aparelho ligado ao PC por depuração remota, ter o mesmo texto nos
//   dois lugares permite comparar o que a página mostrou com o que o navegador
//   registrou. Mas o canal principal é a página.
//
// BASE NO MATERIAL
//   Cap. 2, seção 1.7.1 ("O canal que não existe dentro de um visor").
//   Projeto do professor: src/bancada/relatorio/diario.ts.
// ===========================================================================

import { descreverRecusaDeSessao } from '../devices/recusa';

/** Três níveis, cada um com uma cor na folha de estilo (index.html). */
export type Severidade = 'nota' | 'alerta' | 'falha';

export interface Entrada {
  readonly severidade: Severidade;
  readonly texto: string;
}

/**
 * O QUE É: o diário.
 * POR QUE ACUMULA ANTES DE TER DESTINO: uma falha pode acontecer durante o
 *   carregamento, antes de o elemento da página existir. "Mensagem perdida por
 *   não ter onde ser escrita é a pior categoria de mensagem: ela some justamente
 *   no caso em que era mais necessária" (Cap. 2, seção 1.7.1). Quando o destino
 *   é fixado, tudo o que já foi registrado aparece.
 */
export class Diario {
  private readonly entradas: Entrada[] = [];
  private destino: HTMLElement | undefined = undefined;
  private destinoDaUltima: HTMLElement | undefined = undefined;

  /**
   * O QUE FAZ: mostra a ÚLTIMA mensagem num segundo lugar (logo abaixo dos
   *   botões da cena).
   * POR QUE PRECISAMOS: o diário completo fica mais abaixo na página, fora da
   *   tela; quem clica num botão da demonstração precisa ver o resultado
   *   (posição antes/depois, desvio) sem rolar.
   */
  public fixarDestinoDaUltima(destino: HTMLElement): void {
    this.destinoDaUltima = destino;
    this.redesenhar();
  }

  /** Diz em que elemento da página escrever, e escreve o que já havia. */
  public fixarDestino(destino: HTMLElement): void {
    this.destino = destino;
    this.redesenhar();
  }

  public nota(texto: string): void {
    this.registrar({ severidade: 'nota', texto });
  }

  public alerta(texto: string): void {
    this.registrar({ severidade: 'alerta', texto });
  }

  public falha(texto: string): void {
    this.registrar({ severidade: 'falha', texto });
  }

  private registrar(entrada: Entrada): void {
    this.entradas.push(entrada);
    console.info(`[bateria:${entrada.severidade}] ${entrada.texto}`);
    this.redesenhar();
  }

  /**
   * COMO FAZ: apaga e reescreve todos os parágrafos.
   * OUTRA OPÇÃO: só acrescentar o parágrafo novo. POR QUE NÃO: o diário tem
   *   poucas dezenas de linhas; reescrever tudo é simples e garante que a página
   *   nunca fica diferente da lista em memória.
   * POR QUE `textContent` E NÃO `innerHTML`: texto de erro vindo do navegador
   *   nunca é interpretado como HTML.
   */
  private redesenhar(): void {
    const ultima: Entrada | undefined = this.entradas[this.entradas.length - 1];
    if (this.destinoDaUltima !== undefined && ultima !== undefined) {
      this.destinoDaUltima.className = `diario diario-${ultima.severidade}`;
      this.destinoDaUltima.textContent = ultima.texto;
    }
    const destino: HTMLElement | undefined = this.destino;
    if (destino === undefined) {
      return;
    }
    destino.replaceChildren();
    for (const entrada of this.entradas) {
      const linha: HTMLParagraphElement = document.createElement('p');
      linha.className = `diario diario-${entrada.severidade}`;
      linha.textContent = entrada.texto;
      destino.appendChild(linha);
    }
  }
}

/**
 * O QUE FAZ: traduz o erro cru de um `catch` numa frase que diz o que aconteceu.
 * POR QUE PRECISAMOS: a recusa de sessão chega como exceção com nome em inglês
 *   (NotSupportedError...) — "o disfarce perfeito para um defeito de código
 *   inexistente" (Cap. 2). Sem tradução, "o aparelho disse não" parece "o
 *   código quebrou".
 * COMO FAZ: as recusas conhecidas vêm de `descreverRecusaDeSessao`
 *   (devices/recusa.ts), a mesma frase que a sonda guarda no resultado; o que
 *   não for recusa conhecida vira "`inicio`: mensagem do erro".
 * POR QUE O PARÂMETRO `inicio`: o diário também registra falhas que não são da
 *   sonda (a cena que não conseguiu ser montada, por exemplo), e a frase tem de
 *   dizer QUAL parte parou.
 */
export function explicarFalha(erro: unknown, inicio: string = 'A sondagem parou'): string {
  const recusa: string | undefined = descreverRecusaDeSessao(erro);
  if (recusa !== undefined) {
    return recusa;
  }
  if (erro instanceof Error) {
    return `${inicio}: ${erro.message}`;
  }
  return `${inicio} por um motivo que o navegador não descreveu.`;
}
