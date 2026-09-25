# Especificação do projeto: bateria acústica em RV e RA

Estado do fim do Módulo 03. As mudanças em relação à versão do Módulo 01 estão no [registro de mudanças](#registro-de-mudanças-desde-o-módulo-01), no fim do documento, cada uma com o motivo.

Convenções usadas em todo o documento: medidas em metros (ou centímetros, quando indicado), eixo Y vertical, plano do chão formado por X e Z, e origem de cada peça no ponto em que ela toca o apoio. São as mesmas convenções do Three.js, do formato glTF e do código do projeto.

## 1. Identificação do grupo e da cena

Grupo: ainda sem nome formal.
Integrantes: Kleber, Isabela, Pedro Santilli e Gabriel Verga.
Cena escolhida: bateria acústica.

Descrição em uma frase: uma plataforma onde a pessoa monta, peça por peça, um kit de bateria acústica em tamanho real, ajustando posição e ângulo de cada peça até o kit poder ser tocado.

Por que esta cena: ela endurece o problema da origem do som no espaço. O som de cada peça precisa sair exatamente do lugar onde a pessoa colocou a peça, e esse lugar só é definido durante a montagem, com a cabeça de quem ouve se mexendo o tempo todo. Aceitamos esse custo porque é a parte do trabalho que mais se parece com um problema real de áudio 3D, e não com decoração de cena.

A armadilha desta cena: querer áudio posicional 3D completo (recalculado a cada quadro, para cada peça, a cada movimento de cabeça) sem medir antes quanto isso custa. Para não cair nela, vamos testar cedo, com poucas peças, o atraso entre o golpe e o som e o custo de processamento (seção 10), e só então decidir quanto de espacialização entra.

As quatro perguntas do Projeto Integrador, em duas linhas cada:

| Pergunta | Resposta |
|---|---|
| O que se faz com as mãos que não seja apertar botão? | Levar cada peça até a plataforma, regular altura e ângulo dos suportes e bater nas peças com as baquetas, com a força do golpe virando volume do som. |
| O que muda de verdade quando o ambiente vai para o visor? | A pessoa passa a estar dentro da cena em tamanho real: o alcance do braço limita onde a peça pode ser deixada e o som vem da direção da peça. |
| O que precisa provar contra o mundo real? | Que a plataforma fica presa ao chão real enquanto a pessoa anda em volta com o celular, sem deslizar, e que cada peça tem o tamanho do objeto de verdade. |
| Que número pode sair diferente do esperado, contra qual alternativa? | O atraso entre o golpe e o som com áudio posicional, comparado com um estéreo simples. Se o posicional passar do limite de conforto, ele cai para o estéreo (seção 10). |

## 2. O que a pessoa faz ali

A pessoa chega ao ambiente e encontra as peças da bateria soltas no chão em volta de uma plataforma vazia. Não existe um kit montado esperando: existe um monte de peças e um espaço livre. Ela vai até cada peça, aponta, pega e leva até a plataforma. Ao aproximar a peça da plataforma e soltar, a peça fica fixada, e a partir daí dá para ajustar altura e ângulo. O processo se repete na ordem que a pessoa quiser, até todas as peças obrigatórias estarem fixadas e os instrumentos soando. Aí a tarefa está cumprida (seção 6) e a pessoa pode tocar o kit que montou.

O que se faz com as mãos: pegar e posicionar cada peça, regular altura e ângulo dos suportes e segurar as baquetas para bater nas peças. Nenhuma dessas ações passa por menu.

O que muda com o visor: a pessoa deixa de olhar a cena de fora e passa a estar dentro dela, na escala real do instrumento. O alcance do braço vira o limite de onde uma peça pode ser deixada, e o som passa a vir da direção em que a peça está, mudando quando a cabeça gira.

O que a cena precisa provar contra o mundo real: no modo celular, a plataforma fica presa ao chão real (e não a uma mesa) enquanto a pessoa anda em volta, sem deslizar nem flutuar junto com a câmera. E o tamanho de cada peça projetada tem que corresponder ao tamanho do objeto de verdade.

## 3. Inventário de objetos

A plataforma é a base da montagem. As peças são o que a pessoa leva até ela. O papel de cada peça decide o que o estado final cobra (seção 6):

- instrumento: precisa ser fixado na plataforma e soar ao ser batido;
- ferragem: precisa ser fixada, mas não soa;
- baqueta: nunca é fixada, acompanha a mão de quem toca.

Base da montagem:

| Objeto | Quantos | Origem | Observação |
|---|---|---|---|
| Plataforma | 1 | código do grupo | começa com 1,5 m de lado e pode ser redimensionada de 1,0 a 2,5 m (seção 4) |

Peças obrigatórias (15):

| Peça | Quantos | Papel | Origem | Observação |
|---|---|---|---|---|
| Bumbo | 1 | instrumento | modelo de terceiro | peça maior, referência de escala do kit |
| Caixa | 1 | instrumento | modelo de terceiro | fica sobre a estante de caixa |
| Pedal de bumbo | 2 (esquerdo e direito) | ferragem | código do grupo | pedal duplo; forma simples (base e haste) |
| Chimbal | 1 | instrumento | modelo de terceiro | par de pratos numa haste com pedal próprio; a haste regula a altura dos dois pratos |
| Tom suspenso | 2 | instrumento | modelo de terceiro | tamanhos diferentes (25 e 30 cm) |
| Tom de chão | 1 | instrumento | modelo de terceiro | apoiado nos próprios pés |
| Prato de ataque | 1 | instrumento | modelo de terceiro | preso a um dos braços da estante de prato |
| Prato de condução | 1 | instrumento | modelo de terceiro | preso ao outro braço da estante de prato |
| Estante de prato | 1 | ferragem | código do grupo | tripé com haste telescópica e dois braços, um para cada prato |
| Estante de caixa | 1 | ferragem | código do grupo | tripé com altura regulável |
| Banco | 1 | ferragem | modelo de terceiro | altura regulável |
| Baqueta | 2 | baqueta | modelo de terceiro ou do grupo | a velocidade do movimento vira intensidade do som (seção 5) |

Contagem: 15 peças (8 instrumentos, 5 ferragens e 2 baquetas), mais a plataforma. No Módulo 03 todas as peças aparecem como formas simples feitas em código (cilindros e caixas). Os modelos de terceiros entram no Módulo 05.

Peças opcionais (a pessoa pode inserir se quiser, com a mesma regra de encaixe):

| Peça | Quantos | Observação |
|---|---|---|
| China | 1 | |
| Splash | 4 | formatos e tamanhos diferentes |
| Crash-ride | 1 | |
| Sizzle (prato com rebites) | 1 | |
| Prato de efeito | 4 | quatro formatos diferentes |

Total de opcionais: 11. Com tudo inserido, a cena tem 27 objetos manipuláveis (15 obrigatórios, 11 opcionais e a plataforma), valor usado no orçamento da seção 10.

## 4. O espaço e as escalas

Escala única: tamanho real (1:1) em todos os modos, inclusive no celular. Descartamos a escala reduzida sobre uma mesa porque o problema central da cena é a origem do som no espaço (seção 1). Se a distância entre as peças na tela não corresponder à distância real, o teste de atraso do som deixa de significar alguma coisa. Além disso, bater numa peça com a baqueta só faz sentido na escala real do braço.

Plataforma: quadrada, com 1,5 m de lado no início, redimensionável de 1,0 a 2,5 m, apoiada no chão, com 5 cm de espessura. A superfície útil fica a 5 cm do chão.

Medidas das peças (caixa que envolve a peça, em metros; valores provisórios de um kit acústico padrão, a conferir contra os modelos do Módulo 05). São os mesmos números do arquivo `webxr-app/src/bateria/dominio/dominio.ts`:

| Peça | Largura x altura x profundidade | Faixa de ajuste |
|---|---|---|
| Bumbo | 0,56 x 0,56 x 0,40 (deitado, 56 cm de diâmetro) | não tem |
| Caixa | 0,35 x 0,14 x 0,35 | altura da estante de 60 a 75 cm |
| Pedal de bumbo | 0,10 x 0,08 x 0,30 | não tem |
| Chimbal | 0,35 x 0,80 x 0,35 | haste de 70 a 90 cm |
| Tom suspenso 1 | 0,25 x 0,20 x 0,25 | não tem |
| Tom suspenso 2 | 0,30 x 0,22 x 0,30 | não tem |
| Tom de chão | 0,40 x 0,48 x 0,40 | pés de 45 a 50 cm |
| Prato de ataque | 0,40 de diâmetro x 0,01 | inclinação de 0° a 45° |
| Prato de condução | 0,50 de diâmetro x 0,01 | inclinação de 0° a 45° |
| Estante de prato | 0,50 x 1,20 x 0,50 | altura de 90 a 145 cm |
| Estante de caixa | 0,45 x 0,65 x 0,45 | altura de 60 a 75 cm |
| Banco | 0,35 x 0,50 x 0,35 | altura de 45 a 55 cm |
| Baqueta | 0,015 x 0,015 x 0,40 | não tem |

As medidas são da peça em repouso: suporte na altura inicial e, no chimbal, pedal solto, com os pratos 2 cm abertos e o topo do prato de cima a 80 cm. Ajustar a haste ou fechar o chimbal muda a peça naquele instante, não a medida do inventário. As faixas de ajuste também estão no `dominio.ts` (campo `ajuste`), e a conferência do domínio avisa se a altura em repouso de uma peça sair da faixa do próprio suporte.

Posição inicial: as peças soltas ficam no chão, num círculo de 1,5 m de raio em volta do centro da plataforma.

Espaço físico necessário: com a plataforma inicial e o círculo de peças, a área ocupada é de cerca de 3,6 m x 3,6 m. Somando 0,5 m de folga até paredes e móveis, o ideal é uma área livre de 4,6 m x 4,6 m. Com a plataforma no tamanho máximo (2,5 m), as peças ficam em cima da borda e é preciso afastar o círculo. Marcar o espaço no chão com fita ajuda o rastreamento da câmera (seção 11).

## 5. As ações do usuário

A manipulação (pegar, soltar, ajustar e tocar) é assunto dos próximos módulos. No Módulo 03 existem só os botões de demonstração descritos na seção 13.

| Ação | O que a pessoa faz | O que o sistema faz | Se não puder |
|---|---|---|---|
| Mirar uma peça | aponta o controle (visor), o cursor (PC) ou o centro da tela (celular) | destaca a peça com contorno amarelo (seção 8) | nada sob a mira: nenhum destaque |
| Pegar uma peça do chão | aciona o gatilho, o clique ou o toque sobre a peça, a até 90 cm dela no visor | a peça passa a acompanhar a mão, o controle ou o cursor | fora de 90 cm no visor: a peça não responde, contorno cinza e aviso "fora de alcance"; peça já presa a outra mão: contorno vermelho e aviso "peça em uso" |
| Fixar na plataforma | aproxima a peça da plataforma e solta | se estiver dentro da folga de encaixe (seção 7), a peça passa a ser filha da plataforma e fica apoiada na superfície útil | fora da folga ou dentro da zona de exclusão em volta do corpo (seção 7): a peça pisca em vermelho, volta para onde estava e aparece o aviso "fora da área de montagem" |
| Ajustar altura e ângulo | move a peça fixada para cima e para baixo (só peças com faixa de ajuste) e gira dentro do curso do suporte | aplica o valor dentro da faixa da seção 4 | ao passar do limite: trava no limite e aparece o aviso "altura ou ângulo máximo do suporte" |
| Mover uma peça fixada | arrasta a peça no plano da plataforma (X e Z) | a peça acompanha, sempre apoiada na superfície | ao chegar na borda: a peça para e a borda fica vermelha |
| Redimensionar a plataforma | usa o controle de tamanho e escolhe entre 1,0 e 2,5 m de lado | o piso muda de tamanho; as peças fixadas não mudam de tamanho | no visor, se a área livre informada pelo aparelho (bounded-floor) for menor: recusa com o aviso "espaço insuficiente"; nos outros modos, e quando o aparelho não informa a área, aceita e mostra o tamanho em metros |
| Tocar uma peça | bate a baqueta na peça | calcula a velocidade da baqueta no momento do impacto e toca o som naquela intensidade | peça ainda não fixada: nenhum som e o aviso "fixe a peça antes de tocar" |
| Acionar o pedal | aperta o botão do controle ligado ao pedal (visor), a tecla correspondente (PC) ou toca no pedal (celular) | toca o som do bumbo ou fecha o chimbal | não há rastreamento de pé, por isso o pedal é acionado pelas mãos |

## 6. A tarefa e sua validação

Tarefa em uma frase: montar o kit de bateria sobre a plataforma, fixando cada peça obrigatória e ajustando altura e ângulo até ele poder ser tocado.

Estado inicial: as 15 peças obrigatórias estão soltas no chão, em volta da plataforma vazia. Nenhuma opcional aparece até a pessoa decidir inserir.

Estado final de sucesso: as 13 peças que se fixam (8 instrumentos e 5 ferragens) estão fixadas sobre a plataforma, a até 8 cm da superfície útil, e os 8 instrumentos produzem som ao serem atingidos pela baqueta. As 2 baquetas não entram nessa conta, porque acompanham a mão.

Ordem: livre. A condição de sucesso é sobre o conjunto final. O sistema mantém dois contadores, "peças fixadas: X de 13" e "instrumentos soando: Y de 8", e declara a tarefa cumprida quando os dois chegam ao máximo. Peças opcionais fixadas não contam e não atrapalham.

Essa contagem é calculada a partir do inventário no código (`contarEstadoFinal`, em `dominio.ts`), e não digitada à mão. Se o inventário mudar, os números acompanham.

Ao atingir 13 de 13 e 8 de 8, a plataforma ganha um contorno luminoso e toca um som curto de confirmação (seção 8).

## 7. Regras de encaixe e tolerâncias

Todos os valores são provisórios e vão ser medidos no aparelho. O que já se sabe antes de medir é o comportamento nos dois extremos: folga grande demais faz a peça grudar na plataforma vinda de longe e a montagem perde o sentido; folga pequena demais transforma o encaixe numa prova de pontaria.

| Regra | Valor | Por quê |
|---|---|---|
| Folga de posição do encaixe na plataforma | 8 cm a partir da superfície útil | generosa o bastante para não exigir precisão de milímetro ao soltar, pequena o bastante para a peça não saltar para a plataforma vinda de longe |
| Folga de ângulo do encaixe | nenhuma (qualquer ângulo é aceito) | a montagem é livre e a orientação fina é resolvida depois, no ajuste; exigir ângulo no encaixe só criaria frustração |
| Zona de exclusão em volta do corpo | 50 cm de raio, sem tolerância | corresponde a braço estendido mais uma folga; evita montar uma peça em cima da própria pessoa |
| Alcance para pegar uma peça (visor) | 90 cm da mão até a peça | alcance de braço de um adulto sem precisar dar um passo |
| Faixas de ajuste de altura e ângulo | as da seção 4 | vêm do curso físico dos suportes reais; qualquer valor dentro da faixa é válido, não existe acerto ou erro |

## 8. Retorno ao usuário

| Situação | Retorno |
|---|---|
| Peça mirada | contorno amarelo suave |
| Peça pega | a peça acompanha a mão ou o controle com um leve brilho branco, e a plataforma mostra a área de encaixe |
| Encaixe aceito | flash verde breve, som curto de clique e a peça assenta na plataforma |
| Encaixe recusado | a peça pisca em vermelho, volta para onde estava e, no visor, o controle vibra rápido quando houver suporte |
| Ajuste no limite do suporte | a peça para de responder naquele eixo e o contorno pisca âmbar uma vez |
| Tarefa concluída | contorno luminoso em volta da plataforma e som curto de confirmação |
| Peça tocada com a baqueta | o som da peça, na intensidade da velocidade do golpe |

Nenhum desses retornos depende só de som, com exceção do último, para a cena não ficar muda fora do momento de tocar.

No Módulo 03 existe um retorno a mais, só de demonstração: quando o bumbo é fixado na plataforma, aparece uma linha amarela da plataforma até ele e um anel no chão em volta dele, porque trocar de pai não move a peça e, sem isso, nada mudaria na tela.

## 9. Os três regimes

A declaração abaixo é a mesma do arquivo `webxr-app/src/bateria/modes/regimes.ts`.

| Campo | Janela (PC) | Visor (VR) | Celular (AR) |
|---|---|---|---|
| O que faz com o mundo real | exibe a cena numa janela, sem tocar no mundo | substitui o mundo pela cena | preserva o mundo e põe a cena por cima |
| Espaço de referência | viewer | local-floor | local-floor |
| O que rastreia | nada do corpo; a câmera obedece ao mouse | a cabeça e os dois controles, com seis graus de liberdade | a pose do celular e as superfícies que ele encontra |
| Registrado contra | a origem da cena, que escolhemos no centro da plataforma, no chão | o chão físico onde a pessoa está; a plataforma nasce no nível do piso real | o chão real encontrado por teste de impacto, com uma âncora que mantém a plataforma no lugar enquanto a pessoa anda |
| Composição do fundo esperada | opaque | opaque | alpha-blend |
| O que ainda vai ter de provar | que o kit inteiro pode ser montado só com mouse e teclado | escala corporal, alcance de 90 cm e a velocidade do controle virando intensidade do som | que a plataforma não desliza nem flutua quando a pessoa caminha |

Como cada regime funciona na prática:

| Aspecto | Janela (PC) | Visor (VR) | Celular (AR) |
|---|---|---|---|
| Como se olha | câmera orbital com o mouse, vendo a plataforma de fora | a cabeça controla o olhar | pela câmera do celular, com o ambiente real ao fundo |
| Como se aponta e age | clique mira, arrasto posiciona, teclado ajusta altura e ângulo | os controles miram e pegam, o braço se move de verdade para bater | toque pega e solta, arrasto posiciona, retículo no centro mira |
| Escala | real (1:1), com a câmera afastada para ver tudo | real (1:1) | real (1:1), presa ao chão real |
| O que faz de diferente | modo de edição e conferência, sem depender de equipamento | lê a velocidade do controle e liga o áudio posicional | usa o rastreamento de superfície para prender a plataforma no chão |
| O que não existe | áudio posicional (usa estéreo simples), leitura de velocidade da baqueta | mira por mouse, visão das próprias mãos reais | baqueta física (o toque substitui o golpe), vibração |

Situação no Módulo 03: só o regime de janela desenha a cena. Os regimes de visor e celular estão declarados e são consultados pela sonda de capacidades. No emulador de visor, a sonda confirmou a composição alpha-blend declarada para o modo AR.

Por que o modo AR usa local-floor, e não um espaço "superfície": a WebXR não tem um espaço de referência de superfície. A origem fica no chão, e a superfície chega por teste de impacto e âncora, em cima dessa origem.

## 10. Orçamento e desempenho

Objetos: 15 peças obrigatórias e a plataforma; com todas as opcionais, 27 objetos manipuláveis (seção 3).

Teto por quadro, declarado antes de haver conteúdo pesado:

| Aparelho | Taxa de imagens | Teto por quadro |
|---|---|---|
| Visor | 72 por segundo (meta para não causar enjoo em uso longo) | 13,9 ms |
| PC (janela) | 60 por segundo | 16,7 ms |
| Celular | mínimo de 30 por segundo | 33,3 ms |

Teto adotado: o do visor (13,9 ms), inclusive no PC. A mesma cena abre nos dois pelo mesmo endereço; se ela coubesse só nos 16,7 ms do PC, estouraria no visor, onde estourar causa enjoo. O preço é a versão de PC ficar mais simples do que a máquina aguentaria.

O que se compara com o teto: o custo do nosso trabalho em cada quadro (tempo de processador). O intervalo entre imagens também é medido, mas não entra na comparação, porque num monitor de 60 Hz ele nunca fica abaixo de 16,7 ms e daria "acima do teto" o tempo todo. Limite conhecido: o tempo da placa de vídeo não entra no custo medido.

Máquina de referência: o PC mais simples do laboratório, com vídeo integrado e sem placa dedicada, no Chrome. Nenhum número do projeto pode depender de placa dedicada. Toda medição sai com a máquina junto (botão Salvar arquivo na máquina, pasta `docs/medicoes/`).

Linha de base do Módulo 03: a cena crua tem 25 chamadas de desenho e 1.800 triângulos com a câmera na posição inicial (27 e 1.880 quando a linha amarela de demonstração está ligada). Esses dois números dependem só da cena e da câmera, não da máquina. O custo em milissegundos na máquina de referência ainda vai ser medido.

Os 5 primeiros quadros depois de abrir a página ficam fora da medição. Neles a placa de vídeo compila os materiais, um custo que acontece uma vez só e que, dentro da janela de 120 quadros, faria o pior custo parecer muito maior do que o do quadro típico.

Limite do relógio: um intervalo acima de 0,1 s entre dois quadros é cortado para 0,1 s, para a cena não dar um pulo quando a aba volta a aparecer. Por isso a cena anda igual em máquinas diferentes desde que elas passem de 10 quadros por segundo. Abaixo disso a cena anda mais devagar que o relógio de verdade, e a medição mostra quantos quadros tiveram o salto cortado.

Objetos que se repetem: os 4 splashes, os 4 pratos de efeito e os 2 tons suspensos compartilham forma e material, e são candidatos a desenho em lote (instanciação) e a versão simplificada para quando estiverem longe (Módulo 05).

Ordem de degradação, se não couber:

1. simplificar os pratos opcionais, que são os menos importantes para a tarefa;
2. trocar o áudio posicional do visor por um estéreo simples;
3. limitar a no máximo 2 peças opcionais ao mesmo tempo;
4. tirar sombras dinâmicas e reflexos dos metais.

O que não sai em nenhum caso: as 15 peças obrigatórias, a plataforma e o retorno visual do encaixe.

Espacialização do som: entra nesta fase com escopo reduzido (uma fonte de som por peça fixada, e não uma simulação acústica da sala). Antes do Bloco 5 medimos o atraso real comparando áudio posicional e estéreo simples.

## 11. Erros, limites e degradação

1. Página sem HTTPS: sem conexão segura o navegador esconde a WebXR. A página avisa isso no topo, porque senão o aparelho pareceria não ter suporte.
2. Aparelho não suporta o regime pedido: a sonda pergunta ao aparelho ao abrir e a página continua no regime de janela, que funciona em qualquer máquina com WebGL 2, explicando por que o outro modo não está disponível. O relatório diferencia "o aparelho respondeu que não" de "o navegador não respondeu", e quando a consulta falha sem resposta ele diz que não dá para concluir, em vez de dizer que o aparelho não tem o modo.
3. Recurso opcional negado ou sem resposta: o ambiente não usa o recurso e avisa. Por exemplo, sem hit-test no celular a plataforma não é pousada no chão real, e aparece uma mensagem em vez de a plataforma ficar num lugar qualquer.
4. Sessão recusada: a recusa aparece como frase na página (o aparelho não suporta o modo, faltou o clique, já existe outra sessão aberta ou a permissão foi negada), e não só no console. O que a sonda já tinha descoberto antes da recusa continua no relatório.
5. Permissão de câmera negada: o modo celular explica que precisa da câmera, com um botão para pedir de novo e outro para voltar ao modo janela.
6. Rastreamento se perde: a plataforma fica presa por âncora, e é o próprio aparelho que corrige a posição dela quando reconhece o ambiente de novo. A plataforma não some; a sonda conta os quadros sem pose, e acima de 10 quadros seguidos sem pose (cerca de 0,14 s a 72 Hz, valor provisório no arquivo `estabilidade.ts`) a borda da plataforma pisca para avisar que o rastreamento está instável. A WebXR não avisa quando corrige o mapa, então o projeto não tenta medir esse desvio por conta própria.
7. Pessoa tenta pegar peça fora do alcance: acima de 90 cm a peça não responde, com contorno cinza e o aviso "fora de alcance", sem travar o resto da cena.
8. A sessão termina no meio da sondagem ou para de mandar quadros: a sonda nunca fica esperando. Se a pessoa sai da sessão, ou se em 10 s não chegam os 90 quadros, ela fecha a sessão (quando ainda está aberta) e mostra o que conseguiu ler, com o motivo.
9. O navegador não entrega WebGL 2: a cena não é desenhada, os botões da demonstração ficam desligados e o motivo aparece no diário. A sonda e o relatório continuam funcionando, porque não dependem da cena.

## 12. Ativos, formatos e licenças

Feitos em código pelo grupo, sem licença externa: plataforma, pedais de bumbo, estante de prato e estante de caixa. No Módulo 03, todas as peças são formas simples feitas em código.

Modelos de terceiros (entram no Módulo 05, em glTF, ajustados à convenção da cena: metro, eixo Y vertical, origem no ponto de apoio e frente em +Z):

| Arquivo | Origem planejada | Licença exigida | Endereço |
|---|---|---|---|
| Bumbo, caixa, tons, tom de chão, chimbal, pratos, banco | bancos de modelos gratuitos (Sketchfab, Poly Haven, Quaternius) | CC0 ou CC-BY, com a atribuição registrada quando exigida | a preencher quando cada modelo for escolhido |
| Baquetas | banco de modelos gratuitos ou feitas pelo grupo | CC0, CC-BY ou do grupo | a preencher |
| Sons de cada peça | Freesound, filtrando por CC0 | CC0 | a preencher com o endereço de cada amostra |

Cada modelo importado vai ter um registro de como chegou e como ficou (medidas, escala aplicada, giro e deslocamento), para conferir a importação sem depender de olhar a tela.

## 13. Plano de construção por blocos

| Bloco | O que estará funcionando no fim dele | Situação |
|---|---|---|
| 1 | Regime de janela abre, plataforma aparece, câmera orbital com o mouse | concluído no Módulo 03 |
| 2 | As 15 peças aparecem como formas simples soltas no chão; dá para mirar, pegar e arrastar até a plataforma | as formas e a árvore da cena estão prontas; mirar, pegar e arrastar ficam para os módulos de interação |
| 3 | Regras de encaixe e tolerâncias da seção 7, com os retornos da seção 8 | a troca de pai que o encaixe vai usar está pronta e conferida em números |
| 4 | Regime celular com a plataforma presa ao chão real; regime visor com os controles para mirar, pegar e bater | a sonda já consulta os dois regimes |
| 5 | Som: a baqueta batendo dispara o som da peça com intensidade pela velocidade; áudio posicional básico no visor | não começado |
| 6 | Modelos e sons finais no lugar das formas simples; tolerâncias e orçamento medidos no laboratório; peças opcionais | não começado |

O que o Módulo 03 entrega de fato, e como aparece na demonstração (modo janela):

- a cena como árvore: sala, chão com as peças soltas, plataforma com o piso e o painel, e o chimbal com a haste segurando os dois pratos;
- um objeto que se move junto com outro: subir a haste do chimbal sobe os pratos, e a haste desliza dentro do tubo fixo do tripé;
- troca de pai: fixar o bumbo na plataforma mantém a posição e a orientação no mundo (a página mostra antes, depois e os dois desvios), inclusive com a plataforma girada 30°, e, ao girar ou mover a plataforma, o bumbo vai junto;
- relógio e orçamento: o prato de cima do chimbal fecha e abre uma vez por segundo, seguindo o tempo, e o painel preso à borda direita da plataforma mostra o custo do quadro contra o teto de 13,9 ms.

Cada bloco a partir do 1 abre e responde sozinho; nenhum depende do seguinte para ser testado.

## 14. Riscos, decisões em aberto e declarações

Riscos:

- O áudio posicional pode causar atraso perceptível quando a cabeça gira rápido. Mitigação: medir o atraso antes do Bloco 5 comparando áudio posicional e estéreo simples.
- As máquinas do laboratório têm vídeo integrado e podem não aguentar 27 objetos com sombras. Mitigação: o teto já está declarado e a ordem de degradação da seção 10 vale desde já.
- O rastreamento pode falhar em salas pequenas ou mal iluminadas. Mitigação: testar cedo, com fita no chão ajudando a câmera, e acompanhar a contagem de quadros sem pose da sonda.
- Há menos visores do que grupos. Mitigação: o regime de janela funciona desde o Bloco 1, o emulador de visor ajuda no desenvolvimento, e os horários de teste com visor vão ser reservados com antecedência.
- Nenhum integrante tem Android com ARCore confirmado. Mitigação: conseguir um aparelho emprestado ou usar o do laboratório para testar o modo celular.

Decisões em aberto:

- Tamanho final da plataforma: começa com 1,5 m e vai ser decidido montando o kit completo como referência, antes do Bloco 6.
- Biblioteca de áudio espacial para o visor: escolhida comparando o atraso de duas opções, antes do Bloco 5.
- Quantas peças opcionais entram na entrega final: decidido pelo orçamento medido no laboratório, no Bloco 6.
- Endereços exatos dos modelos e sons de terceiros: preenchidos quando cada um for escolhido, antes do Módulo 05.

Aparelhos testados até o fim do Módulo 03 (a tabela completa está no README):

| Aparelho | Regime que abriu | Regime que não abriu |
|---|---|---|
| PC com Windows e Chrome | janela | visor e celular (o aparelho respondeu que não suporta) |
| iPhone com Safari | janela | visor e celular (o navegador não tem WebXR) |
| PC com o emulador de visor (simulação, não conta como aparelho) | janela, e a sonda abriu sessão AR | nenhum, porque o emulador libera tudo |

Declaração de uso de IA: usamos uma assistente de IA (Claude) para organizar as anotações e decisões do grupo no formato de 14 seções, redigir partes do texto, propor números provisórios de escala, tolerância e orçamento a partir de medidas de um kit acústico padrão, e para escrever parte do código. Os números provisórios ainda não foram testados em aparelho real. O grupo revisou o documento e o código, e se compromete a conferir cada valor provisório durante a construção e registrar aqui quando um valor mudar por causa de um teste.

## Registro de mudanças desde o Módulo 01

| O que era | O que ficou | Por quê |
|---|---|---|
| Eixo X como vertical (seções 5 e 7) | eixo Y vertical, plano do chão em X e Z | é a convenção do Three.js e do glTF; usar X brigaria com a biblioteca e com os modelos do Módulo 05 |
| "17 peças obrigatórias" | 15 peças obrigatórias mais a plataforma | a soma da tabela dava 16 contando a plataforma; a plataforma é a base da montagem e não uma peça levada até ela |
| Estado final "17 peças fixadas e todas soando" | 13 peças fixadas e 8 instrumentos soando; baquetas fora da conta | baquetas, banco, estantes e pedais não soam, e as baquetas nunca são fixadas; o estado anterior não podia ser conferido |
| Nenhuma classificação das peças | papel de cada peça: instrumento, ferragem ou baqueta | o papel decide o que o estado final cobra de cada peça, e a contagem passa a sair do código |
| Uma estante para dois pratos, sem explicar como | estante de prato com dois braços, um para cada prato | deixa o inventário coerente sem acrescentar peça |
| Pedal "acionado ao ser pisado" | pedal acionado pelo controle, tecla ou toque | a WebXR não rastreia os pés |
| Seção 2 falava em projetar sobre "uma mesa de verdade" | no modo celular a plataforma fica no chão real, em tamanho real | a seção 4 já decidia escala 1:1 no chão; a menção à mesa contradizia essa decisão |
| Espaço livre "2,5 m x 2,5 m ao redor" (ambíguo) | cerca de 3,6 m x 3,6 m ocupados, 4,6 m x 4,6 m com folga | a conta passou a partir da posição real das peças soltas (círculo de 1,5 m de raio) |
| Redimensionar recusava "se não couber no espaço mapeado pela câmera" | no visor usa a área livre informada pelo aparelho (bounded-floor); nos outros modos aceita e mostra o tamanho | o celular não informa área livre pela WebXR; só o visor com bounded-floor informa |
| Seção 9 sem espaço de referência, rastreamento e registro | seção 9 com os três campos por regime, igual ao `regimes.ts` | a declaração dos regimes (passo 3) precisa entrar na especificação como está no código |
| Metas em quadros por segundo | teto em milissegundos, com o do visor (13,9 ms) adotado também no PC | o teto em milissegundos é o que se compara com a medição; orçar pelo PC faria a cena estourar no visor |
| Nenhuma regra sobre o que comparar com o teto | compara-se o custo do nosso trabalho, não o intervalo entre imagens | num monitor de 60 Hz o intervalo nunca fica abaixo de 16,7 ms |
| Máquina de referência não definida | PC mais simples do laboratório, com vídeo integrado, e toda medição sai com a máquina junto | número sem a máquina não serve para comparar nem para repetir a conta |
| Rastreamento perdido: "reancora se o desvio for menor que 15 cm" | a âncora do aparelho corrige a posição sozinha; a sonda conta quadros sem pose para avisar | a WebXR não avisa quando corrige o mapa, então esse desvio não pode ser medido pela página |
| Tolerâncias só em texto corrido | tabela com valor e motivo de cada regra | cada número precisa vir com a razão ao lado para poder ser revisado depois |
| Inferência de graus de liberdade pelos espaços de referência concedidos (alternativa considerada) | inferência pela informação de posição emulada de cada pose | um aparelho que só gira também recebe local-floor com o chão estimado, e a regra pelos espaços diria seis graus para ele |
| Seção 9 com textos resumidos em relação ao `regimes.ts`, e o código ainda dizendo "falta decidir chão ou mesa" no AR | seção 9 e `regimes.ts` com as mesmas frases, letra por letra; AR no chão em tamanho real | a declaração do passo 3 tem de entrar na especificação sem reescrita, e a decisão da seção 4 já estava tomada |
| Chimbal com o prato de cima 2 cm acima dos 80 cm | topo do prato de cima exatamente a 80 cm, com o pedal solto e os pratos 2 cm abertos | a peça construída tinha 82 cm de altura e não batia com o inventário |
| Faixas de ajuste só no texto da seção 4 | faixas também no `dominio.ts`, conferidas na abertura da página | a cena usava a faixa do chimbal escrita à mão, e código e documento podiam discordar sem ninguém ver |
| Materiais com brilho e rugosidade diferentes para metal, madeira e casco | um material cru por cor, com os mesmos parâmetros | o Módulo 03 pede nenhum material trabalhado; a cor fica só para distinguir as peças |
| Aviso de rastreamento instável "acima de alguns quadros" | acima de 10 quadros seguidos sem pose | sem número, a frase não podia ser conferida |
| 24 chamadas de desenho e 1.768 triângulos | 25 e 1.800 (27 e 1.880 com a linha amarela) | o chimbal ganhou o tubo fixo onde a haste desliza, e o prato de baixo desceu para o chimbal ter a altura do inventário |
