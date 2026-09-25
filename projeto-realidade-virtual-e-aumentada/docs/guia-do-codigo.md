# Guia do código — Bateria acústica em RV/RA (estado do Módulo 03)

Este guia explica **cada parte do código** para quem nunca programou em TypeScript nem usou Three.js. Serve para qualquer integrante do grupo conseguir explicar qualquer peça no sorteio, inclusive as que não escreveu.

Cada arquivo é explicado com as mesmas perguntas usadas nos comentários do código:

| Pergunta | O que responde |
|---|---|
| **O que é?** | a peça, em uma frase |
| **O que faz?** | o comportamento visível ou o dado que ela produz |
| **Como faz?** | o caminho no código, passo a passo |
| **Que outra opção teríamos?** | a alternativa que existia |
| **Por que esta e não a outra?** | a razão técnica da escolha |
| **Por que precisamos?** | o que quebraria sem ela |
| **Base no material** | onde a ideia está no livro/projeto do professor |

Referências ao material: **Cap. 1** = "O contínuo entre o sintético e o real"; **Cap. 2** = "Dispositivos, rastreamento e graus de liberdade"; **Cap. 3** = "Grafo de cena e laço de renderização"; **Cap. 4** = "Técnicas de modelagem de ambientes virtuais"; **Cap. 5** = "Ativos, formatos de troca e orçamento de cena". "Projeto do professor" = a Bancada, marco 03.

---

## Sumário

1. [Conceitos básicos antes de ler o código](#1-conceitos-básicos-antes-de-ler-o-código)
2. [Visão geral: o que acontece quando a página abre](#2-visão-geral-o-que-acontece-quando-a-página-abre)
3. [Arquivos de configuração e a página](#3-arquivos-de-configuração-e-a-página)
4. [Módulo 01 — domínio e regimes](#4-módulo-01--domínio-e-regimes)
5. [Módulo 02 — a sonda e o relatório](#5-módulo-02--a-sonda-e-o-relatório)
6. [Módulo 03 — cena, troca de pai, relógio e orçamento](#6-módulo-03--cena-troca-de-pai-relógio-e-orçamento)
7. [Ferramentas extras: medição e compartilhar](#7-ferramentas-extras-medição-e-compartilhar)
8. [O ponto de entrada: main.ts](#8-o-ponto-de-entrada-maints)
9. [Onde a nossa cena difere do projeto do professor](#9-onde-a-nossa-cena-difere-do-projeto-do-professor)
10. [Casos de fronteira e limitações](#10-casos-de-fronteira-e-limitações)
11. [Perguntas prováveis na apresentação](#11-perguntas-prováveis-na-apresentação)
12. [Glossário](#12-glossário)

---

## 1. Conceitos básicos antes de ler o código

### 1.1 A página, o JavaScript e o TypeScript

- Uma **página web** é um arquivo HTML (`index.html`) que o navegador abre. Ela pode carregar **código** que roda dentro do navegador.
- **JavaScript** é a linguagem que o navegador entende.
- **TypeScript** é JavaScript **com tipos**: a gente escreve, por exemplo, que uma variável é um número (`const altura: number = 0.9`). Antes de rodar, o **compilador** (`tsc`) confere se ninguém está usando um número onde deveria haver um texto, se um nome está escrito certo etc. Depois, os tipos são apagados e sobra JavaScript comum.
- **Por que TypeScript?** Porque muitos erros aparecem **antes** de rodar. Isso combina com a ideia do professor de "modelo que se confere sozinho" (Cap. 1).

### 1.2 O vocabulário de TypeScript que aparece no projeto

| Escrita | O que significa | Exemplo no projeto |
|---|---|---|
| `const x: number = 1` | variável que **não muda** de valor, do tipo número | `const ESPESSURA_DO_PISO: number = 0.05` |
| `let x = 1` | variável que **pode mudar** | `let alturaDoChimbal = 0.8` |
| `string`, `number`, `boolean` | texto, número, verdadeiro/falso | — |
| `type A = 'x' \| 'y'` | **união literal**: só aceita exatamente esses textos | `type Suporte = 'sim' \| 'nao' \| 'desconhecido'` |
| `interface Nome { ... }` | descreve o **formato** de um objeto (que campos ele tem) | `interface Peca { id, nome, papel, dimensoes, ... }` |
| `readonly` | o campo não pode ser alterado depois de criado | `readonly nome: string` |
| `A \| undefined` | "pode ser A, ou pode não existir" | `emSessao: SondaEmSessao \| undefined` |
| `function f(a: T): R { }` | função que recebe `a` do tipo T e devolve R | `function reparentar(filho, novoPai): ResultadoDaTroca` |
| `(a) => ...` | função curta ("arrow function") | `.filter((p) => p.papel === 'instrumento')` |
| `class X { }` | molde para criar objetos com dados + funções | `class Relogio`, `class Orcamento`, `class Diario` |
| `export` / `import` | um arquivo **oferece** algo / outro arquivo **usa** | `import { BATERIA } from './bateria/dominio/dominio'` |
| `async` / `await` / `Promise` | operação que **demora** (ex.: perguntar ao aparelho); `await` espera o resultado sem travar a página | `await xr.isSessionSupported(id)` |
| `try { } catch { }` | tenta algo; se der erro, cai no `catch` em vez de quebrar tudo | pedir espaço de referência que pode ser negado |
| `switch (x) { case ...: }` | escolhe um caminho conforme o valor | rótulos em português para cada estado |
| `x ?? y` | "use x; se x não existir, use y" | `document.getElementById('bancada') ?? document.body` |
| `x?.campo` | "leia o campo, se x existir" | `resultado.sonda?.emSessao` |

### 1.3 Node, npm e Vite

- **Node.js** roda JavaScript fora do navegador; aqui ele só serve para as **ferramentas**.
- **npm** instala bibliotecas (`npm install`) listadas no `package.json`.
- **Vite** é o servidor de desenvolvimento (`npm run dev`): entrega a página, converte TypeScript em JavaScript na hora e recarrega quando um arquivo muda. O `npm run build` gera a versão final na pasta `dist/`.

### 1.4 Three.js — a biblioteca 3D

| Peça do Three.js | O que é | Analogia |
|---|---|---|
| `Scene` | a raiz de tudo o que existe | o palco inteiro |
| `Object3D` | qualquer coisa com posição, rotação e escala | um ponto no espaço |
| `Group` | um `Object3D` sem forma, que serve para agrupar filhos | uma caixa invisível que carrega coisas |
| `Mesh` | uma forma visível = geometria + material | um objeto de verdade |
| `Geometry` (`BoxGeometry`, `CylinderGeometry`...) | o formato (vértices e triângulos) | o molde |
| `Material` | como a superfície responde à luz (cor, metálico, rugoso) | a tinta |
| `Light` | fonte de luz | a lâmpada |
| `PerspectiveCamera` | de onde se olha | o olho |
| `WebGLRenderer` | quem desenha a cena na tela usando a placa de vídeo | o pintor |

**Coordenadas:** X = direita, **Y = cima**, Z = para frente (em direção a quem olha). **1 unidade = 1 metro.**

### 1.5 WebXR — a interface de realidade virtual/aumentada do navegador

- **Sessão:** o "modo imersivo" aberto. Existem três modos: `inline` (na página), `immersive-vr` (visor), `immersive-ar` (celular/passthrough).
- **Regime** (termo do professor): o que o ambiente faz com o mundo real — *substitui* (VR), *preserva* e põe coisas por cima (AR) ou *exibe* numa janela (PC).
- **Espaço de referência:** onde fica o "zero" do mundo virtual (`viewer`, `local`, `local-floor`, `bounded-floor`, `unbounded`).
- **Recursos opcionais:** capacidades extras que se pedem ao abrir a sessão (achar o chão, âncoras, planos, mãos...).
- **Fontes de entrada:** controles, mãos, toque na tela.
- **Pose:** posição + orientação. **Graus de liberdade:** quantos desses números o aparelho mede (3 = só orientação; 6 = orientação e posição).
- **HTTPS obrigatório:** o navegador só expõe a WebXR em "contexto seguro". Por isso o servidor usa um certificado.
- **Gesto obrigatório:** o navegador só abre sessão imersiva a partir de um clique.

---

## 2. Visão geral: o que acontece quando a página abre

```
index.html  ──carrega──►  src/main.ts
                              │
   1. cria o Diário (mensagens na página)
   2. confere o domínio (dominio.ts) ─────────► alerta se houver problema
   3. pergunta ao navegador, sem sessão, que regimes ele aceita ──► tabela de regimes
   4. dentro de um try: monta o palco (palco.ts) e a cena (cena.ts, a partir do domínio),
      cria relógio, orçamento, laço e painel, liga os botões da cena
      (fixar, girar, mover, redimensionar, chimbal, medir) e inicia o laço
      ──► a cada quadro: ajustar → relógio → passos → desenhar → medir custo
      (se o WebGL falhar: falha no diário, botões da cena desligados, e segue)
   5. liga copiar e salvar
   6. espera o clique em "Sondar este aparelho" ──► sonda completa ──► relatório
```

**A decisão de arquitetura que amarra tudo:** cada módulo **ignora os outros**. O palco desenha e não sabe o que é bateria. A cena conhece a bateria e não mede tempo. O relógio mede tempo e não conhece peças. O orçamento compara números com um teto e não sabe de onde vêm. O relatório só apresenta. O `main.ts` só junta. Resultado: dá para trocar uma peça sem mexer nas outras — quando o regime VR entrar, muda o palco e a cena fica igual (Cap. 3, seção 1.6).

**Mapa das pastas em `webxr-app/src/bateria/`:**

| Pasta | Módulo do curso | Pergunta que responde |
|---|---|---|
| `dominio/` | 01 | O que existe e o que conclui a tarefa? |
| `modes/` | 01 e 02 | Quais são os regimes e o aparelho entra em cada um? |
| `devices/` | 02 | O que o aparelho oferece de verdade? |
| `relatorio/` | 02 e 03 | Como mostrar tudo isso a quem está usando? |
| `core/` | 03 | Como a cena é montada, animada e medida? |
| `ui/` | 03 | Como mostrar números **dentro** da cena? |

---

## 3. Arquivos de configuração e a página

### `webxr-app/package.json`
- **O que é:** a "ficha" do projeto Node: nome, bibliotecas e comandos.
- **O que faz:** declara `three` (a biblioteca 3D) e as ferramentas de desenvolvimento (`typescript`, `vite`, `@vitejs/plugin-basic-ssl`, `@types/three`, `@types/webxr`). Define os comandos `dev`, `build`, `typecheck`, `preview`.
- **Por que `@types/webxr` é declarado explicitamente:** os tipos da WebXR não vêm com o TypeScript. Sem declarar essa dependência, os arquivos que não importam o Three.js (como a sonda) não reconheceriam `XRSession` e similares. Declarar deixa claro de onde vêm os tipos.

### `webxr-app/tsconfig.json`
- **O que é:** as regras do compilador TypeScript.
- **O que faz:** liga o modo estrito (`strict`), recusa variáveis e parâmetros não usados (`noUnusedLocals`, `noUnusedParameters`) e carrega os tipos do Vite e da WebXR (`"types": ["vite/client", "webxr"]`).
- **Por que estrito:** deixa o compilador cobrar os casos esquecidos, como um `switch` que não trata todos os valores de um tipo.

### `webxr-app/vite.config.ts`
- **O que é:** a configuração do servidor.
- **O que faz:** liga o plugin `basicSsl` (gera o certificado → HTTPS), escuta em toda a rede (`host: true`, para o celular acessar) na porta 5173 e libera os endereços de túnel (`allowedHosts`).
- **Por que HTTPS:** sem ele a API WebXR não existe na página, e o aparelho pareceria não ter suporte (Cap. 2, seção 1.5).

### `.gitattributes` (na raiz)
- **O que faz:** normaliza as quebras de linha (`eol=lf`). **Por que:** o grupo usa Windows (CRLF) e o histórico usa LF; sem a regra, cada máquina via todos os arquivos como "modificados" sem mudança nenhuma.

### `webxr-app/index.html`
- **O que é:** a página. Tem o `<canvas id="cena">` (onde a cena é desenhada), os botões, o campo "Informe um nome da máquina", as áreas do diário, da estrutura, da medição, da sonda e do relatório, e carrega `src/main.ts`.
- **Decisões de estilo que têm motivo:**
  - texto grande e contraste alto → o relatório precisa ser lido **dentro do visor**, a um braço de distância;
  - botões grandes → no visor a mira é um raio de controle, e alvo pequeno vira exercício de pontaria;
  - tabelas que quebram linha em vez de rolar para o lado → rolagem lateral no visor torna o relatório ilegível;
  - em telas de até 640 px (celular), cada linha de tabela vira um bloco com o nome da coluna antes de cada valor (atributo `data-coluna`, posto por `relatorio.ts`), e textos longos sem espaço quebram (`overflow-wrap: anywhere`). Conferido: a 390 px a página tem 390 px de largura, sem rolagem lateral;
  - botão desligado fica apagado (`button:disabled`) → mostra que falta preencher o nome da máquina;
  - o tamanho do canvas é decidido pelo CSS (`aspect-ratio: 16 / 9`); o código só acerta o buffer de desenho a esse tamanho.

---

## 4. Módulo 01 — domínio e regimes

### 4.1 `dominio/dominio.ts` — o domínio escrito como dado (passo 2)

**O que é?** A descrição, em código, do que existe no ambiente e do que conclui a tarefa: as 15 peças, o papel de cada uma, as medidas em metros, a plataforma, a folga de encaixe, a tarefa e o estado final.

**O que faz?**
1. Guarda o inventário **num lugar só**: a cena lê as medidas daqui e o relatório mostra a tabela daqui.
2. Confere se o domínio é coerente (`inconsistenciasDoDominio`) antes de existir qualquer polígono.

**Como faz?**
- `type PecaId = 'bumbo' | 'caixa' | ...` — a lista fechada dos 15 nomes. Se alguém escrever `'bumbu'`, o compilador recusa.
- `type Papel = 'instrumento' | 'ferragem' | 'baqueta'` — o papel decide o que o estado final cobra:
  - `instrumento` (bumbo, caixa, toms, pratos, chimbal): precisa ser **fixado e soar**;
  - `ferragem` (estantes, pedais, banco): precisa ser **fixado**, mas não soa;
  - `baqueta`: **nunca é fixada** — acompanha a mão.
- `interface Dimensoes { largura, altura, profundidade }` — a caixa que envolve a peça, **em metros**, com **Y como altura**.
- Cada peça tem `origemDaMedida`: diz se o número veio da especificação ("seção 4") ou é "provisório".
- As dimensões são da peça **em repouso**: suporte na altura inicial e, no chimbal, pedal solto (pratos 2 cm abertos, topo do prato de cima a 80 cm). A cena constrói cada peça com exatamente essa caixa.
- `ajuste?: FaixaDeAjuste` — o curso do suporte, como na coluna "Faixa de ajuste" da seção 4: `altura` em metros (chimbal 0,70 a 0,90; estantes; banco; tom de chão) ou `inclinacao` em graus (pratos, 0° a 45°). A caixa não tem faixa porque quem sobe e desce é a estante dela. A cena lê daqui a faixa do chimbal, e o relatório mostra a coluna.
- `FOLGA_DE_ENCAIXE_M = 0.08` é uma constante usada no campo `folgaDeEncaixe` **e** na frase do estado final, para os dois não discordarem.
- `BATERIA` é a constante com todos os dados.
- `contarEstadoFinal()` **conta** (em vez de escrever à mão) quantas peças precisam ser fixadas (13), quantas precisam soar (8) e quantas ficam de fora (2 baquetas).
- `inconsistenciasDoDominio()` percorre as peças e devolve **frases** para cada problema: lado inicial da plataforma fora do intervalo, peça repetida, medida zero ou negativa, peça a fixar maior que a plataforma mínima, faixa de ajuste com mínimo maior que o máximo, altura em repouso fora da faixa do próprio suporte, nenhum instrumento.

**Que outra opção teríamos?** (a) Deixar o inventário só no documento de especificação, em texto. (b) Espalhar as medidas direto no código da cena. (c) Para o papel, usar dois booleanos (`fixa` e `soa`). (d) Para a conferência, devolver `true/false`.

**Por que esta e não a outra?**
- (a) Texto não é conferido por ninguém: um nome errado num documento só aparece quando alguém procura a peça na cena.
- (b) Número espalhado vira "número mágico" — quando a medida muda, é preciso caçar cada lugar.
- (c) Dois booleanos permitem uma combinação sem sentido ("soa, mas não é fixado"). Três valores nomeados só permitem os casos reais.
- (d) Um `false` diz que há defeito e obriga a caçar qual; a frase já diz **qual peça e por quê**.

**Por que precisamos?** O professor cobra que a árvore do Módulo 03 contenha **exatamente** os objetos prometidos no passo 2. Como a cena é construída a partir do domínio, não tem como prometer uma coisa e desenhar outra. E a conferência roda **sempre** na abertura: "o teste que roda em outro lugar é o teste que alguém desliga na semana em que ele atrapalha".

**Base no material:** Cap. 1, seção 1.6 (tarefa em uma frase, inventário, estado final observável, "o modelo que se confere sozinho").

**Onde difere do professor:** na Bancada, cada peça tem um **encaixe (socket)** certo, e a conferência procura "encaixe órfão". Na bateria a montagem é **livre** (qualquer lugar da plataforma), então, no lugar dos sockets, cada peça tem um **papel**.

**Coerência com a especificação:** a contagem do estado final (13 a fixar, 8 a soar), o eixo Y como vertical e as faixas de ajuste são os mesmos da especificação atual; o registro de mudanças no fim dela explica o que mudou desde o Módulo 01 e por quê.

### 4.2 `modes/regimes.ts` — os três regimes declarados (passo 3)

**O que é?** A declaração, para cada regime, do **espaço de referência**, do que é **rastreado** e de **contra o que** a cena é registrada.

**O que faz?** Nada roda aqui: é uma lista de dados lida pela tabela de regimes, pela verificação de suporte e pela conferência da composição do fundo.

**Como faz?**
- `type RegimeId = 'inline' | 'immersive-vr' | 'immersive-ar'` — os nomes batem **de propósito** com os modos da API WebXR, então dá para perguntar ao navegador sem tradução.
- `type TratamentoDoMundo = 'substitui' | 'preserva' | 'exibe'`.
- `type ModoDeComposicao = 'opaque' | 'additive' | 'alpha-blend'` — como a imagem sintética se mistura ao mundo:
  - `opaque`: esconde o mundo (VR);
  - `additive`: **soma** luz à luz real (óculos transparentes) — preto vira invisível;
  - `alpha-blend`: mistura por transparência (celular, passthrough).
  Aqui ela é a composição **esperada**; a sonda compara com a que o aparelho informar.
- `interface Regime` com os **mesmos campos** para os três, incluindo `provaAdiante` (o que o regime ainda vai ter de provar).
- `REGIMES` — os três regimes da bateria:

| Regime | Trata o mundo | Espaço | Rastreia | Registrado contra |
|---|---|---|---|---|
| Janela (PC) | exibe | `viewer` | nada do corpo; a câmera obedece ao mouse | a origem da cena, que escolhemos no centro da plataforma, no chão |
| Visor (VR) | substitui | `local-floor` | a cabeça e os dois controles, com seis graus de liberdade | o chão físico onde a pessoa está; a plataforma nasce no nível do piso real |
| Celular (AR) | preserva | `local-floor` | a pose do celular e as superfícies que ele encontra | o chão real encontrado por teste de impacto, com uma âncora que mantém a plataforma no lugar enquanto a pessoa anda |

- **Os textos são os mesmos da seção 9 da especificação, letra por letra.** O passo 4 pede que a declaração do passo 3 entre na especificação "como está, sem reescrita". Mudou num, muda no outro.
- `descreverTratamento()` transforma o rótulo curto (`'exibe'`) na frase da especificação ("exibe a cena numa janela, sem tocar no mundo"), que é o que a tabela da página mostra.

**Que outra opção teríamos?** Descrever os regimes só pelo rótulo ("VR", "AR") ou com um booleano `imersivo`.

**Por que esta e não a outra?** Rótulo não vira código: "é realidade aumentada" não diz que espaço pedir nem o que fazer sem câmera (Cap. 1, seção 1.1). Um booleano tem dois valores e os regimes são três. Com os mesmos campos para os três, a conferência é mecânica: se dois regimes tiverem os mesmos valores, um deles não existe.

**Por que precisamos?** A declaração é uma **promessa** escrita antes de o regime existir. Nos próximos módulos cada regime vai ter de provar o que está aqui, e a sonda já confronta uma das promessas (a composição do fundo) com o aparelho real.

**Base no material:** Cap. 1, seções 1.2 e 1.4 (três tratamentos do mundo; composição do fundo como **resposta** do aparelho; os três degraus do espaço de referência: origem arbitrária → chão → superfície detectada).

**Por que o AR também usa `local-floor`:** a WebXR não tem um espaço "superfície". A origem fica no chão, e a superfície real chega por **teste de impacto** e **âncora**, sobre essa origem. Por isso o registro contra a superfície está descrito no campo `registroContra`, e não no espaço.

**Decisão do AR:** a bateria fica no chão real, em tamanho real (especificação, seção 4). A mesa em escala menor foi descartada porque o teste de atraso do som só faz sentido com as distâncias reais.

---

## 5. Módulo 02 — a sonda e o relatório

A ideia do módulo: **perguntar ao aparelho antes de assumir**. Se o código supuser que o aparelho tem algo que ele não declarou, nada quebra com erro — o ambiente só faz a coisa errada em silêncio (ex.: a plataforma aparece em lugar nenhum porque o celular negou o recurso de achar o chão).

### 5.1 `modes/verificacao.ts` — "este aparelho entra neste regime?"

**O que é?** A consulta mais grossa, feita **sem abrir sessão**.
**O que faz?** Para cada regime, pergunta se o aparelho consegue rodar aquele regime e devolve `sim`, `nao` ou `desconhecido`, com uma frase explicando.
**Como faz?**
- Visor e celular: `navigator.xr.isSessionSupported(modo)`. Se `navigator.xr` não existir → `desconhecido`. Se a pergunta der erro (alguns navegadores rejeitam em vez de responder `false`) → `desconhecido`.
- Janela: pergunta se o navegador entrega **WebGL 2** (cria um canvas solto, pede `webgl2` e devolve o contexto com `loseContext`). Só WebGL 2 conta porque a versão do Three.js do projeto não desenha mais com WebGL 1; aceitar WebGL 1 faria a tabela dizer "entra" enquanto a cena falha. *Por que não `isSessionSupported('inline')`?* O modo janela não abre sessão XR nenhuma, ele desenha com WebGL. Perguntando por `'inline'`, o iPhone (sem WebXR) respondia "sem resposta" para a janela enquanto a cena estava rodando na tela.
**Outra opção?** Deduzir pelo nome do aparelho/navegador ("é um Quest, então tem VR").
**Por que esta?** O nome é editável, imitado e envelhece a cada versão; o que vale é o que a plataforma **declara agora** (Cap. 2, seção 1.5).
**Por que três valores e não verdadeiro/falso?** Porque **"não sei" não é "não"**. O Safari do iPhone não tem WebXR: ele não está dizendo que o aparelho não serve, está dizendo que não sabe responder. Com um booleano, esse caso viraria "não suporta" em silêncio — um relatório confiante e errado.

### 5.2 `devices/recursos.ts` — concedido, negado ou sem resposta

**O que é?** O catálogo dos recursos opcionais que a bateria pede, e a classificação da resposta.
**O que faz?** Depois que a sessão abre, compara cada recurso pedido com a lista `session.enabledFeatures`:
- está na lista → **concedido**;
- a lista veio e o nome não está → **negado** (na tela aparece "não concedido (motivo não informado)", porque a lista não diz se o aparelho não tem, o navegador não implementa ou a pessoa recusou);
- a sessão nem mandou a lista → **indeterminado** ("sem resposta").

**Os recursos pedidos e por quê:**

| Recurso | Para que a bateria precisa |
|---|---|
| `local-floor` | origem no chão real: a plataforma nasce no piso |
| `bounded-floor` | limites da área livre: conferir se cabem os 2,5 m da seção 4 |
| `hit-test` | no celular, achar o chão onde pousar a plataforma |
| `anchors` | manter a plataforma presa ao chão enquanto a pessoa anda |
| `plane-detection` | saber se a plataforma redimensionada cabe |
| `hand-tracking` | baquetas sem controle — fora do escopo, só registro |

**Por que todos opcionais?** Se um fosse obrigatório e faltasse, o aparelho recusaria a sessão **inteira**, e a sonda perderia todo o resto.
**Por que cada item tem "para que serve"?** Recurso que ninguém justifica em uma frase entrou "por precaução", e é assim que listas crescem sem controle.
**O que ficou de fora:** `unbounded` (a bateria cabe numa sala) e `depth-sensing` (exige configuração própria; um pedido malformado derruba a sessão). Como `unbounded` não é pedido, a sonda também não tenta obter esse espaço: sem pedido ele nunca é concedido, e o "não" seria culpa do nosso código, não do aparelho.
**Por que precisamos?** O enunciado pede: "preserve a diferença entre recurso ausente e recurso negado". **Base:** Cap. 2, seção 1.6.

### 5.3 `devices/graus.ts` — 3 ou 6 graus de liberdade

**O que é?** A inferência de quantos graus o aparelho rastreia e a classificação do aparelho.
**Por que isso importa?** Com 3 graus o aparelho sabe para onde a cabeça **aponta**, mas não para onde ela **vai**: dar um passo não move a cena, o ouvido sente o movimento e os olhos não — daí o enjoo (Cap. 2, seção 1.1).
**Como faz?** A API **não tem** um campo "graus de liberdade". Mas cada pose tem `emulatedPosition`: verdadeiro quando a posição foi **calculada** por um modelo (não medida). Regra:
- nenhuma pose observada → `indeterminado`;
- pelo menos uma pose com posição **medida** → `seis`;
- todas emuladas → `tres`.

Classes de aparelho (`classificarAparelho` recebe um objeto `EvidenciaDoAparelho` com nomes, para ninguém trocar dois parâmetros de lugar):

| Classe | Quando |
|---|---|
| `sem-api` | não existe `navigator.xr` (iPhone, página sem HTTPS) |
| `inconclusivo` | tem WebXR, nenhum modo imersivo respondeu "sim" e alguma consulta ficou sem resposta |
| `somente-janela` | VR e AR responderam "não" (o PC) |
| `aparelho-de-mao-com-camera` | a sessão AR informou `interactionMode = 'screen-space'` |
| `aparelho-de-mao-provavel` | sem essa informação, AR sim e VR não. É hipótese, e o nome e a frase dizem isso: aceitar AR não prova o formato do aparelho |
| `visor-sem-posicao` / `visor-com-posicao` | o resto, pelos graus: `tres` ou `seis` |
| `imersivo-sem-leitura` | tem modo imersivo, mas a sessão não entregou pose nem forma de interação (por exemplo, foi recusada) |

*Por que o `interactionMode`?* Decidir só pelos modos ("AR sem VR é celular") dependeria de o celular responder "não" para VR, e há celulares que respondem "sim" (VR de papelão). O `interactionMode` é o próprio aparelho dizendo se é segurado na mão (`screen-space`) ou vestido (`world-space`).
*Por que duas classes "sem certeza"?* A classificação só afirma o que a evidência sustenta: sem essas classes, graus `indeterminado` cairia em "visor com posição", e consulta que falhou cairia em "só janela".
**Outra opção?** Inferir pelos espaços concedidos ("ganhou `local-floor`, logo tem 6 graus") — é o caminho que o livro mostra.
**Por que não?** A especificação WebXR obriga quem concede `local` a conceder também `local-floor`, **estimando** o chão. Até um visor que só gira ganha `local-floor`, e a regra pelos espaços diria "seis graus". O projeto do professor também usa `emulatedPosition`.
**Limite conhecido:** um visor de 6 graus que perdeu o rastreamento a janela inteira também entrega só poses emuladas. Por isso o relatório mostra as contagens ao lado da conclusão — é uma **leitura**, não um veredito.

### 5.4 `devices/estabilidade.ts` — quadros sem pose

**O que é?** Um contador de quantos quadros chegaram **sem** a pose de quem observa.
**Por que contar?** A WebXR **não avisa** "perdi o rastreamento". O único sinal é: o quadro chega e a pose não vem. Um quadro assim é normal; uma sequência é degradação (Cap. 2, seção 1.4).
**Como faz?** A cada quadro recebe `temPose` e `visivel`. Conta quadros, quadros sem pose, a maior sequência seguida sem pose e os quadros com a sessão escondida.
**Por que o `visivel`?** Quando a pessoa abre o menu do visor para ver a hora, a pose também para de vir — sintoma igual ao da perda. Sem separar, o contador acusaria o aparelho toda vez que alguém olha o relógio.
**Só os quadros visíveis contam:** o diagnóstico e a proporção são calculados sobre `quadros − quadrosOcultos`. Se todos vieram com a sessão oculta, a frase diz que não houve observação visível, em vez de "a pose veio em todos os quadros". Pelo mesmo motivo, a sonda só usa pose de quadro visível para ler os graus de liberdade.
**O limite de instável:** `LIMITE_DE_QUADROS_SEM_POSE = 10` (cerca de 0,14 s a 72 Hz). Acima disso, o diagnóstico diz que o rastreamento esteve instável; é o mesmo número da seção 11 da especificação, e é provisório. Os números vão na frase dos dois jeitos, para quem lê poder discordar da conclusão.
**Por que o contador só conta e outra função interpreta?** "Medidor que interpreta ao medir sempre concorda com quem o escreveu." E a frase de diagnóstico **não escolhe** entre as três causas (parede lisa, pouca luz, movimento brusco): pela contagem não dá para saber, e escolher seria inventar.

### 5.5 `devices/sonda.ts` — a sonda de capacidades (passo 5)

**O que é?** A peça que pergunta ao aparelho o que ele oferece e guarda tudo em `ResultadoDaSonda`.
**O que faz, passo a passo:**
1. `sondarSemSessao()` — regimes suportados + se a página está em HTTPS. Recebe as linhas que a página já consultou ao carregar, para o pedido de sessão sair logo depois do clique (o navegador só aceita o clique como gesto por alguns segundos).
2. `modoPreferido()` — escolhe o modo da sessão: **AR antes de VR**, porque AR responde mais coisas (câmera, superfícies).
3. `sondarEmSessao()`:
   - abre a sessão com `requestSession(modo, { optionalFeatures: [...] })`;
   - cria uma **camada mínima** (`XRWebGLLayer`) — a sessão só entrega quadros se tiver onde desenhar; não desenhamos nada nela;
   - lê `enabledFeatures`, tenta cada espaço de referência (rejeição = "não concedido", e isso **é** a resposta);
   - observa **90 quadros** (~1 s) com o `requestAnimationFrame` **da sessão**, contando pose ausente e posição emulada;
   - a pose ausente chega como **`null`** (é o que a especificação WebXR diz; os tipos do `@types/webxr` dizem `undefined`, e por isso o teste confere os dois). Testando só `undefined`, o primeiro quadro sem rastreamento quebraria a sonda;
   - a cada quadro anota as fontes de entrada presentes (lado, tipo de mira, se tem pose própria, se tem mão articulada), guardadas num `Map`. `gripSpace` e `hand` são testados com `!= null`, porque a especificação entrega `null` quando a fonte não tem aquele espaço (toque e olhar não têm punho); testando só `undefined`, o relatório diria "tem pose própria" para o toque na tela: uma fonte que apareceu e sumiu no meio (o toque na tela, por exemplo) continua no relatório;
   - lê `interactionMode` (na mão ou vestido);
   - **a sonda sempre termina.** A observação tem três saídas além do fim normal: o evento `end` (a pessoa saiu da sessão), um tempo limite de 10 s (a sessão continua aberta mas os quadros pararam) e o `try/catch` dentro do quadro (um erro ali sumiria no console e a sonda ficaria parada). Nas duas primeiras, devolve o que já tinha observado com o motivo em `interrupcao`;
   - **fecha a sessão no `finally`**, mesmo se algo falhar — sessão esquecida aberta prende o visor numa tela vazia. Só chama `end()` se a sessão ainda não terminou (chamar numa sessão encerrada lança erro e esconderia o motivo real) e depois libera o contexto WebGL da camada mínima.
4. `conferirComposicao()` — compara a composição **declarada** em `regimes.ts` com a que a sessão informou. Se diferir, "a declaração estava errada — quem tem razão é o aparelho".
5. `sondar()` junta tudo. Só um erro do `requestSession` é tratado como **recusa** (ele chega embrulhado na classe `RecusaDeSessao`); um erro depois de a sessão abrir, como o `InvalidStateError` de uma sessão que acabou, vira "a sessão terminou antes de a sonda terminar de ler", e não "já existe uma sessão aberta". Se a sessão terminar antes de a observação começar, `observarQuadros` percebe na hora, em vez de esperar os 10 s. **Uma recusa de sessão vira resultado, não exceção:** volta com `emSessao` vazio e o motivo em `motivoSemSessao` (a frase vem de `devices/recusa.ts`). Assim a tabela de regimes e o "Copiar dados" continuam com o que já tinha sido descoberto. Quando não há modo para sondar, o motivo diz qual dos três casos foi: sem WebXR, consulta sem resposta (não prova ausência) ou as duas consultas disseram "não".

### 5.5.1 `devices/recusa.ts` — o que significa cada recusa
**O que é?** A tradução das recusas de `requestSession` em frases: `NotSupportedError` (o aparelho não suporta o modo), `SecurityError` (faltou o clique ou falta HTTPS), `InvalidStateError` (já existe sessão aberta) e `NotAllowedError` (a pessoa recusou a permissão, no celular a câmera).
**Por que um arquivo próprio?** A sonda precisa da frase para guardá-la no resultado, e o diário também. Se a tradução morasse no diário (camada de apresentação), a sonda teria de importar o relatório, e a separação "a sonda descobre, o relatório mostra" se perderia.

**Outra opção?** Perguntar tudo **de fora** da sessão, ao carregar a página.
**Por que não?** Metade das respostas só existe dentro da sessão (recursos, espaços, controles, composição). E o navegador **só abre sessão imersiva a partir de um clique** — por isso a sonda é chamada pelo botão.
**Por que precisamos?** Enunciado: "pronto quando a consulta é feita de verdade contra o aparelho, não simulada nem presumida".
**Por que a camada mínima não usa o renderer do Three.js?** Para a sonda ser **independente da cena**: funciona mesmo se a cena falhar.
**Base:** Cap. 2, seções 1.5 a 1.7.

### 5.6 `relatorio/relatorio.ts` e `relatorio/diario.ts` — o relatório visível (passo 6)

**`relatorio.ts` — o que faz?** Escreve na página: o domínio (tarefa, estado final, contagem, conferência, tabela de peças), a tabela de regimes (o que **declaramos** × o que o aparelho **respondeu**, na mesma linha) e o resultado da sonda.
- **Por que HTML comum e não dentro da cena?** As tabelas são largas; dentro da cena ficariam ilegíveis. O que muda a cada quadro vai para o painel **dentro** da cena; o que é fixo fica na página.
- **Por que ele não sabe nada de sessão?** Só **apresenta**. Isso permite trocá-lo inteiro sem tocar na sonda.
- **Por que mostra "nenhuma inconsistência" em vez de nada?** Linha vazia seria ambígua: não houve problema, ou ninguém conferiu?
- **O que a seção da sonda mostra além das tabelas:** em que modo a sessão abriu e, se o aparelho aceita os dois, que o outro não foi aberto; se a observação foi interrompida e por quê; a forma de interação; e um aviso quando nem o modo janela desenha (navegador sem WebGL).

**`diario.ts` — o que é?** A lista de mensagens (nota, alerta, falha) na própria página.
- **Por que não só `console.log`?** Dentro do visor **não existe console**. Para quem está com o aparelho no rosto, erro no console é igual a programa que não fez nada (Cap. 2, seção 1.7.1). O console recebe uma cópia, útil com depuração remota.
- **Por que acumula antes de ter onde escrever?** Uma falha pode acontecer antes de o elemento da página existir; mensagem perdida é justamente a que mais fazia falta.
- **`explicarFalha(erro, inicio)`:** usa as frases de `devices/recusa.ts` para as recusas conhecidas e, para o resto, escreve "`inicio`: mensagem do erro". O `inicio` diz qual parte parou ("A sondagem parou", "A cena não pôde ser montada"). Sem isso, "o aparelho disse não" parece "o código quebrou".

**Pronto quando:** "o mesmo endereço, aberto em aparelhos de classes diferentes, produz relatórios diferentes e legíveis". Com o nosso código, PC ("não entra"), iPhone ("sem resposta") e emulador (sessão aberta, recursos concedidos) já dão três relatórios diferentes.

---

## 6. Módulo 03 — cena, troca de pai, relógio e orçamento

A propriedade comum aos três passos deste módulo: **nenhum deles aparece na imagem parada**. Uma cena montada como lista de coordenadas produz a mesma tela que uma montada como árvore. A diferença só aparece quando algo se move — por isso a demonstração é feita com botões que movem coisas e com números no diário.

### 6.1 `core/palco.ts` — renderer, câmera e tamanho

**O que é?** O "palco": o `WebGLRenderer` (quem desenha no canvas), a câmera e a órbita com o mouse.
**O que faz / como faz?**
- `DENSIDADE_MAXIMA = 2`: limita os pixels físicos por pixel de tela. Telas densas pedem 3×, e o custo cresce com a **área** (3× custa 2,25 vezes mais que 2×) por um ganho que quase não se vê. O PC do laboratório tem vídeo integrado.
- Câmera a **2,3 m de altura e 3,6 m à frente**, olhando a plataforma: um pouco acima e atrás de quem chega de pé, para caber a plataforma e o anel de peças inteiro.
- `OrbitControls`: arrastar gira, rodinha aproxima. Sem amortecimento, a câmera só muda quando alguém arrasta.
- `ajustar()` roda **a cada quadro** e confere se o canvas mudou de tamanho.
- **A armadilha da densidade:** o Three.js guarda a densidade (`setPixelRatio`) e, no `setSize`, recebe o tamanho em pixels de **tela** (CSS) e multiplica sozinho. Por isso a comparação usa pixels físicos (CSS × densidade, que é o que `canvas.width` guarda) e o `setSize` recebe o tamanho CSS. Passando o valor já multiplicado, a densidade entra duas vezes: numa tela de densidade 2 o buffer sairia com 4 vezes os pixels previstos (4096 em vez de 2048 de largura), e como nunca bateria com a comparação, o `setSize` rodaria **em todo quadro**. Num monitor comum (densidade 1) nada disso aparece; aparece no notebook e no celular de outra pessoa.
- `setPixelRatio` é chamado dentro do `ajustar()` porque a densidade muda quando a janela vai para outro monitor.
- Dentro de uma sessão imersiva (`renderer.xr.isPresenting`) o `ajustar()` não faz nada: quem decide o tamanho é o aparelho, e o Three.js recusaria o `setSize`.
**Outra opção?** (a) Câmera fixa, como o professor. (b) Ajustar o tamanho só no evento `resize` da janela.
**Por que esta?** (a) A nossa especificação promete câmera orbital no regime de janela (seção 9), e a cena é espalhada; o professor fixa para o movimento da câmera não se confundir com o da hierarquia. (b) O evento cobre um caso só; o canvas muda também por CSS, com o celular girado e ao sair da sessão imersiva (que não dispara evento). Comparar dois números por quadro é mais barato.
**Por que precisamos?** Sem ele não há imagem, e o que ele decide (densidade, tamanho) pesa direto no orçamento.

### 6.2 `core/cena.ts` — a cena como árvore (passo 7)

**O que é?** A construção da cena: luzes, chão, plataforma e as 15 peças, organizadas como **árvore de nós** (grafo de cena).

**O conceito, para leigo:** cada objeto guarda sua posição **em relação ao pai**, não ao mundo. Exemplo: "o prato está 80 cm acima da base da haste". A posição **no mundo** é calculada juntando (multiplicando) as posições de todos os objetos no caminho até a raiz. Por isso, se o pai se move, o filho vai junto sem ninguém recalcular nada.

**A árvore montada:**

```
sala
├── luz-ambiente, luz-direcional
├── chao                      ← peças SOLTAS (estado inicial da tarefa)
│   ├── bumbo, caixa, toms, pratos, estantes, banco, pedais, baquetas
│   └── chimbal               (tripé e tubo fixo moram aqui)
│       └── chimbal-haste     ← sobe e desce (70–90 cm), deslizando dentro do tubo
│           ├── chimbal-prato-de-baixo
│           └── chimbal-prato-de-cima
└── plataforma                ← peças FIXADAS viram filhas daqui
    ├── piso-da-plataforma    ← a única malha que muda de tamanho
    └── suporte-do-painel
        └── painel
```

**Regra de parentesco:** um objeto é filho de outro quando **mover o outro tem de mover este junto** (Cap. 3, seção 1.1.2). Não é proximidade nem ordem de criação. Os parentescos com razão de projeto:
- **plataforma → peças fixadas:** arrastar a plataforma leva o kit montado;
- **chimbal-haste → pratos:** regular a altura do chimbal sobe os dois pratos (é assim na bateria de verdade);
- **plataforma → painel:** o painel é um cartaz preso à plataforma.

**Detalhes, com o porquê de cada um:**
- **Peças nascem soltas no chão**, em anel de 1,5 m em volta da plataforma. *Outra opção:* nascer já montadas. *Por que não:* "nascer no destino apagaria justamente a operação que o módulo existe para ensinar" (Cap. 3).
- **Origem de cada peça na base** (`cilindroDeBase`): o cilindro do Three.js nasce centrado; subimos metade da altura para a origem ficar onde a peça toca o apoio. Assim, pousar uma peça é só dar a altura do apoio (convenção da cena, Cap. 5).
- **A plataforma é um `Group` com escala sempre 1**, e o tamanho ajustável fica na malha do **piso**, que não tem filhos. *Outra opção:* escalar o grupo da plataforma. *Por que não:* escala no pai vale para todos os filhos — um bumbo fixado numa plataforma de 2,5 m ficaria 1,67 vez mais largo, e como a escala seria só em X e Z, um filho girado sairia **torto**. É um caso de fronteira da **nossa** cena (o professor não tem peça redimensionável).
- **`suporte-do-painel` é um nó vazio** (`Object3D`, sem forma). "Um nó sem geometria é legítimo: existe para dar aos filhos um sistema de coordenadas comum" (Cap. 3). Ele marca o meio da **borda direita** da plataforma. *Por que não a de trás:* o chimbal nasce atrás da plataforma, no eixo da câmera, e o cartaz no tamanho que se lê esconderia justamente os pratos que mostram a animação.
- **Cinco materiais compartilhados e crus**: `materialCru(cor)` cria todos com os mesmos parâmetros (rugosidade 0,7, metálico 0,1), só a cor muda. *Por que crus:* o Módulo 03 pede "nenhum material trabalhado"; brilho e rugosidade diferentes para metal, madeira e casco já seriam material trabalhado. É a mesma fábrica do projeto do professor. *Por que compartilhados:* cada material é um programa para a placa de vídeo, e trocar de material custa uma troca de estado — duas instâncias iguais contam como duas (Cap. 4). `MeshStandardMaterial` porque, sem luz, um cilindro vira um retângulo chapado e não se vê forma nem escala.
- **O chimbal tem exatamente os 80 cm do inventário:** o topo do prato de cima fica na altura do domínio, o prato de baixo 2 cm abaixo (`ABERTURA_DO_CHIMBAL_M`, pedal solto) e a haste desliza dentro de um **tubo fixo** preso ao tripé (0 a 45 cm; a haste começa em 30 cm). Assim a haste nunca descola do tripé em todo o curso de 70 a 90 cm. A abertura é exportada porque a animação do `main.ts` usa o mesmo número para o prato descer até encostar no de baixo, nunca além.
- **Duas luzes e nenhuma a mais**: cada luz custa em todo material. A hemisférica dá o entorno (sem ela, metal fica escuro por não ter o que refletir — Cap. 4); a direcional dá volume.
- **Formas cruas** (cilindros, caixas): modelagem é o Módulo 04. "Objeto certo no lugar certo antes de objeto vistoso."
- `redimensionarPlataforma()` limita a 1,0–2,5 m e move o painel para a nova borda direita; `ajustarAlturaDoChimbal()` limita à faixa do domínio (70–90 cm, lida do campo `ajuste` do chimbal) e move só a haste.

**Por que precisamos?** Passo 7, e é a base da montagem: fixar uma peça = trocá-la de pai.

### 6.3 `core/hierarquia.ts` — trocar de pai sem sair do lugar (passo 8)

**O que é?** A operação `reparentar(filho, novoPai)`: muda de quem o objeto é filho mantendo sua posição, rotação e escala **no mundo**.

**O problema que ela resolve:** se só trocássemos o pai mantendo os números antigos, o objeto **pularia** — aqueles números eram distâncias até o pai antigo e passariam a ser lidos como distâncias até o novo.

**A conta:**

```
posição no mundo:   M_mundo = M_pai · M_local
ao trocar de pai:   M_local_novo = (M_pai_novo)⁻¹ · M_mundo
```

Em palavras: a **inversa** da matriz do pai novo responde "que coordenadas, no sistema do pai novo, apontam para o mesmo lugar do mundo?". A multiplicação de matrizes se lê **da direita para a esquerda** (Cap. 3, seção 1.2).

**Como faz, passo a passo:**
1. Recusa **ciclo**: se o pai novo estiver dentro do filho, a árvore quebraria.
2. **Atualiza as matrizes** do filho e do pai novo (`updateWorldMatrix`). O Three.js só recalcula as posições no mundo ao desenhar; se alguém mexeu neste quadro, a matriz estaria velha e a peça pularia.
3. Recusa pai com **escala zero**, pelo **determinante** da matriz (o produto das três escalas). *Por que não pela escala lida com `decompose`:* para uma matriz sem inversa o Three.js devolve escala 1, e o teste deixaria passar justamente esse caso.
4. Recusa pai com **escala não uniforme** (o filho sairia deformado).
5. Guarda a posição e a orientação no mundo **antes**.
6. Calcula `M_local_novo = (M_pai_novo)⁻¹ · M_mundo`, muda o pai (`novoPai.add(filho)`) e decompõe a matriz em posição, rotação e escala.
7. Mede **depois** e devolve `{ antes, depois, desvio, desvioAngularGraus }`. O desvio angular pega o erro que só a posição não pegaria: com a plataforma girada, uma conta errada pode deixar a peça no lugar, mas virada. O ângulo é medido com `atan2`, e não com o `angleTo` do Three.js (que usa `acos` e, perto de zero, transforma ruído do ponto flutuante em um milionésimo de grau que não existe).

As mensagens de erro usam `nomeDe(no)`: nó sem nome aparece como "(Group sem nome)", e não como aspas vazias.

**O desvio:** o ideal é zero; o real fica no ruído do ponto flutuante (0 a ~1e-16 m). O valor da medida está em distinguir esse caso do outro: desvio de **milímetros** = alguma matriz estava vencida. Acima de 1 mm é um salto que alguém sentiria na mão.

**Que outra opção teríamos?** Deixar o bumbo filho do chão e, **a cada quadro**, copiar a posição da plataforma para ele.
**Por que não?** Dá a mesma imagem hoje, mas quebra em quatro momentos (Cap. 3, seção 1.3):
1. quando a plataforma **girar**, somar posição não basta (é preciso compor rotações);
2. quando algo **acima** da plataforma se mover, a soma foi escrita para um nível só;
3. para **soltar**, não existe operação inversa — nunca houve operação;
4. se outro passo entrar antes da cópia no laço, o bumbo segue a plataforma com **um quadro de atraso** (tremor).

**Por que escrever à mão se o Three.js tem `attach()`?** O `attach()` faz a mesma conta, mas não devolve os números (o passo 8 pede conferir "em números, não a olho") e não recusa os casos de fronteira.

**Outras funções do arquivo:** `posicaoNoMundo()` (atualiza antes de ler, senão devolve o valor atrasado), `emMetros()` (3 casas = milímetro) e `descreverArvore()` (a árvore em texto, um nível por recuo — o teste do professor de "ler a árvore em voz alta e procurar frase sem sentido").

### 6.4 `core/relogio.ts` — a cena anda pelo tempo (passo 9)

**O que é?** O relógio: a cada quadro diz quanto tempo passou (`delta`, em segundos) e o tempo total da cena (`decorrido`).
**Como faz?** Guarda o instante do quadro anterior e subtrai.
- **Primeiro quadro: delta = 0.** Inventar "1/60 s" faria a cena nascer andando — um solavanco na primeira imagem.
- **Teto de salto: 0,1 s.** Com a aba escondida o navegador para de pedir quadros; ao voltar, o intervalo pode ser de 8 s. Aplicar tudo de uma vez faria a cena dar um pulo (no visor, um solavanco físico). Acima de 0,1 s, o resto é descartado — e o relógio **avisa** (`saltoDescartado`), em vez de cortar em silêncio.
- `reiniciar()`: ao parar e voltar o laço, o primeiro quadro de volta não mede o tempo parado.
**Outra opção?** (a) Somar um valor fixo por quadro. (b) O `THREE.Clock`.
**Por que esta?** (a) Por quadro, a velocidade vira propriedade da máquina: o chimbal abriria 60 vezes por minuto num monitor de 60 Hz e 144 num de 144 Hz. O problema "aparece primeiro no aparelho de outra pessoa". (b) O `Clock` não limita salto nem avisa.
**Conferência:** cronometrar 10 ciclos do chimbal em duas máquinas diferentes — tem que dar 10 s nas duas.
**O limite dessa escolha:** abaixo de 10 quadros por segundo todo intervalo passa de 0,1 s e é cortado, e a cena anda mais devagar que o relógio de parede (conferido: em 10 s, 12 Hz dá 10,000 s de cena; 8 Hz dá 8 s). Então "igual em máquinas diferentes" vale acima de 10 quadros por segundo, e a especificação diz isso (seção 10). O corte não é silencioso: o laço passa `saltoDescartado` para o orçamento, que conta esses quadros.

### 6.5 `core/laco.ts` — o laço de renderização (passo 9)

**O que é?** A função que roda **uma vez por quadro** e redesenha a cena.
**A ordem dentro do quadro (e por que não é livre):**
1. **ajustar** o tamanho do desenho;
2. **medir o tempo** (relógio);
3. **avançar a cena** (rodar os "passos": animação, painel...);
4. **desenhar**;
5. **medir o custo** do quadro que acabou de sair.

- Desenhar antes de avançar mostraria sempre o quadro anterior: **um quadro de atraso**, que no visor soma à latência do aparelho.
- O custo é medido **depois** de desenhar porque o Three.js zera as contagens de desenho no começo de cada render; lendo antes, leríamos o quadro anterior.

**Quem pede o quadro:** `renderer.setAnimationLoop()`. *Outra opção:* `window.requestAnimationFrame`. *Por que não:* dentro da sessão imersiva o da janela **não é chamado** — quem entrega quadros é a sessão —, e a cena congelaria no visor sem erro nenhum. O `setAnimationLoop` troca de fonte sozinho.
**`aoPasso()`:** acrescenta comportamento ao quadro **sem editar o laço**.

### 6.6 `core/orcamento.ts` — o teto do quadro (passo 9)

**O que é?** Um **teto** de tempo por quadro, declarado **antes** de a cena ter conteúdo pesado, e a medida dos últimos 120 quadros contra ele.
**O conceito de "envelope":** um visor a 72 imagens por segundo tem 1000/72 = **13,9 ms** entre imagens. O trabalho que não couber **não sai atrasado — não sai**, e a imagem anterior aparece de novo. A queda é em degraus: 15 ms num aparelho de 13,9 ms não fica "um pouco mais lento", fica com metade das imagens (Cap. 3, seção 1.5).
**Os números:** `TETO_JANELA_MS = 16,7` (monitor de 60 Hz), `TETO_VISOR_MS = 13,9` (72 Hz, meta da nossa especificação), **`TETO_ADOTADO_MS` = o do visor**, mesmo no PC.
**Por que o do visor?** A mesma cena abre nos dois. Se coubesse só nos 16,7 ms do PC, estouraria no visor, e lá estourar dá **enjoo**. O preço: a versão de PC fica mais modesta do que a máquina aguentaria.
**Custo × intervalo:** **custo** = tempo do **nosso** trabalho por quadro (CPU); **intervalo** = tempo real entre duas imagens (inclui placa, navegador e tela). Custo baixo com intervalo alto = gargalo fora do programa.
**Como guarda:** dois `Float64Array` de 120 posições usados como **fila circular** — a medida nova entra por cima da mais antiga. *Outra opção:* média da sessão inteira. *Por que não:* diluiria um engasgo de 1 s em minutos de quadros bons, e ele sumiria do número enquanto o corpo sentiu inteiro.
**Aquecimento:** os 5 primeiros quadros ficam fora da medição. No primeiro, a placa compila os materiais (dezenas de milissegundos, uma vez só); dentro da janela de 120 quadros esse pico ocuparia o "pior custo" por 2 segundos. Um material novo que aparece depois (a linha amarela) também compila, e esse pico fica na medição de propósito: é engasgo que a pessoa sente.
**Saltos cortados:** o orçamento conta os quadros em que o relógio cortou o intervalo (`quadrosComSaltoCortado`), e a folha de medição mostra.
**`linhasDoOrcamento()`:** o texto completo da folha de medição. **`linhasDoPainel()`:** a versão curta para o painel (teto, custo médio, pior custo, acima do teto), para a letra caber grande. Antes do primeiro quadro as duas dizem "Ainda sem quadros medidos" em vez de zeros — zero pareceria medição.
**Limite:** o custo medido é de CPU; o tempo da placa de vídeo não entra.

### 6.7 `ui/painel.ts` — o indicador de custo dentro da cena (passo 9)

**O que é?** Um cartaz 3D (haste + retângulo) preso à plataforma, que mostra o orçamento e o tempo da cena.
**Como faz?** Desenha o texto num `<canvas>` 2D escondido e usa esse canvas como **textura** (`CanvasTexture`) de um plano. Material `MeshBasicMaterial` (não recebe luz — painel que escurece quando a luz muda deixa de ser instrumento de leitura).
**Redesenha no máximo 4 vezes por segundo, e só se o texto mudou:** escrever texto numa textura e enviá-la à placa está entre as operações mais caras do quadro — um painel que estourasse o orçamento enquanto mede o orçamento mediria a si mesmo; e número que muda 60 vezes por segundo não se lê.
**Tamanho:** 1,2 × 0,7 m, com letra de 76 px numa textura de 1200 × 700 e no máximo cinco linhas. *Por que não menor:* com 60 × 34 cm ele apareceria com uns 80 pixels de largura na câmera inicial e não se leria. A textura usa `colorSpace = SRGBColorSpace` (sem isso o texto sai lavado) e, se o tempo da cena voltar para trás (relógio reiniciado), a marca do último desenho volta junto, senão o painel congelaria.
**Outra opção?** Texto HTML sobreposto ao canvas (um "HUD" no canto da tela).
**Por que esta?** No visor **não existe canto da tela**: texto grudado na visão fica a centímetros dos olhos, sempre presente, e incomoda em minutos. Preso à plataforma, é um objeto do mundo (**diegético**): quem quer ler olha para ele, e aproximar aumenta o texto (Cap. 3, seção 1.6.2).

### 6.8 `ui/ligacao.ts` — mostrar na cena que o bumbo está preso à plataforma

**O que é?** Um marcador visual de parentesco: uma **linha amarela** do centro da plataforma até a peça fixada e um **anel amarelo** no chão em volta dela.
**O que faz?** Liga ao fixar, desliga ao soltar. A linha é **filha da plataforma** e o anel é **filho do bumbo**, então os dois acompanham qualquer movimento sem código de sincronização (a própria árvore faz isso).
**Como faz?** O ponto final da linha é a posição **local** do bumbo — que, depois da troca de pai, já está no sistema de coordenadas da plataforma. Por isso basta copiar `bumbo.position`, e isso continua certo com a plataforma girada.
**Memória:** cada `ligar` cria um anel novo (o raio muda com a peça). `descartarAnel()` tira o anel da árvore **e** chama `geometry.dispose()`, porque tirar da árvore não libera a memória da placa de vídeo.
**Outra opção?** (a) Não mostrar nada. (b) Mudar a cor do bumbo.
**Por que esta?** (a) A troca de pai é **invisível por natureza** ("posse não é posição", Cap. 3): na demonstração parecia "o botão não fez nada". O professor resolve com um eixo girando (a peça presa passa a orbitar); a nossa cena não tem nada girando, então **desenhamos a posse**. (b) O bumbo divide o material "casco" com os toms e a caixa (materiais compartilhados, Cap. 4); mudar a cor mudaria todos.
**Por que precisamos?** Para o item 3 da demonstração ser **visto**. E a linha deixa claro que reparentar **não é encaixar**: o bumbo continua onde estava, fora da plataforma, e mesmo assim pertence a ela.

**Também para a demonstração:** a última mensagem do diário aparece **logo abaixo dos botões** (`#ultima-acao`), para o resultado de cada clique ficar visível sem rolar a página. E o anel de peças começa a 90° (lado direito), para o bumbo — a primeira peça — nascer inteiro na tela, e não cortado na frente da câmera.

---

## 7. Ferramentas extras: medição e compartilhar

### 7.1 `relatorio/medicao.ts` — o número junto com a máquina

**O que é?** A "folha de medição" (botão **"Registrar a medição agora"**): data, navegador, placa de vídeo, tela e as linhas do orçamento.
**Por que a folha abre pela máquina?** "Nenhum número viaja sozinho" (Cap. 5, seção 1.6): a mesma cena dá números diferentes em máquinas diferentes, e as decisões tiradas de cada um são opostas. O contexto vem antes do número.
**Nome da placa:** pedido pela extensão WebGL `WEBGL_debug_renderer_info`. Muitos navegadores a bloqueiam por privacidade; então escrevemos "placa não identificada" — **nunca** um nome inventado, que faria a medição parecer reproduzível sem ser.
**Por que a tela entra:** o custo de desenhar cresce com a área em pixels.
**Sem cena:** `identificarPlaca` aceita renderer vazio e responde "a cena não pôde ser montada neste navegador", para a exportação da sonda continuar funcionando.

### 7.2 `relatorio/exportacao.ts` — copiar ou salvar para compartilhar

**O que é?** A função de compartilhar as medições para o grupo juntar e comparar.
**Como se usa:** preencher **"Informe um nome da máquina"** (obrigatório — os botões só ligam depois disso) e clicar em:
- **"Copiar para a área de transferência"** → cola-se no WhatsApp, Discord, Docs, GitHub, planilha;
- **"Salvar arquivo na máquina"** → baixa `medicao_AAAA-MM-DD_HHMM_nome-da-maquina.txt` (guardar em `docs/medicoes/`).

**O que vai no texto:** um **resumo legível** (máquina, números do quadro, quadros com salto cortado, resultado da sonda se ela já rodou, com a forma de interação e se a observação foi completa) + uma **linha CSV com cabeçalho fixo** (inclui `quadros_com_salto_cortado`), para quem estiver juntando os dados de todos numa planilha.
**Por que o nome da máquina é obrigatório?** O navegador muitas vezes esconde a placa; sem nome, duas medições de máquinas diferentes ficam indistinguíveis.
**Por que texto simples e não Markdown com negrito/tabela?** Cola bem em qualquer lugar (negrito com `**` aparece com asteriscos no WhatsApp).
**Por que o cabeçalho do CSV é fixo?** Linhas de máquinas diferentes só se empilham numa planilha com as mesmas colunas na mesma ordem.
**Como copia:** `navigator.clipboard.writeText` (exige HTTPS e clique — temos os dois). Se falhar, tenta o método antigo (`textarea` + `execCommand('copy')`); se nada funcionar, o texto aparece na página para copiar à mão.
**Como salva:** `Blob` + `URL.createObjectURL` + link com `download` — o jeito padrão de gerar arquivo no navegador sem servidor.
**Outras opções que existiam:** só copiar à mão (depende de alguém lembrar), guardar no navegador (`localStorage`, preso àquela máquina) ou mandar para um servidor (infraestrutura nova, fora do escopo).

---

## 8. O ponto de entrada: `main.ts`

**O que é?** O arquivo que o `index.html` carrega. **Não tem lógica própria**: cria os módulos, liga uns aos outros e liga os botões.

**Ordem do que acontece:**
1. **Diário primeiro** — tudo o que acontecer depois tem onde ser escrito.
2. **Avisos iniciais:** se a página não está em HTTPS; se o domínio tem inconsistências.
3. **Consulta dos regimes** ao carregar; a promessa fica guardada para o botão Sondar reaproveitar.
4. **Cena, dentro de um `try`** (`montarDemonstracao`): `montarPalco` → `montarCena(BATERIA)` (a cena nasce **do domínio**) → `Relogio` → `Orcamento(TETO_ADOTADO_MS)` (teto antes do conteúdo) → `montarLaco` → painel pendurado no `suporteDoPainel`. *Por que o `try`:* sem WebGL o renderer lança erro na criação, e sem proteção o arquivo parava ali, sem sonda e sem relatório. Com ele, a falha vai para o diário, os botões da cena são desligados e o resto funciona.
5. **Botões da demonstração:**

| Botão | O que mostra | Passo |
|---|---|---|
| Fixar o bumbo na plataforma / Soltar | troca de pai com posição antes, depois e os desvios de posição e de orientação | 8 |
| Girar a plataforma 30° | o bumbo fixado gira junto em volta do centro da plataforma; a caixa solta fica parada. Girar **antes** de fixar faz o desvio zero provar também a composição de rotação | 7 e 8 |
| Mover a plataforma 40 cm | o bumbo fixado acompanha; a caixa solta fica parada | 7 |
| Redimensionar a plataforma | caso de fronteira: o bumbo continua com escala 1,000 | 7 e 8 |
| Subir o chimbal | a haste sobe e os pratos (filhos) vão junto | 7 |
| Registrar a medição agora | folha de medição com a máquina | 9 |
| Copiar / Salvar (após o nome da máquina) | compartilhar máquina + medição + sonda | 9 |
| Sondar este aparelho | a sonda completa (o botão fica desligado enquanto ela roda) | 5 e 6 |

6. **Animação contra o relógio:** o prato de cima do chimbal desce 2 cm até encostar no de baixo e volta, **uma vez por segundo**, como se o pedal fosse pisado. É calculado a partir de `decorrido` (segundos) com `(1 − cos)/2`: começa aberto no primeiro quadro, sem salto. É um movimento do **nosso domínio** (o professor gira um eixo porque a cena dele é um mecanismo). O painel recebe `linhasDoPainel` e o tempo da cena.
7. `laco.iniciar()` — a cena sobe assim que a página carrega (o regime de janela não precisa de clique).
8. **Copiar e salvar** funcionam mesmo sem cena (a medição sai como "ainda sem quadros").
9. **Sonda:** a completa espera o botão (o navegador exige gesto) e usa a consulta feita ao carregar. O diário diz qual dos três desfechos aconteceu: sem sessão (com o motivo), sessão pela metade (com o motivo) ou sessão completa. O resultado é guardado para copiar e salvar levarem junto.

**Por que o `main.ts` só junta?** Cada módulo ignora os outros; é o que permite trocar um sem mexer nos demais — a decisão de arquitetura declarada (Cap. 3, seção 1.6).

---

## 9. Onde a nossa cena difere do projeto do professor

O professor pede: "tome uma decisão do projeto dele e diga em que ponto ela não serve para a sua cena, e o que o seu grupo fez no lugar". As respostas:

| Tema | Projeto do professor (Bancada) | Nosso projeto (Bateria) | Por quê |
|---|---|---|---|
| Domínio | peça → **socket** (encaixe certo) | peça → **papel** (fixa e soa / fixa / acompanha a mão) | a montagem da bateria é livre; o estado final depende do papel |
| Tamanho | nada é redimensionável | a escala fica só na **malha do piso**; o nó da plataforma tem escala 1 | escalar o nó esticaria (e entortaria) tudo o que está fixado |
| Teto do visor | 90 Hz = 11,1 ms | **72 Hz = 13,9 ms** | meta declarada na nossa especificação (taxa padrão do Quest) |
| O que se compara com o teto | o **intervalo** (teto do PC no demo) | o **custo** (teto do visor) | num monitor de 60 Hz o intervalo nunca desce de 16,7 ms; comparar com 13,9 daria "100% acima" para sempre |
| Câmera | fixa | **órbita com o mouse** | prometida na seção 9 da nossa especificação; cena espalhada |
| Animação contra o relógio | eixo girando | **chimbal abrindo e fechando** | movimento do nosso domínio |
| Parentesco interno | peças soltas; eixo gira | **haste do chimbal → pratos** | regular a altura do chimbal sobe os pratos na bateria real |
| Graus de liberdade | `emulatedPosition` | também `emulatedPosition`, com a alternativa pelos espaços de referência explicada e descartada | a alternativa descartada, com a razão, fica documentada no código |
| Compartilhar medição | copiar da página | **copiar ou salvar**, com nome da máquina obrigatório | juntar medições do grupo; número nunca sem máquina |
| Tamanho do buffer | `setSize` recebe o tamanho já multiplicado pela densidade | `setSize` recebe o tamanho CSS; só a comparação usa pixels físicos | o Three.js já multiplica pela densidade; multiplicar antes dava 4 vezes os pixels em tela de densidade 2 e um `setSize` por quadro |
| Sonda | pose ausente testada só como `undefined`; observação sem saída se a sessão acabar | testa `null` e `undefined`; sai pelo fim da sessão, por tempo limite ou por erro no quadro | a especificação WebXR devolve `null`; uma sonda que espera para sempre é falha silenciosa |
| Painel | preso à bancada | preso à **borda direita** da plataforma, 1,2 × 0,7 m | na borda de trás ele esconderia o chimbal, e menor ele não se leria da câmera |
| Materiais | `materialFosco(cor)`, uma instância por malha | `materialCru(cor)` com os mesmos parâmetros, mas só cinco instâncias compartilhadas | a bateria tem mais peças repetidas; cada instância a mais é uma troca de estado na placa (Cap. 4) |
| Troca de pai | a conta `(M_pai)⁻¹ · M_mundo`, sem conferências | a mesma conta, mais recusa de ciclo, de escala não uniforme e de escala zero, e o desvio de orientação | na Bancada nenhum pai é escalado; na bateria o piso é redimensionável |
| Classificação do aparelho | "AR sem VR é celular" | `interactionMode` primeiro; a regra dele continua, marcada como hipótese (`aparelho-de-mao-provavel`) | celular que responde "sim" para VR seria classificado como visor |
| Diagnóstico de estabilidade | separa quadro oculto de quadro sem pose; a frase usa o total de quadros | mesma separação; a frase usa só os quadros visíveis | com todos os quadros ocultos, a frase do total diria que a pose veio em todos |
| Recusa de sessão | vira frase no diário (`explicarFalha`) | mesmas frases, em `devices/recusa.ts`, guardadas também no resultado; mais o caso `NotAllowedError` | o botão de exportar leva o motivo junto; o modo celular pede câmera |
| Aquecimento do orçamento | a janela começa no primeiro quadro | os 5 primeiros quadros ficam fora | aqui existe o botão de registrar a medição, que pode ser clicado logo ao abrir |

---

## 10. Casos de fronteira e limitações

**Casos de fronteira tratados (troca de pai):**
- **Matriz desatualizada:** mover a plataforma e fixar o bumbo no mesmo quadro — `updateWorldMatrix` evita o pulo.
- **Ciclo:** pôr um objeto dentro de um descendente dele — recusado com mensagem.
- **Pai com escala não uniforme:** recusado (o filho sairia deformado) — e a plataforma nunca é escalada no nó.
- **Pai com escala zero:** recusado pelo determinante (a matriz não tem inversa).
- **Plataforma girada:** fixar depois de girar mantém posição e orientação no mundo (desvios na casa de 1e-17 m e 0 grau, conferidos).
- **Trocar para o mesmo pai:** funciona naturalmente (a conta devolve a mesma matriz local).
- **Soltar:** é a mesma operação no sentido inverso (plataforma → chão).

**Casos de fronteira tratados (sonda):**
- pose `null` nos primeiros quadros; sessão que termina no meio; quadros que param sem a sessão terminar (10 s); sessão recusada; consulta de suporte que falha; navegador sem WebGL. Em todos a página diz o que aconteceu e a sonda termina.

**Limitações declaradas (vão para o slide 7):**
- VR e AR declarados e sondados, mas ainda não desenham a cena.
- Não há pegar, encaixar nem tocar peças; "fixar" hoje só troca o pai (**reparentar não é encaixar**: a peça fica onde estava).
- O custo medido é de CPU (sem o tempo da placa de vídeo).
- A inferência de graus pode confundir um visor de 6 graus sem rastreamento com um de 3 graus.
- Num aparelho que aceita VR e AR, só o AR é sondado (cada sessão precisa de um clique); o relatório avisa.
- A cena anda igual em máquinas diferentes acima de 10 quadros por segundo.
- O emulador concede **todos** os recursos; não substitui aparelho real.
- Ainda sem teste em Android nem na máquina do laboratório.

---

## 11. Perguntas prováveis na apresentação

Respostas curtas para treinar. Na hora, o ideal é explicar com um objeto da cena (o bumbo, a plataforma, o chimbal) e, quando não souber, dizer com precisão até onde sabe — "não sei" dito com clareza conta a favor.

**Slide 2 — cena e tarefa**
- *Por que a bateria?* Endurece o problema do som posicionado no espaço (o som nasce de onde a pessoa pôs a peça, e a cabeça se move). Armadilha: querer áudio 3D completo sem medir o custo antes.
- *Qual é o estado final e como se confere?* 13 peças (instrumentos + ferragens) fixadas na plataforma, a até 8 cm da superfície útil, e os 8 instrumentos soando. A contagem sai do `dominio.ts`, não é digitada.

**Slide 3 — regimes**
- *O que distingue os três regimes?* O que fazem com o mundo real: substituir (VR), preservar e pôr por cima (AR), exibir numa janela (PC). E cada um tem espaço de referência, rastreamento e registro diferentes.
- *O que ainda é promessa?* VR e AR estão declarados e sondados, mas não desenham a cena. A composição do fundo já foi confrontada pela sonda (no emulador, `alpha-blend` confirmada).

**Slide 4 — sonda**
- *Qual a diferença entre ausente e negado?* Negado: a sessão mandou a lista e o recurso não está nela. Sem resposta: a sessão nem mandou a lista. Tratar os dois como "não" faria o relatório afirmar algo que ninguém verificou.
- *O que quebraria assumindo capacidade não declarada?* Ex.: usar hit-test num celular que o negou — a plataforma não teria onde pousar, sem erro nenhum na tela.
- *Por que um botão?* O navegador só abre sessão imersiva a partir de um gesto de quem usa.
- *O relatório pode afirmar mais do que viu?* Não deveria: graus "três" vem com a ressalva de que pode ter sido perda de rastreamento, "AR sem VR" aparece como celular **provável**, recurso fora da lista aparece como "não concedido (motivo não informado)" e quadros ocultos não contam no diagnóstico.
- *E se a pessoa sair da sessão no meio da sondagem?* O evento `end` encerra a observação e o relatório mostra o que deu para ler, com o motivo. Se os quadros pararem sem a sessão terminar, o limite de 10 s faz o mesmo.
- *Como a sonda sabe se é celular ou visor?* Pelo `interactionMode` que a sessão AR informa (`screen-space` = na mão). Sem essa informação, deduz por "AR sim e VR não"; e quando não há evidência, a classe diz que não dá para saber.

**Slide 5 — árvore**
- *Por que o bumbo vira filho da plataforma?* Porque, depois de fixado, mover a plataforma tem de mover o bumbo.
- *O que a lista de coordenadas absolutas obrigaria a recalcular?* A posição de cada peça fixada toda vez que a plataforma se mexesse.
- *E se a árvore ganhar mais um nível?* A posição no mundo é uma multiplicação de matrizes a mais por objeto, por quadro — o Three.js faz uma vez por quadro, de cima para baixo. É barato; o que pesa no orçamento são chamadas de desenho e triângulos, não níveis.
- *O que a manipulação dos próximos módulos vai precisar achar nessa árvore?* Os nós das peças (pelo nome do domínio) e os dois pais possíveis (`chao` e `plataforma`), para pegar = trocar de pai para a mão/controle e soltar = trocar de volta.

**Slide 6 — trocar de pai**
- *Que conta preserva a posição?* `M_local_novo = (M_pai_novo)⁻¹ · M_mundo`.
- *Por que não recalcular a cada quadro?* Quebra quando a plataforma girar, quando algo acima dela se mover, na hora de soltar e dá um quadro de atraso (tremor).
- *Em que condição a troca falharia?* Com matriz desatualizada (protegido por `updateWorldMatrix`), com ciclo, com pai de escala não uniforme e com pai de escala zero (os três recusados).
- *E se a plataforma girar?* O botão Girar mostra: a conta compõe a rotação, e o diário mostra desvio de posição e de orientação praticamente zero.

**Slide 7 — relógio e orçamento**
- *O que muda em outra máquina se o laço contar quadros?* A velocidade: o chimbal abriria 60 ou 144 vezes por minuto conforme o monitor.
- *Por que 13,9 ms?* 1000 / 72 Hz (meta do visor na especificação), adotado mesmo no PC porque a mesma cena abre no visor.
- *Por que comparar o custo e não o intervalo?* O monitor do PC a 60 Hz nunca dá intervalo abaixo de 16,7 ms; o que precisa caber no envelope do visor é o nosso trabalho.
- *O painel não pesa no orçamento?* Redesenha no máximo 4 vezes por segundo e só quando o texto muda.
- *O custo muda com a tela?* Muda com a área em pixels, por isso a densidade é limitada a 2 e aplicada uma vez só (ver palco.ts).

---

## 12. Glossário

| Termo | Significado |
|---|---|
| **Árvore / grafo de cena** | organização dos objetos em pais e filhos; cada filho guarda a posição em relação ao pai |
| **Âncora** | ponto preso ao mundo real que o aparelho corrige sozinho quando refaz o mapa |
| **Chamada de desenho** | cada pedido do programa à placa de vídeo para desenhar um objeto; custo fixo por objeto |
| **Composição do fundo** | como a imagem sintética se mistura ao mundo real (`opaque`, `additive`, `alpha-blend`) |
| **Contexto seguro** | página em HTTPS (ou localhost); exigido pela WebXR e pelo clipboard |
| **Custo do quadro** | tempo do nosso trabalho em um quadro (CPU) |
| **Delta** | tempo, em segundos, desde o quadro anterior |
| **Diegético** | que existe dentro do mundo da cena (o painel preso à plataforma), e não por cima da imagem |
| **Envelope do quadro** | tempo disponível entre duas imagens (13,9 ms a 72 Hz) |
| **Espaço de referência** | sistema de coordenadas e regra que fixa onde fica o "zero" do mundo virtual |
| **Fonte de entrada** | controle, mão ou toque com que a pessoa age na cena |
| **Graus de liberdade** | quantos números da pose o aparelho mede (3 = orientação; 6 = orientação + posição) |
| **Intervalo do quadro** | tempo real entre duas imagens (inclui placa, navegador e tela) |
| **Malha (Mesh)** | forma visível: geometria + material |
| **Matriz de transformação** | tabela de números que junta posição, rotação e escala; multiplicar matrizes = compor transformações |
| **Pose** | posição + orientação |
| **Regime** | maneira como o ambiente trata o mundo real (substitui / preserva / exibe) |
| **Registro** | grau em que o objeto virtual aparece no lugar certo em relação ao mundo real |
| **Reparentar** | trocar o pai de um objeto mantendo o lugar dele no mundo |
| **Sessão** | o modo imersivo aberto na WebXR |
| **Sonda** | a parte do código que pergunta ao aparelho o que ele oferece |
| **Teto de salto** | maior tempo que a cena aceita avançar em um quadro (0,1 s) |
