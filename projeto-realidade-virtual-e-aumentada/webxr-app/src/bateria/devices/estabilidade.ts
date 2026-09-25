// ===========================================================================
// estabilidade.ts — CONTAGEM DE QUADROS SEM POSE (passo 5)
// ===========================================================================
//
// O QUE É
//   Um contador de quantos quadros chegaram SEM a pose de quem observa.
//
// O QUE FAZ
//   Durante a janela de observação da sonda, conta quadros com pose, sem pose
//   e com a sessão escondida; depois uma função separada traduz em frase.
//
// COMO FAZ
//   A cada quadro recebe dois booleanos: veio pose? a sessão estava visível?
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Esperar um aviso da plataforma do tipo "perdi o rastreamento".
//
// POR QUE ESTA E NÃO A OUTRA
//   Esse aviso NÃO existe. A WebXR não informa degradação, nem qualidade, nem
//   evento de perda. O único sinal que chega ao código é: o quadro chega e a
//   pose não vem (Cap. 2, seção 1.4). Um quadro assim é normal; uma sequência
//   é degradação — e a diferença é contagem que nós temos de fazer.
//
// POR QUE PRECISAMOS
//   Rastreamento que falha é o que faz a plataforma da bateria "nadar" no
//   celular. Medir agora dá uma linha de base; e a especificação (seção 11)
//   promete reagir à perda de rastreamento.
//
// BASE NO MATERIAL
//   Cap. 2, seção 1.4 ("A sala limpa é a pior sala": parede lisa, pouca luz e
//   movimento brusco). Projeto do professor: src/bancada/devices/estabilidade.ts.
// ===========================================================================

/**
 * O QUE É: a partir de quantos quadros SEGUIDOS sem pose o rastreamento conta
 *   como instável: mais de 10 (cerca de 0,14 s a 72 Hz).
 * POR QUE UM NÚMERO: a especificação (seção 11, item 6) promete avisar quando
 *   o rastreamento fica instável, e "alguns quadros" não pode ser conferido.
 *   Com número, a frase pode estar errada, e por isso serve.
 * POR QUE 10: um quadro sem pose isolado é normal (o Cap. 2 diz isso); 10
 *   seguidos já são uma imagem parada que a pessoa percebe. É provisório, como
 *   as tolerâncias da seção 7, e vai ser medido no aparelho.
 * QUEM USA: `diagnosticar` agora, e a borda da plataforma que pisca (Bloco 4)
 *   depois. Um lugar só para o número.
 */
export const LIMITE_DE_QUADROS_SEM_POSE: number = 10;

/** O resultado da contagem. */
export interface Estabilidade {
  readonly quadros: number;
  readonly quadrosSemPose: number;
  /** Maior sequência SEGUIDA de quadros sem pose (um buraco longo é pior que vários curtos). */
  readonly maiorLacuna: number;
  /** Quadros com a sessão fora de primeiro plano (menu do sistema aberto). */
  readonly quadrosOcultos: number;
}

/**
 * O QUE É: o contador.
 * POR QUE ELE SÓ CONTA E NÃO JULGA: medidor que já interpreta ao medir embute
 *   a expectativa de quem o escreveu e "sempre concorda com quem o programou"
 *   (Cap. 2, seção 1.4). A interpretação mora em `diagnosticar`, separada.
 */
export class ContadorDeEstabilidade {
  private quadros: number = 0;
  private quadrosSemPose: number = 0;
  private quadrosOcultos: number = 0;
  private maiorLacuna: number = 0;
  private lacunaCorrente: number = 0;

  /**
   * O QUE FAZ: registra um quadro.
   * POR QUE O PARÂMETRO `visivel`: quando a pessoa abre o menu do visor para
   *   ver a hora, a sessão continua viva, os quadros continuam chegando e a pose
   *   para de vir — sintoma IGUAL ao da perda de rastreamento. Sem separar os
   *   dois casos, o contador acusaria o aparelho toda vez que alguém olha o relógio.
   */
  public registrar(temPose: boolean, visivel: boolean): void {
    this.quadros += 1;
    if (!visivel) {
      this.quadrosOcultos += 1;
      this.lacunaCorrente = 0;
      return;
    }
    if (temPose) {
      this.lacunaCorrente = 0;
      return;
    }
    this.quadrosSemPose += 1;
    this.lacunaCorrente += 1;
    this.maiorLacuna = Math.max(this.maiorLacuna, this.lacunaCorrente);
  }

  public resultado(): Estabilidade {
    return {
      quadros: this.quadros,
      quadrosSemPose: this.quadrosSemPose,
      maiorLacuna: this.maiorLacuna,
      quadrosOcultos: this.quadrosOcultos,
    };
  }
}

/**
 * O QUE FAZ: traduz a contagem em uma frase para o relatório.
 * POR QUE A FRASE NÃO DIZ QUAL DAS TRÊS CAUSAS ACONTECEU: pela contagem não dá
 *   para distinguir parede sem textura de pouca luz ou de movimento brusco, e
 *   escolher uma "seria inventar o diagnóstico junto com a medida" (Cap. 2).
 * POR QUE AVISAR QUE "A JANELA É CURTA": 90 quadros sem falha não provam
 *   estabilidade em uso longo — dizer isso evita que o número seja citado como
 *   garantia.
 */
export function diagnosticar(e: Estabilidade): string {
  if (e.quadros === 0) {
    return 'Nenhum quadro chegou. A sessão não chegou a gerar imagem.';
  }
  // Só os quadros com a sessão VISÍVEL dizem algo sobre o rastreamento: nos
  // ocultos a pose falta por causa do menu do sistema, e o contador já não os
  // soma em `quadrosSemPose`. Por isso a conclusão e a proporção são sobre os
  // visíveis. Sem essa conta, 90 quadros todos ocultos dariam "a pose veio em
  // todos os quadros", uma afirmação sem nenhuma observação por trás.
  // COMPARADO AO PROJETO DO PROFESSOR: a separação entre quadro oculto e
  // quadro sem pose é dele (o parâmetro `visivel` do contador). Lá a frase
  // final usa o total de quadros; aqui usa só os visíveis, para a frase ter a
  // mesma separação que o contador já fazia.
  const visiveis: number = e.quadros - e.quadrosOcultos;
  const sobreOcultos: string =
    e.quadrosOcultos > 0 ? ` Outros ${e.quadrosOcultos} quadros vieram com a sessão fora de primeiro plano e não entram na conta.` : '';
  if (visiveis === 0) {
    return `Todos os ${e.quadros} quadros vieram com a sessão fora de primeiro plano (menu do sistema aberto). Não houve observação visível, então não dá para avaliar o rastreamento.`;
  }
  if (e.quadrosSemPose === 0) {
    return (
      `A pose veio em todos os ${visiveis} quadros visíveis.${sobreOcultos} ` +
      'Foi pouco tempo de observação, então isso não garante que o rastreamento fique estável em uso longo.'
    );
  }
  const proporcao: number = Math.round((e.quadrosSemPose / visiveis) * 100);
  // O limite decide só o ADJETIVO; os números vão na frase dos dois jeitos,
  // para quem lê poder discordar da conclusão.
  const veredito: string =
    e.maiorLacuna > LIMITE_DE_QUADROS_SEM_POSE
      ? `Passou do limite de ${LIMITE_DE_QUADROS_SEM_POSE} quadros seguidos, então o rastreamento esteve instável.`
      : `Ficou dentro do limite de ${LIMITE_DE_QUADROS_SEM_POSE} quadros seguidos.`;
  return (
    `A pose faltou em ${proporcao}% dos ${visiveis} quadros visíveis, com até ${e.maiorLacuna} quadros seguidos sem pose. ${veredito}${sobreOcultos} ` +
    'As causas mais comuns são parede sem textura, pouca luz ou movimento brusco. Pela contagem não dá para saber qual delas foi.'
  );
}
