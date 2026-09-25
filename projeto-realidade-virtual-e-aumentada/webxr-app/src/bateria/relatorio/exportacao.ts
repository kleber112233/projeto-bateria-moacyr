// ===========================================================================
// exportacao.ts — COPIAR MEDIÇÃO E SONDA PARA COMPARTILHAR
// ===========================================================================
//
// O QUE É
//   A "exportação": junta a máquina, a medição do quadro e o resultado da
//   sonda num TEXTO PRONTO e coloca na área de transferência (clipboard).
//
// O QUE FAZ
//   Depois que a pessoa informa o NOME DA MÁQUINA, dois botões ficam liberados:
//   - "Copiar": o texto vai para o clipboard → cola-se onde quiser (WhatsApp,
//     Discord, Google Docs, issue do GitHub, planilha);
//   - "Salvar": o MESMO texto é baixado como arquivo .txt no aparelho, com a
//     data e o nome da máquina no nome do arquivo (bom para guardar em
//     docs/medicoes/ do repositório).
//   O texto tem duas partes:
//     1. um RESUMO legível, para ler e discutir;
//     2. uma LINHA CSV (com cabeçalho), para quem estiver juntando os dados de
//        todas as máquinas numa planilha e comparando lado a lado.
//
// COMO FAZ
//   Monta o texto e usa `navigator.clipboard.writeText` (API moderna do
//   navegador). Se ela falhar, tenta o método antigo (textarea + `execCommand`);
//   se nada funcionar, devolve `false` e a página mostra o texto para copiar
//   à mão. (Conhecimento de Web, fora do material.)
//
// QUE OUTRA OPÇÃO TERÍAMOS
//   a) Só baixar arquivo, ou só copiar.
//   b) Guardar no navegador (`localStorage`).
//   c) Mandar para um servidor ou planilha online.
//
// POR QUE ESTA E NÃO A OUTRA
//   a) Os dois servem a usos diferentes: copiar é um gesto só para mandar no
//      grupo agora; o arquivo fica guardado para versionar e comparar depois.
//      Oferecer os dois custa quase nada (é o mesmo texto).
//   b) Fica preso naquele navegador daquela máquina.
//   c) Infraestrutura nova, fora do escopo do módulo.
//
// POR QUE O NOME DA MÁQUINA É OBRIGATÓRIO
//   O navegador muitas vezes esconde o nome da placa de vídeo. Sem um nome,
//   duas medições de máquinas diferentes ficariam indistinguíveis — e número
//   sem máquina é justamente o que o material manda não fazer.
//
// POR QUE PRECISAMOS
//   Para juntar as medições de todos e comparar. E porque "nenhum número viaja
//   sozinho" (Cap. 5, seção 1.6): o texto copiado SEMPRE leva a máquina junto
//   do número, e o enunciado exige o número "com a máquina em que foi medido".
//
// POR QUE O CLIPBOARD FUNCIONA AQUI
//   `navigator.clipboard` exige página em HTTPS (temos, por causa da WebXR) e
//   um gesto de quem usa (o clique no botão) — a mesma lógica de segurança da
//   sessão imersiva: o navegador não deixa um site mexer no clipboard sozinho.
// ===========================================================================

import type { WebGLRenderer } from 'three';

import type { LeituraDoOrcamento } from '../core/orcamento';
import type { ResultadoDaSonda } from '../devices/sonda';
import { identificarPlaca } from './medicao';

/** Descrição da máquina: o CONTEXTO que vai junto de todo número. */
export interface Maquina {
  /** Nome dado pela pessoa (ex.: "PC lab 3"). Vazio vira "sem nome". */
  readonly rotulo: string;
  readonly navegador: string;
  readonly placa: string;
  readonly tela: string;
  readonly densidade: number;
}

/** Tudo o que vai para o texto compartilhado. */
export interface RegistroDeMedicao {
  /** Data e hora em ISO 8601: ordena certo e é lida em qualquer planilha. */
  readonly data: string;
  readonly maquina: Maquina;
  readonly orcamento: LeituraDoOrcamento;
  /** Resultado da sonda, se ela já rodou nesta página; senão `undefined`. */
  readonly sonda: ResultadoDaSonda | undefined;
}

/**
 * O QUE FAZ: junta máquina, orçamento e sonda num registro só.
 * POR QUE O NOME DADO PELA PESSOA: o navegador muitas vezes esconde o nome da
 *   placa de vídeo ("placa não identificada"); sem um rótulo, duas medições de
 *   máquinas diferentes ficariam impossíveis de distinguir.
 * POR QUE `renderer` PODE SER `undefined`: se a cena não pôde ser montada, a
 *   sonda continua valendo e precisa poder ser copiada e salva.
 */
export function montarRegistro(
  rotulo: string,
  renderer: WebGLRenderer | undefined,
  orcamento: LeituraDoOrcamento,
  sonda: ResultadoDaSonda | undefined,
): RegistroDeMedicao {
  return {
    data: new Date().toISOString(),
    maquina: {
      rotulo: rotulo.trim() === '' ? 'sem nome' : rotulo.trim(),
      navegador: navigator.userAgent,
      placa: identificarPlaca(renderer),
      tela: `${window.screen.width}x${window.screen.height}`,
      densidade: window.devicePixelRatio,
    },
    orcamento,
    sonda,
  };
}

/** Número com 2 casas, para o resumo legível. */
function ms(valor: number): string {
  return `${valor.toFixed(2)} ms`;
}

/**
 * O QUE FAZ: resume a sonda em poucas linhas.
 * POR QUE DIZER "NÃO RODOU" EXPLICITAMENTE: ausência de linha seria ambígua
 *   (não rodou? rodou e não achou nada?). Dizer fecha a dúvida.
 */
function linhasDaSonda(sonda: ResultadoDaSonda | undefined): string[] {
  if (sonda === undefined) {
    return ['Sonda: ainda não rodou nesta página. Clique em Sondar este aparelho antes de copiar para ela entrar aqui.'];
  }
  const s = sonda.emSessao;
  const linhas: string[] = [`Sonda: classe do aparelho ${sonda.classe}`];
  if (s === undefined) {
    linhas.push(`  sem sessão imersiva: ${sonda.motivoSemSessao ?? 'motivo não registrado'}`);
    return linhas;
  }
  const porEstado = (estado: string): string =>
    s.recursos.filter((r) => r.estado === estado).map((r) => r.nome).join(', ') || 'nenhum';
  linhas.push(
    `  sessão: ${s.modo}, graus de liberdade: ${s.graus} (${s.posesObservadas} poses, ${s.posesComPosicaoEmulada} emuladas)`,
    `  forma de interação: ${s.modoDeInteracao ?? 'não informada'}`,
    `  observação: ${s.interrupcao ?? `completa (${s.estabilidade.quadros} quadros)`}`,
    `  composição do fundo: ${s.composicaoObservada}`,
    `  recursos concedidos: ${porEstado('concedido')}`,
    `  recursos não concedidos (motivo não informado): ${porEstado('negado')}`,
    `  sem resposta: ${porEstado('indeterminado')}`,
    `  espaços de referência: ${s.espacosConcedidos.join(', ') || 'nenhum'}`,
    `  fontes de entrada: ${s.fontesDeEntrada.map((f) => `${f.lado}/${f.mira}`).join(', ') || 'nenhuma'}`,
    `  estabilidade: ${s.estabilidade.quadros} quadros, ${s.estabilidade.quadrosSemPose} sem pose`,
  );
  return linhas;
}

/**
 * O QUE É: as colunas da linha CSV, na ordem. Primeiro o contexto (máquina),
 *   depois os números — "o contexto chega antes do número" (Cap. 5).
 * POR QUE O CABEÇALHO É FIXO: linhas de máquinas diferentes só se empilham
 *   numa planilha se tiverem as mesmas colunas na mesma ordem.
 */
const COLUNAS_CSV: readonly string[] = [
  'data', 'maquina', 'placa', 'navegador', 'tela', 'densidade',
  'teto_ms', 'quadros_medidos', 'custo_medio_ms', 'pior_custo_ms', 'quadros_acima_do_teto',
  'intervalo_medio_ms', 'pior_intervalo_ms', 'chamadas_de_desenho', 'triangulos', 'quadros_com_salto_cortado',
  'classe_do_aparelho', 'modo_da_sessao', 'graus_de_liberdade', 'composicao_do_fundo',
];

/**
 * O QUE FAZ: prepara um valor para uma célula de CSV.
 * POR QUE AS ASPAS: o nome do navegador tem vírgulas; sem aspas cada vírgula
 *   viraria uma coluna nova. Regra do CSV: valor entre aspas e aspas internas
 *   duplicadas.
 */
function celulaCsv(valor: string | number): string {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

/**
 * O QUE FAZ: gera cabeçalho + linha CSV do registro.
 * POR QUE VÍRGULA COMO SEPARADOR E PONTO COMO DECIMAL: é o CSV padrão; o
 *   Google Sheets separa em colunas sozinho (Dados → Dividir texto em colunas)
 *   e o Excel importa por Dados → De Texto/CSV.
 */
function linhaCsv(r: RegistroDeMedicao): string {
  const o: LeituraDoOrcamento = r.orcamento;
  const s = r.sonda?.emSessao;
  const vazio: string = r.sonda === undefined ? 'não sondado' : 'sem sessão';
  const valores: (string | number)[] = [
    r.data, r.maquina.rotulo, r.maquina.placa, r.maquina.navegador, r.maquina.tela, r.maquina.densidade,
    o.tetoMs, o.quadrosMedidos, o.custoMedioMs.toFixed(3), o.piorCustoMs.toFixed(3), o.quadrosAcimaDoTeto,
    o.intervaloMedioMs.toFixed(3), o.piorIntervaloMs.toFixed(3), o.chamadasDeDesenho, o.triangulos, o.quadrosComSaltoCortado,
    r.sonda?.classe ?? 'não sondado', s?.modo ?? vazio, s?.graus ?? vazio, s?.composicaoObservada ?? vazio,
  ];
  return `${COLUNAS_CSV.map(celulaCsv).join(',')}\n${valores.map(celulaCsv).join(',')}`;
}

/**
 * O QUE FAZ: monta o TEXTO que vai para o clipboard.
 * POR QUE TEXTO SIMPLES (e não tabela Markdown ou negrito): cola bem em
 *   qualquer lugar. Negrito com ** sai com asteriscos no WhatsApp; tabela
 *   Markdown vira bagunça fora do GitHub. O bloco ``` da linha CSV é entendido
 *   por WhatsApp, Discord e GitHub (fonte fixa) e não atrapalha em outros apps.
 * POR QUE A ORDEM MÁQUINA → NÚMEROS → SONDA → CSV: o contexto antes do número;
 *   a linha CSV por último porque ela é para máquina, não para gente.
 */
export function textoParaCompartilhar(r: RegistroDeMedicao): string {
  const o: LeituraDoOrcamento = r.orcamento;
  const quando: string = new Date(r.data).toLocaleString('pt-BR');
  const medicao: string[] =
    o.quadrosMedidos === 0
      ? ['Quadro: ainda sem quadros medidos.']
      : [
          `Quadro (últimos ${o.quadrosMedidos} quadros, teto de ${o.tetoMs} ms do visor a 72 Hz):`,
          `  custo médio ${ms(o.custoMedioMs)}, pior ${ms(o.piorCustoMs)}, ${o.quadrosAcimaDoTeto} quadro(s) acima do teto`,
          `  intervalo médio ${ms(o.intervaloMedioMs)}, pior ${ms(o.piorIntervaloMs)}`,
          `  ${o.chamadasDeDesenho} chamadas de desenho e ${o.triangulos} triângulos`,
          `  ${o.quadrosComSaltoCortado} quadro(s) com salto de tempo cortado (mais de 0,1 s)`,
        ];
  return [
    `Bateria VR, medição de "${r.maquina.rotulo}" em ${quando}`,
    `Máquina: ${r.maquina.placa}, tela ${r.maquina.tela}, densidade ${r.maquina.densidade}`,
    `Navegador: ${r.maquina.navegador}`,
    '',
    ...medicao,
    '',
    ...linhasDaSonda(r.sonda),
    '',
    'Linha para planilha (CSV):',
    '```',
    linhaCsv(r),
    '```',
  ].join('\n');
}

/**
 * O QUE FAZ: coloca o texto na área de transferência. Devolve se conseguiu.
 * COMO FAZ (duas tentativas):
 *   1. `navigator.clipboard.writeText` — a API moderna (precisa de HTTPS e de
 *      clique, que temos);
 *   2. se falhar (navegador antigo, permissão negada), o método antigo: um
 *      <textarea> invisível, seleciona e `document.execCommand('copy')`.
 *      Está marcado como obsoleto, mas ainda funciona na maioria dos navegadores.
 * POR QUE DEVOLVER `false` EM VEZ DE LANÇAR ERRO: falhar ao copiar não é
 *   defeito do ambiente; a página mostra o texto para copiar à mão.
 */
export async function copiarParaAreaDeTransferencia(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area: HTMLTextAreaElement = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed'; // fora do fluxo: não faz a página pular
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let copiou: boolean = false;
    try {
      copiou = document.execCommand('copy');
    } catch {
      copiou = false;
    }
    area.remove();
    return copiou;
  }
}

/**
 * O QUE FAZ: transforma o nome da máquina num pedaço seguro de nome de
 *   arquivo ("PC Lab 3 (Intel)" → "pc-lab-3-intel").
 * POR QUE PRECISAMOS: espaço, acento e barra dão problema em nome de arquivo
 *   no Windows, no celular e no git.
 */
function paraNomeDeArquivo(texto: string): string {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // tira acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // o que não for letra/número vira hífen
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'sem-nome'
  );
}

/**
 * O QUE FAZ: monta o nome do arquivo: medicao_AAAA-MM-DD_HHMM_maquina.txt.
 * POR QUE A DATA PRIMEIRO: numa pasta, os arquivos ficam em ordem cronológica
 *   sozinhos. POR QUE .txt: o conteúdo é o mesmo texto do "Copiar", que abre
 *   em qualquer aparelho sem programa especial.
 */
export function nomeDoArquivo(r: RegistroDeMedicao): string {
  // Hora LOCAL no nome do arquivo (é o que a pessoa reconhece na pasta); o
  // conteúdo continua com a data em ISO/UTC, que ordena certo em planilha.
  const d: Date = new Date(r.data);
  const dois = (n: number): string => String(n).padStart(2, '0');
  const dia: string = `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
  const hora: string = `${dois(d.getHours())}${dois(d.getMinutes())}`;
  return `medicao_${dia}_${hora}_${paraNomeDeArquivo(r.maquina.rotulo)}.txt`;
}

/**
 * O QUE FAZ: faz o navegador baixar um arquivo de texto.
 * COMO FAZ: Blob (o conteúdo em memória) → endereço temporário
 *   (`URL.createObjectURL`) → link invisível com atributo `download` → clique.
 *   É o jeito padrão de gerar download sem servidor.
 * POR QUE `revokeObjectURL` DEPOIS (com espera de 1 s): o endereço temporário
 *   segura o conteúdo na memória até ser liberado; a espera é porque alguns
 *   navegadores (Safari) ainda estão lendo o endereço logo após o clique.
 */
export function salvarArquivo(nome: string, conteudo: string): void {
  const blob: Blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
  const endereco: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = endereco;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(endereco), 1000);
}
