// ===========================================================================
// main.ts — PONTO DE ENTRADA: JUNTA AS PEÇAS (nenhuma lógica mora aqui)
// ===========================================================================
//
// O QUE É
//   O arquivo que o index.html carrega. Cria os módulos, liga uns aos outros
//   e liga os botões da página.
//
// O QUE FAZ
//   1. Diário e conferência do domínio (passos 2 e 6).
//   2. Consulta dos regimes ao carregar (passos 3 e 5).
//   3. Cena como árvore + laço contra o relógio + painel de custo (passos 7 e
//      9), com os botões da demonstração: fixar o bumbo (troca de pai, passo
//      8), girar e mover a plataforma, redimensionar a plataforma, ajustar o
//      chimbal e registrar a medição.
//   4. Copiar ou salvar os dados (máquina + medição + sonda), depois de
//      informado o nome da máquina.
//   5. Sonda de capacidades completa, pelo botão (passos 5 e 6).
//
// COMO FAZ
//   Importa cada módulo e passa para ele só o que ele precisa.
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   Um arquivo grande com tudo junto (cena, relógio, sonda, botões).
//
// POR QUE ESTA E NÃO A OUTRA
//   Cada módulo IGNORA os outros: o palco desenha e não sabe o que é bateria;
//   a cena conhece a bateria e não mede tempo; o relógio mede tempo e não
//   conhece peças; o orçamento compara números com um teto e não sabe de onde
//   vêm. Essa ignorância é o que permite trocar um sem tocar nos outros:
//   quando o regime imersivo entrar, muda o palco e a cena não; um
//   comportamento novo entra como mais um `laco.aoPasso(...)` (Cap. 3, seção
//   1.6).
//
// POR QUE A CENA FICA DENTRO DE UM `try` E A SONDA FORA DELE
//   A cena depende de WebGL, e um navegador sem WebGL (ou com a placa de vídeo
//   bloqueada) faz o renderer lançar erro na criação. Sem proteção, esse erro
//   pararia o arquivo inteiro ali, e a sonda e o relatório nunca seriam
//   montados, justo no aparelho em que eles mais interessam. Com o `try`, a
//   falha vai para o diário, os botões da cena são desligados e a sonda
//   continua funcionando (ela usa um canvas próprio, devices/sonda.ts).
//
// POR QUE PRECISAMOS
//   Alguém precisa montar o conjunto; e é aqui que fica o roteiro da
//   demonstração ao vivo (os quatro itens que o enunciado pede).
//
// BASE NO MATERIAL
//   Cap. 3, seção 1.6 ("O terceiro estado da Bancada"); Cap. 2, seção 1.7
//   (a página da sonda). Projeto do professor: src/demos/02_demo.ts e 03_demo.ts.
// ===========================================================================

import { Group, MathUtils, WebGLRenderer } from 'three';

import { BATERIA, inconsistenciasDoDominio } from './bateria/dominio/dominio';
import { levantarRelatorio, type LinhaDoRelatorio } from './bateria/modes/verificacao';
import { conferirComposicao, sondar, type ResultadoDaSonda } from './bateria/devices/sonda';
import { montarRelatorio, montarSonda } from './bateria/relatorio/relatorio';
import { Diario, explicarFalha } from './bateria/relatorio/diario';
import { montarEstrutura, montarMedicao } from './bateria/relatorio/estrutura';
import { folhaDeMedicao } from './bateria/relatorio/medicao';
import {
  copiarParaAreaDeTransferencia,
  montarRegistro,
  nomeDoArquivo,
  salvarArquivo,
  textoParaCompartilhar,
  type RegistroDeMedicao,
} from './bateria/relatorio/exportacao';
import { montarPalco, type Palco } from './bateria/core/palco';
import { ABERTURA_DO_CHIMBAL_M, montarCena, type CenaDaBateria } from './bateria/core/cena';
import { Relogio, type Amostra } from './bateria/core/relogio';
import { Orcamento, TETO_ADOTADO_MS, linhasDoPainel, type LeituraDoOrcamento } from './bateria/core/orcamento';
import { montarLaco, type Laco } from './bateria/core/laco';
import { descreverArvore, emMetros, posicaoNoMundo, reparentar, type ResultadoDaTroca } from './bateria/core/hierarquia';
import { montarPainel, type Painel } from './bateria/ui/painel';
import { montarLigacao, type LigacaoDeParentesco } from './bateria/ui/ligacao';

/**
 * O QUE FAZ: pega um elemento da página pelo id, ou para com mensagem clara.
 * POR QUE NÃO SÓ `getElementById(...)!`: se o HTML mudar e o id sumir, o erro
 *   diz QUAL elemento falta, em vez de um "cannot read property of null"
 *   em outro lugar.
 */
function exigir<T extends HTMLElement>(id: string): T {
  const elemento: HTMLElement | null = document.getElementById(id);
  if (elemento === null) {
    throw new Error(`A página não tem o elemento #${id}.`);
  }
  return elemento as T;
}

// --- 1. Diário e conferências iniciais --------------------------------------

// O diário é criado PRIMEIRO: tudo o que acontecer daqui em diante (inclusive
// falhas na montagem) tem onde ser escrito.
const diario: Diario = new Diario();
diario.fixarDestino(exigir('diario'));
diario.fixarDestinoDaUltima(exigir('ultima-acao')); // a última mensagem também logo abaixo dos botões

// Sem HTTPS a API WebXR não aparece e o aparelho pareceria não ter suporte —
// uma mentira sobre o aparelho causada pelo endereço (Cap. 2, seção 1.7).
if (!window.isSecureContext) {
  diario.alerta('A página não está em contexto seguro (HTTPS ou endereço local). Sem isso o navegador esconde a WebXR, e a sonda vai dizer que o aparelho não tem suporte mesmo que ele tenha.');
}
// A conferência do domínio roda SEMPRE na abertura (Cap. 1, seção 1.6.2).
const problemas: string[] = inconsistenciasDoDominio(BATERIA);
if (problemas.length > 0) {
  diario.alerta(`O domínio tem inconsistências: ${problemas.join(' ')}`);
}

// --- 2. Consulta dos regimes, ao carregar -----------------------------------

// A parte da sonda que não precisa de sessão nem de gesto roda já.
// POR QUE GUARDAR A PROMESSA: o botão "Sondar" reaproveita esta mesma
// resposta. Assim o pedido de sessão sai logo depois do clique, em vez de
// esperar três consultas novas (ver sondarSemSessao, em devices/sonda.ts).
const raizRelatorio: HTMLElement = exigir('relatorio');
const consultaDeRegimes: Promise<LinhaDoRelatorio[]> = levantarRelatorio();
void consultaDeRegimes.then((linhas: LinhaDoRelatorio[]) => {
  montarRelatorio(raizRelatorio, BATERIA, problemas, linhas);
  diario.nota('Já perguntamos ao navegador quais modos ele aceita. Para a sonda completa, clique em Sondar este aparelho.');
});

// --- 3. A cena e a demonstração (passos 7, 8 e 9) ---------------------------

/** O que a demonstração entrega para quem exporta os dados. */
interface Demonstracao {
  readonly renderer: WebGLRenderer;
  readonly orcamento: Orcamento;
}

/** Os botões que só fazem sentido com a cena montada. */
const BOTOES_DA_CENA: readonly string[] = ['fixar', 'girar', 'mover', 'redimensionar', 'chimbal', 'medir'];

const raizMedicao: HTMLElement = exigir('medicao');

/**
 * O QUE FAZ: monta palco, cena, laço e painel, liga os botões da
 *   demonstração e põe o laço para rodar.
 * POR QUE NUMA FUNÇÃO: para caber inteira dentro de UM `try` (ver o
 *   cabeçalho do arquivo). Qualquer erro aqui dentro vira falha no diário.
 */
function montarDemonstracao(): Demonstracao {
  const palco: Palco = montarPalco(exigir<HTMLCanvasElement>('cena'));
  const cena: CenaDaBateria = montarCena(BATERIA); // a cena nasce DO domínio
  const relogio: Relogio = new Relogio();
  const orcamento: Orcamento = new Orcamento(TETO_ADOTADO_MS); // teto declarado ANTES do conteúdo
  const laco: Laco = montarLaco(palco, cena.sala, relogio, orcamento);

  // O painel é pendurado no suporte que fica na plataforma — e não na câmera.
  const painel: Painel = montarPainel('Custo do quadro');
  cena.suporteDoPainel.add(painel.no);

  // A árvore impressa na página é refeita a cada troca de pai, para se ver a
  // mudança de parentesco na hora.
  const raizEstrutura: HTMLElement = exigir('estrutura');
  const atualizarEstrutura = (): void => {
    montarEstrutura(raizEstrutura, descreverArvore(cena.sala));
  };
  atualizarEstrutura();

  /** Pega o nó de uma peça pelo id (ou para com mensagem, se o domínio mudou). */
  const peca = (id: Parameters<typeof cena.pecas.get>[0]): Group => {
    const no: Group | undefined = cena.pecas.get(id);
    if (no === undefined) {
      throw new Error(`A cena não tem a peça "${id}".`);
    }
    return no;
  };
  // O bumbo é a peça da demonstração porque é a maior e mais fácil de ver;
  // a caixa é o "grupo de controle": continua solta e não deve se mover.
  const bumbo: Group = peca('bumbo');
  const caixa: Group = peca('caixa');

  /** Frase com a posição no mundo do bumbo e da caixa antes e depois de mexer na plataforma. */
  const relatoDoMovimento = (bumboAntes: string, caixaAntes: string): string =>
    `O bumbo (filho de "${bumbo.parent?.name}") foi de ${bumboAntes} para ${emMetros(posicaoNoMundo(bumbo))}. ` +
    `A caixa (filha de "${caixa.parent?.name}") estava em ${caixaAntes} e agora está em ${emMetros(posicaoNoMundo(caixa))}.`;

  // DEMONSTRAÇÃO, ITEM 3 (passo 8): fixar = trocar o pai do bumbo de `chao`
  // para `plataforma`. O diário mostra a posição no mundo antes, depois e os
  // desvios de posição e de orientação: a conferência "em números, não a
  // olho" que o enunciado pede.
  // Clicar de novo solta (volta para o chão): a operação inversa existe porque
  // a troca de pai É uma operação (o que a cópia por quadro não teria).
  // A troca de pai não move nada (é o esperado!), então a tela não mudaria.
  // A ligação amarela (linha plataforma → bumbo + anel no chão) torna a POSSE
  // visível: aparece ao fixar, some ao soltar e acompanha a plataforma.
  const ligacao: LigacaoDeParentesco = montarLigacao();
  const RAIO_DO_ANEL_DO_BUMBO_M: number = 0.34; // um pouco maior que o bumbo (56 cm de diâmetro)
  const botaoFixar: HTMLButtonElement = exigir('fixar');
  botaoFixar.addEventListener('click', () => {
    const fixado: boolean = bumbo.parent === cena.plataforma;
    const destino: Group = fixado ? cena.chao : cena.plataforma;
    try {
      const r: ResultadoDaTroca = reparentar(bumbo, destino);
      if (destino === cena.plataforma) {
        ligacao.ligar(cena.plataforma, bumbo, RAIO_DO_ANEL_DO_BUMBO_M);
      } else {
        ligacao.desligar();
      }
      const girada: boolean = cena.plataforma.rotation.y !== 0;
      diario.nota(
        `Bumbo agora é filho de "${destino.name}". Posição no mundo antes: ${emMetros(r.antes)}. ` +
          `Depois: ${emMetros(r.depois)}. Desvio de posição: ${r.desvio.toExponential(1)} m. ` +
          `Desvio de orientação: ${r.desvioAngularGraus.toExponential(1)} graus. ` +
          (girada ? 'A plataforma estava girada, então a conta também compôs a rotação. ' : '') +
          (destino === cena.plataforma
            ? 'Ele continua no mesmo lugar, mas agora está preso à plataforma (linha amarela). Gire ou mova a plataforma para ver ele ir junto.'
            : 'Ele voltou a ficar solto no chão.'),
      );
    } catch (erro: unknown) {
      diario.falha(erro instanceof Error ? erro.message : String(erro));
    }
    botaoFixar.textContent = bumbo.parent === cena.plataforma ? 'Soltar o bumbo da plataforma' : 'Fixar o bumbo na plataforma';
    atualizarEstrutura();
  });

  // DEMONSTRAÇÃO, ITEM 2 (passo 7), COM ROTAÇÃO: girar a plataforma 30° em
  // volta do próprio centro. O bumbo fixado gira junto em volta desse centro
  // (e muda de posição no mundo), a caixa solta fica parada.
  // POR QUE ESTE BOTÃO EXISTE: sem rotação, a demonstração só provaria
  // translação, que uma soma de coordenadas também acertaria. Girar antes de
  // fixar faz o desvio zero da troca de pai provar a composição de rotação.
  const ANGULO_DE_GIRO_RAD: number = MathUtils.degToRad(30);
  const botaoGirar: HTMLButtonElement = exigir('girar');
  botaoGirar.addEventListener('click', () => {
    const bumboAntes: string = emMetros(posicaoNoMundo(bumbo));
    const caixaAntes: string = emMetros(posicaoNoMundo(caixa));
    cena.plataforma.rotation.y = cena.plataforma.rotation.y === 0 ? ANGULO_DE_GIRO_RAD : 0;
    const graus: number = Math.round(MathUtils.radToDeg(cena.plataforma.rotation.y));
    diario.nota(`Plataforma girada para ${graus}°. ${relatoDoMovimento(bumboAntes, caixaAntes)}`);
    botaoGirar.textContent = graus === 0 ? 'Girar a plataforma 30°' : 'Desfazer o giro da plataforma';
  });

  // DEMONSTRAÇÃO, ITEM 2 (passo 7): mover o PAI move o FILHO. Só a posição da
  // plataforma é alterada; o bumbo (se fixado) acompanha sem nenhuma linha de
  // código para isso, e a caixa (solta, filha do chão) não se mexe. O diário
  // mostra as posições no mundo antes e depois das duas peças.
  const botaoMover: HTMLButtonElement = exigir('mover');
  botaoMover.addEventListener('click', () => {
    const bumboAntes: string = emMetros(posicaoNoMundo(bumbo));
    const caixaAntes: string = emMetros(posicaoNoMundo(caixa));
    cena.plataforma.position.x = cena.plataforma.position.x === 0 ? 0.4 : 0;
    diario.nota(
      `Plataforma movida para x = ${cena.plataforma.position.x.toFixed(2)} m. ${relatoDoMovimento(bumboAntes, caixaAntes)}`,
    );
    botaoMover.textContent = cena.plataforma.position.x === 0 ? 'Mover a plataforma 40 cm' : 'Voltar a plataforma';
  });

  // CASO DE FRONTEIRA DA NOSSA CENA: redimensionar a plataforma (1,5 ↔ 2,5 m)
  // sem esticar o que está preso nela. O diário mostra a escala do bumbo no
  // mundo, que tem de continuar 1,000 (fixado ou não).
  const botaoRedimensionar: HTMLButtonElement = exigir('redimensionar');
  botaoRedimensionar.addEventListener('click', () => {
    const ladoAtual: number = cena.piso.scale.x;
    const lado: number = cena.redimensionarPlataforma(ladoAtual < 2 ? 2.5 : BATERIA.plataforma.ladoInicial);
    const escalaDoBumbo: number = bumbo.getWorldScale(bumbo.scale.clone()).x;
    diario.nota(
      `A plataforma agora tem ${lado.toFixed(2)} m de lado. Só a malha do piso mudou de tamanho, ` +
        `então a escala do bumbo no mundo continua ${escalaDoBumbo.toFixed(3)}.`,
    );
    botaoRedimensionar.textContent = lado < 2 ? 'Redimensionar a plataforma para 2,5 m' : 'Voltar a plataforma para 1,5 m';
  });

  // DEMONSTRAÇÃO, ITEM 2 (outra forma): o parentesco INTERNO do chimbal. Só a
  // haste sobe (80 ↔ 90 cm); o prato de cima, filho dela, sobe junto.
  const botaoChimbal: HTMLButtonElement = exigir('chimbal');
  let alturaDoChimbal: number = 0.8;
  botaoChimbal.addEventListener('click', () => {
    const pratoAntes: number = posicaoNoMundo(cena.pratoDeCimaDoChimbal).y;
    alturaDoChimbal = cena.ajustarAlturaDoChimbal(alturaDoChimbal < 0.85 ? 0.9 : 0.8);
    const pratoDepois: number = posicaoNoMundo(cena.pratoDeCimaDoChimbal).y;
    diario.nota(
      `Haste do chimbal em ${(alturaDoChimbal * 100).toFixed(0)} cm. O prato de cima, que é filho da haste, ` +
        `foi de y = ${pratoAntes.toFixed(3)} m para ${pratoDepois.toFixed(3)} m sem este botão mexer nele: o botão só move a haste.`,
    );
    botaoChimbal.textContent = alturaDoChimbal < 0.85 ? 'Subir o chimbal para 90 cm' : 'Baixar o chimbal para 80 cm';
  });

  // PASSO 9 — ANIMAÇÃO CONTRA O RELÓGIO: o prato de cima do chimbal desce até
  // o de baixo e volta UMA VEZ POR SEGUNDO, como se o pedal fosse pisado.
  // COMO: a posição é função de `decorrido` (segundos), e não do número de
  //   quadros; logo o ciclo dura 1 s em qualquer máquina. CONFERÊNCIA: contar 10
  //   ciclos com um cronômetro em duas máquinas diferentes — 10 s nas duas.
  // POR QUE O CHIMBAL: é um movimento do NOSSO domínio (o professor gira um
  //   eixo porque a cena dele é um mecanismo).
  // POR QUE `(1 - cos) / 2`: vai de 0 a 1 e volta, começando em 0 — o chimbal
  //   começa aberto (pedal solto, como nasce em cena.ts) no primeiro quadro
  //   (delta = 0), sem salto. Multiplicado pela abertura, o prato de cima
  //   desce exatamente até encostar no de baixo, nunca além.
  const alturaBaseDoPratoDeCima: number = cena.pratoDeCimaDoChimbal.position.y;
  const CICLOS_POR_SEGUNDO: number = 1;
  laco.aoPasso((amostra: Amostra) => {
    const fase: number = 2 * Math.PI * CICLOS_POR_SEGUNDO * amostra.decorrido;
    cena.pratoDeCimaDoChimbal.position.y = alturaBaseDoPratoDeCima - (ABERTURA_DO_CHIMBAL_M * (1 - Math.cos(fase))) / 2;
    // DEMONSTRAÇÃO, ITEM 4: o painel recebe o orçamento e o tempo da cena (ele
    // mesmo decide redesenhar só 4 vezes por segundo).
    painel.atualizar([...linhasDoPainel(orcamento.ler()), `Tempo da cena: ${amostra.decorrido.toFixed(1)} s`], amostra.decorrido);
  });

  // MEDIÇÃO SOB DEMANDA (e não automática ao abrir): medir é perguntar ao
  // aparelho, e a resposta só vale depois de alguns quadros desenhados de
  // verdade (Cap. 5, seção 1.7). A folha sai com a máquina junto.
  exigir('medir').addEventListener('click', () => {
    montarMedicao(raizMedicao, folhaDeMedicao(palco.renderer, orcamento.ler()));
    diario.nota('Medição registrada logo abaixo, junto com os dados da máquina.');
  });

  // A cena sobe ASSIM que a página carrega: o regime de janela não pede gesto
  // de ninguém, e é o caso base do projeto inteiro.
  laco.iniciar();
  return { renderer: palco.renderer, orcamento };
}

let demonstracao: Demonstracao | undefined;
try {
  demonstracao = montarDemonstracao();
} catch (erro: unknown) {
  diario.falha(
    `${explicarFalha(erro, 'A cena não pôde ser montada')} A sonda e o relatório continuam funcionando logo abaixo.`,
  );
  for (const id of BOTOES_DA_CENA) {
    exigir<HTMLButtonElement>(id).disabled = true;
  }
}

// --- 4. Compartilhar: nome da máquina (obrigatório) + dois botões -----------

// O QUE FAZ: junta nome + medição + sonda num texto pronto e (a) põe no
//   clipboard ou (b) salva num arquivo .txt no aparelho.
// POR QUE OS BOTÕES SÓ LIBERAM COM O NOME: número sem máquina não serve para
//   comparar nada (Cap. 5, seção 1.6); e o navegador muitas vezes esconde o
//   nome da placa de vídeo, então o nome dado pela pessoa é o que identifica.
// POR QUE A SONDA ENTRA SE JÁ TIVER RODADO: ela exige clique próprio (gesto);
//   o texto diz "não rodou" quando for o caso, em vez de omitir.
// POR QUE O TEXTO TAMBÉM APARECE NA PÁGINA: se o navegador recusar o
//   clipboard, ninguém fica sem os dados — dá para copiar à mão.
// SEM CENA: a exportação continua; a medição sai como "ainda sem quadros
//   medidos" (um orçamento vazio) e a placa como "não identificada".
let ultimaSonda: ResultadoDaSonda | undefined;
const campoRotulo: HTMLInputElement = exigir('rotulo');
const botaoCopiar: HTMLButtonElement = exigir('copiar');
const botaoSalvar: HTMLButtonElement = exigir('salvar');

// Evento `input`: dispara a cada tecla (inclusive colar e apagar), então os
// botões ligam e desligam na hora. Espaços sozinhos não contam como nome.
campoRotulo.addEventListener('input', () => {
  const semNome: boolean = campoRotulo.value.trim() === '';
  botaoCopiar.disabled = semNome;
  botaoSalvar.disabled = semNome;
});

/** Monta o registro de AGORA (a medição é lida no momento do clique) e mostra o texto na página. */
function registroAtual(): { registro: RegistroDeMedicao; texto: string } {
  const leitura: LeituraDoOrcamento = (demonstracao?.orcamento ?? new Orcamento(TETO_ADOTADO_MS)).ler();
  const registro: RegistroDeMedicao = montarRegistro(campoRotulo.value, demonstracao?.renderer, leitura, ultimaSonda);
  const texto: string = textoParaCompartilhar(registro);
  montarMedicao(raizMedicao, texto.split('\n'));
  return { registro, texto };
}

botaoCopiar.addEventListener('click', () => {
  const { texto } = registroAtual();
  void copiarParaAreaDeTransferencia(texto).then((copiou: boolean) => {
    if (copiou) {
      diario.nota('Dados copiados. Agora é só colar onde quiser. Eles também estão logo abaixo.');
    } else {
      diario.alerta('O navegador não deixou copiar sozinho. O texto está logo abaixo, dá para selecionar e copiar à mão.');
    }
  });
});

botaoSalvar.addEventListener('click', () => {
  const { registro, texto } = registroAtual();
  const nome: string = nomeDoArquivo(registro);
  salvarArquivo(nome, texto);
  diario.nota(`Arquivo "${nome}" salvo na pasta de downloads deste aparelho.`);
});

// --- 5. A sonda completa (passos 5 e 6) -------------------------------------

const raizSonda: HTMLElement = exigir('sonda');
const botaoSondar: HTMLButtonElement = exigir('sondar');

/**
 * O QUE FAZ: roda a sonda completa e escreve o resultado.
 * POR QUE O BOTÃO FICA DESLIGADO ENQUANTO RODA: um segundo clique com a
 *   primeira sessão ainda aberta pediria outra sessão, que o navegador recusa
 *   ("já existe uma sessão aberta"), e a segunda resposta apagaria a primeira.
 *   O `finally` religa o botão em qualquer desfecho.
 * POR QUE O MOTIVO VAI PARA O DIÁRIO E NÃO SÓ PARA O CONSOLE: quem está de
 *   visor não abre console; a falha também é resultado (Cap. 2, seção 1.7).
 */
async function executarSonda(): Promise<void> {
  botaoSondar.disabled = true;
  diario.nota('Sondando o aparelho. Se aparecer um pedido de permissão, aceite, senão a sessão não abre.');
  try {
    const resultado: ResultadoDaSonda = await sondar(await consultaDeRegimes);
    const confronto: string | undefined =
      resultado.emSessao === undefined ? undefined : conferirComposicao(resultado.emSessao);
    montarSonda(raizSonda, resultado, confronto);
    ultimaSonda = resultado; // guardada para "Copiar" e "Salvar" levarem junto
    // A frase diz qual dos casos aconteceu, para ninguém achar que houve
    // sessão onde não houve (no PC a sonda termina na hora, sem sessão).
    const s = resultado.emSessao;
    if (s === undefined) {
      diario.nota(`Sondagem concluída sem sessão imersiva. ${resultado.motivoSemSessao ?? ''}`);
    } else if (s.interrupcao !== undefined) {
      diario.alerta(`Sondagem concluída pela metade. ${s.interrupcao} O que deu para ler está em Sonda de capacidades.`);
    } else {
      diario.nota(`Sondagem concluída. A sessão ${s.modo} abriu, observamos ${s.estabilidade.quadros} quadros e depois ela foi fechada.`);
    }
  } catch (erro: unknown) {
    diario.falha(explicarFalha(erro));
  } finally {
    botaoSondar.disabled = false;
  }
}

// POR QUE UM BOTÃO: o navegador recusa abrir sessão imersiva que não venha de
// um gesto de quem usa. Não é cerimônia da página: é regra da API (Cap. 2).
botaoSondar.addEventListener('click', () => {
  void executarSonda();
});
