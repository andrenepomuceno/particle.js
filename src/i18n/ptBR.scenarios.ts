import type { ScenarioTexts } from './scenarios';

/** The bundled scenarios in Brazilian Portuguese: folders, names, descriptions and timeline captions. */
export const PT_BR_SCENARIOS: ScenarioTexts = {
  folders: {
    Gravity: 'Gravidade',
    Electromagnetism: 'Eletromagnetismo',
    'Short range': 'Curto alcance',
    Stochastic: 'Estocástico',
    Spin: 'Spin',
    Magnetism: 'Magnetismo',
    'Color charge': 'Carga de cor',
    Relativity: 'Relatividade',
    'Force Map': 'Mapa de forças',
    'Quark Model': 'Modelo de quarks',
    'EPN Model': 'Modelo EPN',
    Experiments: 'Experimentos',
    Elements: 'Elementos',
    'Experiments 0': 'Experimentos 0',
    Record: 'Gravação',
    Sandbox: 'Sandbox',
  },
  captions: {
    'Gravity: {Gravity (v1 1/d).G}': 'Gravidade: {Gravity (v1 1/d).G}',
    'Gravity: {Gravity (v1 1/d).G}\nFriction: {settings.friction}': 'Gravidade: {Gravity (v1 1/d).G}\nAtrito: {settings.friction}',
    'Gravity: {Gravity (v1 1/d).G}\nFriction: {settings.quadraticDrag}': 'Gravidade: {Gravity (v1 1/d).G}\nAtrito: {settings.quadraticDrag}',
    'Friction: {settings.quadraticDrag}': 'Atrito: {settings.quadraticDrag}',
  },
  scenarios: {
    galaxy: {
      name: 'Disco galáctico',
      description: 'Um núcleo fixo e massivo com um disco giratório de corpos leves em órbitas quase circulares.',
    },
    plasma: {
      name: 'Plasma neutro',
      description:
        'Quantidades iguais de cargas positivas (m = 10) e negativas (m = 1) numa esfera refletora, com forças de par elétricas e magnéticas: Coulomb mais a força magnética entre cargas em movimento (Biot–Savart com μ₀/4π = k/c², de modo que correntes paralelas se atraem; as correções de Darwin e o retardo ficam de fora), sob relatividade especial (métrica de Minkowski, c = 20) em vez de um limite de velocidade. Nessas velocidades o magnetismo é de alguns por cento da força elétrica. Reduza c no diálogo Espaço-tempo (tente 6): o acoplamento magnético k/c² cresce junto, as velocidades saturam abaixo de c e o maior γ passa de 2 (o Espaço-tempo mostra).',
    },
    nuclei: {
      name: 'Aglomerados nucleares',
      description:
        'Força senoidal de curto alcance no estilo do v1 mais repulsão de Coulomb: núcleons carregados se aglomeram em núcleos.',
    },
    crystal: {
      name: 'Cristal de Lennard-Jones',
      description:
        'Um sólido de Lennard-Jones iniciado numa grade quadrada um pouco mais larga que o mínimo do potencial; o atrito o resfria enquanto ele se reorganiza numa rede hexagonal.',
    },
    'crystal-slab': {
      name: 'Cristal numa lâmina',
      description:
        'Um mundo semi-2D: uma caixa 3D larga como uma placa em x e y, mas com apenas dois diâmetros de partícula de espessura em z (boundaryDepth). Um líquido de Lennard-Jones quente esfria formando uma bicamada: cada camada se ordena numa rede triangular e as duas se empilham deslocadas, como acontece em filmes finos de coloides. Incline a câmera para ver as camadas; E mostra ou esconde a caixa.',
    },
    'dpd-thermostat': {
      name: 'Termostato DPD',
      description:
        'Dinâmica de partículas dissipativas em 2D: repulsão suave, um arrasto de par −gamma·(1 − x)²·v_dot e um ruído de par sigma·(1 − x)·randn, todos ao longo da linha dos centros, mais uma mola fraca entre cada par (½·k·r², uma armadilha que acompanha o próprio centro de massa da gota). O quadrado começa congelado em T = 0; o ruído o derrete numa gota redonda, a temperatura ultrapassa o alvo enquanto relaxa e então se estabiliza onde o arrasto equilibra o ruído, perto de T = sigma²·dt/(2·gamma) = 1 (Estatísticas). Cada impulso aleatório é igual e oposto no seu par, então o ruído não acrescenta momento líquido (o passo implícito do arrasto só o preserva aproximadamente: a gota deriva muito devagar). Experimente: desative Pair noise e ela congela; desative Pair drag e ela esquenta sem limite; dobre sigma para T = 4.',
    },
    'dipole-chains': {
      name: 'Cadeias de dipolos',
      description:
        'Um ferrofluido 2D: dipolos magnéticos todos apontando ao longo de x, com um caroço repulsivo rígido. A força dipolar completa F = −∇V (não central) os alinha cabeça com cauda, então o gás se condensa em cadeias ao longo da direção do campo, que depois se fundem lado a lado.',
    },
    'dipole-crystal': {
      name: 'Cristal de dipolos',
      description:
        'A outra metade do ferrofluido: dipolos perpendiculares ao plano se repelem todos (V ∝ +1/r³), de modo que um gás 2D desordenado numa caixa esfria numa rede triangular. Um décimo deles aponta no sentido oposto; esses atraem os vizinhos e ficam como defeitos no cristal.',
    },
    'radiation-belt': {
      name: 'Cinturão de radiação',
      description:
        'O dipolo magnético de um planeta aprisiona partículas carregadas, como os cinturões de Van Allen da Terra. Cada carga gira em torno de uma linha de campo (F = q v × B), ricocheteia entre os polos, onde o campo converge (espelho magnético), e deriva em volta do planeta: cargas negativas leves e positivas pesadas derivam em sentidos opostos. A força magnética não realiza trabalho, então o módulo de cada velocidade permanece constante. Cargas que se movem quase ao longo do campo (o cone de perda) não são refletidas pelo espelho e escapam pelos polos.',
    },
    cyclotron: {
      name: 'Cíclotron e deriva E×B',
      description:
        'Um plasma 2D num campo magnético uniforme B (saindo da tela) e num campo elétrico E (ao longo de x). Cada carga gira — elétrons leves em círculos apertados num sentido, íons pesados em círculos largos no outro —, mas o plasma inteiro deriva junto ao longo de −y com velocidade E/B, qualquer que seja a carga ou a massa (a deriva E×B). Os campos vêm da partícula fonte fixa: só ela tem carga nuclear n = 1.',
    },
    'beam-pinch': {
      name: 'Pinch de feixe',
      description:
        'Dois feixes de cargas de mesmo sinal movendo-se ao longo de +x. Dentro de cada feixe, a repulsão de Coulomb disputa com a atração magnética entre correntes paralelas (Biot–Savart, ∝ v_i·v_j), que cresce com a velocidade: o feixe lento (em cima, v = 0.5) se espalha, enquanto o rápido (embaixo, v = 3) se autofocaliza num filamento estrangulado (pinch).',
    },
    quarks: {
      name: 'Confinamento de cor',
      description:
        'Quarks e antiquarks com carga de cor a 120° sob um potencial de Cornell escalonado pelo fator de Casimir: eles se combinam em mésons e bárions neutros em cor.',
    },
    hadrons: {
      name: 'De quarks a núcleos',
      description:
        'Tripletos de quarks (neutros em cor, unidos pela força de cor com um corte curto) se ligam em núcleos e cristais pela força nuclear senoidal do v1 mais um caroço repulsivo entre hádrons (que entra em rampa ao longo de r_in..r_in+w, de modo que nunca age dentro de um tripleto e não tem salto), o que dá saturação aos núcleos; a carga nuclear é o número bariônico (1/3 por quark) e Coulomb mantém os prótons afastados.',
    },
    'twin-clocks': {
      name: 'Relógios gêmeos',
      description:
        'Sete fileiras de relógios ricocheteiam entre as paredes de uma caixa a 0, 0.3, 0.6, 0.8, 0.9, 0.95 e 0.99 c (c = 1, métrica de Minkowski). O relógio de cada partícula mostra seu tempo próprio, cujo incremento é dt·√(1 − v²/c²): as fileiras mais rápidas ficam para trás (cores quentes), enquanto a fileira em repouso se adianta (azul). Em t = 100 a fileira a 0.99 c envelheceu cerca de 14 — o paradoxo dos gêmeos, com as paredes como ponto de retorno. Clique numa partícula para ler seu tempo próprio e γ no diálogo Partícula; mude a métrica para galileana no diálogo Espaço-tempo e todos os relógios voltam a marcar o mesmo ritmo.',
    },
    'relativistic-cyclotron': {
      name: 'Cíclotron relativístico',
      description:
        'Doze cargas saem juntas do centro ao longo de x com velocidades de 0.1 c a 0.95 c (c = 1, métrica de Minkowski), num campo magnético uniforme vindo da fonte fixa (a única partícula com n = 1). Classicamente, o período ciclotrônico 2πm/(qB) não depende da velocidade, então todas voltariam ao centro ao mesmo tempo. Relativisticamente, o período é 2πγm/(qB) e o raio é γmv/(qB): as cargas mais rápidas, com momento γmv, descrevem círculos mais largos e se atrasam, voltando uma após a outra. As velocidades ficam constantes (a força magnética não realiza trabalho), e os relógios também mostram a dilatação (cores: quente = atrasado). Mude a métrica para galileana no diálogo Espaço-tempo para vê-las voltar em sincronia.',
    },
    'retarded-field': {
      name: 'Campo retardado',
      description:
        'Uma carga circula a 0.9 c (c = 1, métrica de Minkowski) num campo magnético uniforme vindo da fonte fixa no centro (a única partícula com n = 1, e sem carga). As setas mostram o campo de Coulomb retardado da carga sobre uma carga de teste em repouso: cada ponto sente a carga onde ela estava quando partiu a luz que chega agora, há r/c, de modo que as linhas de campo se curvam numa espiral que se arrasta atrás da órbita. Desmarque Retardada no cartão Coulomb (Forças) e todas as setas saltam para a posição atual. O Coulomb retardado sozinho não é o campo completo de uma carga em movimento: Antena dipolar usa a força predefinida Liénard–Wiechert.',
    },
    'dipole-antenna': {
      name: 'Antena dipolar',
      description:
        'Uma carga forçada a ir e vir ao longo de x atinge 0.7 c (c = 1, métrica de Minkowski) e irradia. As setas mostram seu campo de Liénard–Wiechert sobre uma carga de teste em repouso (retardado: lido no cone de luz): de perto, o campo de Coulomb de onde a carga estava; mais longe, o termo de radiação em 1/r, proporcional à sua aceleração, mais forte na direção perpendicular ao eixo do movimento e nulo ao longo dele, propagando-se a c em faixas separadas por um comprimento de onda (2πc/ω ≈ 63). O forçamento vem da fonte fixa abaixo (n = 1) e age só sobre a carga com q2 = 1. Além de c·(K − 1)·dt, o movimento da carga seria extrapolado uniformemente a partir do seu passo armazenado mais antigo; a vista fica dentro desse limite.',
    },
    welcome: {
      name: 'Boas-vindas',
      description:
        'A cena de abertura do v1: 788 pixels de texto, cada um deles um núcleo de seis quarks coloridos (uud + udd) com dois elétrons, unidos pelo mapa de forças 2 do v1 (atração de Yukawa menos uma repulsão linear) e pela sua força de cor constante dentro de 3 fm. O v1 amortecia as velocidades por exp(-c·dt/m); aqui o arrasto é c dividido pela massa média dos quarks. O ruído aleatório de força do v1 e a fonte do texto não são reproduzidos; a gravidade (G ≈ 9e-38) é desprezível e foi omitida.',
    },
    'the-egg': {
      name: 'O Ovo',
      description:
        'A sopa de quarks do v1: 9996 quarks coloridos (uud + udd) e elétrons num disco de 2e5 sob o mapa de forças 2 do v1, a força de cor e Coulomb em 1/d, mais gravidade em 1/d. Roteirizado como no v1 (os tempos são os segundos do v1 × 53): G é multiplicado por 1e41 em t = 106 e a sopa colapsa num ovo; depois G cai para um décimo em t = 265, 424, 6360 e 6466, enquanto o arrasto é multiplicado por dez em t = 265, 318, 371 e 424. O arrasto quadrático do v1, escalado pela massa, é aproximado por um arrasto linear de magnitude equivalente; o seu ruído aleatório de força não é reproduzido.',
    },
    gravity: {
      name: 'Gravidade',
      description:
        'A gravidade 2D do v1: 10000 corpos (massa 20·U^(1/3)) numa coroa circular em rotação sob gravidade em 1/d (a lei 2D, G = 66.7) colapsam em aglomerados. A rotação rígida com velocidades aleatórias do v1 é substituída por órbitas com a mesma velocidade média; suas cargas minúsculas, a força nuclear fora de alcance e as correções pós-newtonianas/de Lorentz são desprezíveis aqui e foram omitidas.',
    },
    'experiments-4': {
      name: 'Experimentos 4',
      description:
        'O Experimentos 4 do v1, irmão de O Ovo: 9996 quarks coloridos (uud + udd, carga nuclear 10) e elétrons (carga nuclear -10/3) num disco de 2e5 sob o mapa de forças 2 do v1 com um caroço de Yukawa mais largo (b = 0.2), sua força de cor (três vezes mais forte que a de O Ovo), Coulomb em 1/d e gravidade em 1/d, numa caixa de meia-largura 1e6. Roteirizado como no v1 (os tempos são os segundos do v1 × 60): G é multiplicado por 1e41 em t = 120 e a sopa colapsa, G cai para um centésimo em t = 300 e de novo, junto com um arrasto dez vezes maior, em t = 3600, e o arrasto se reduz a um décimo em t = 4200. O arrasto quadrático do v1 (v /= 1 + c·dt·|v|/m) é a configuração quadraticDrag, e a cena roda com o passo de Euler como no v1; o ruído aleatório de força do v1 não é reproduzido.',
    },
    'hexagonal-crystal-quarks': {
      name: 'Cristal hexagonal',
      description:
        'O Cristal hexagonal do v1 com mapa de forças: 96 átomos semelhantes ao carbono (36 quarks coloridos e 48 elétrons cada) nos vértices de uma rede em favo de mel de células de 2 fm, sob o mapa de forças em oito degraus do v1 (f0…f7 sobre oitavos do alcance de 3 fm, valores positivos atraem; editável) e Coulomb, numa caixa de meia-largura 1e5. O arrasto quadrático do v1 (v /= 1 + c·dt·|v|/m) é a configuração quadraticDrag, com c = 1e-3 reduzido para 1e-4 em t = 33. A gravidade (G ≈ 1e-39) é desprezível e foi omitida.',
    },
    air: {
      name: 'Ar',
      description:
        'O ar do modelo de quarks do v1: uma rede 13×13 de átomos em proporção à abundância (143 N, 25 O, 1 Ar); cada átomo tem 3Z quarks up + 3Z down e Z elétrons, unidos pela força nuclear powAXv3 do v1 (atração abaixo de 0.22 do alcance de 3 fm) e Coulomb; cerca de 1% dos núcleos têm carga nuclear negativa, como no v1. A gravidade (G ≈ 7e-39) é desprezível e foi omitida.',
    },
    'water-2': {
      name: 'Água 2',
      description:
        'A água do modelo de quarks do v1: uma rede 12×12 de moléculas de H2O, com o oxigênio formado por 24 quarks up + 24 down com 8 elétrons e cada hidrogênio por um tripleto uud a 2.85 fm de distância a ±30°, com seu elétron em volta, unidos pela força nuclear powAXv3 do v1 e Coulomb. A gravidade (G ≈ 7e-39) é desprezível e foi omitida.',
    },
    'essential-elements': {
      name: 'Elementos essenciais',
      description:
        'A mistura de elementos da vida do modelo de quarks do v1, espalhados ao acaso (192 H, 47 N, 55 C, 20 O, 2 Mg, 1 Fe, 4 Zn, 3 Cu); 26 deles são antimatéria (cargas e carga nuclear invertidas). Cada átomo tem 3Z quarks up + 3Z down e Z elétrons sob a força nuclear powAXv2 do v1 e Coulomb. A gravidade (G ≈ 7e-39) é desprezível e foi omitida.',
    },
    'periodic-table': {
      name: 'Tabela periódica',
      description:
        'O modelo elétron-próton-nêutron do v1: elementos de Z = 1 a 64 numa grade 8×8, cada um com Z prótons + Z nêutrons e Z elétrons, unidos pela força nuclear powAXv3 do v1 (carga nuclear 1 para núcleons, -1/3 para elétrons) e Coulomb. A gravidade (G ≈ 7e-39) é desprezível e foi omitida.',
    },
    'hexagonal-crystal': {
      name: 'Cristal hexagonal',
      description:
        'O Cristal hexagonal do v1 (Experimentos 1): 448 átomos neutros (6 quarks up + 6 down, 2 elétrons) nos vértices de uma rede em favo de mel, com carga nuclear alternando ±1 em volta de cada hexágono, sob a força nuclear powAX do v1 (atração abaixo de 0.25 do alcance de 1000, repulsão além) e Coulomb, dentro de um círculo refletor de raio 5e4. A gravidade (G = 1e-3) é desprezível e foi omitida.',
    },
    'tetragonal-crystal': {
      name: 'Cristal tetragonal',
      description:
        'O Cristal tetragonal do v1: uma rede quadrada 25×25 (espaçamento 500) de átomos neutros (6 quarks up + 6 down, 2 elétrons), com carga nuclear ±1 em tabuleiro de xadrez, sob a força nuclear powAX do v1 (alcance 1000) e Coulomb, dentro de um círculo refletor de raio 5e4. A gravidade (G = 1e-3) é desprezível e foi omitida.',
    },
    hydrogen: {
      name: 'Hidrogênio',
      description:
        'O primeiro átomo do v1: um próton e um nêutron unidos pelo mapa de forças 2 do v1 (atração dentro de ~52, repulsão daí até 200) e um elétron preso por Coulomb em 1/d. O v1 dava ao elétron uma velocidade tangencial de 16 com sentido aleatório; aqui ele começa numa órbita com essa velocidade no meio do seu anel. A gravidade (G = 1e-6) é desprezível e foi omitida.',
    },
    helium: {
      name: 'Hélio',
      description:
        'O hélio do v1: dois prótons e dois nêutrons unidos pelo mapa de forças 2 do v1 contra a repulsão de Coulomb em 1/d entre eles, com dois elétrons em volta. O v1 dava aos elétrons uma velocidade tangencial de 16 com sentido aleatório; aqui eles começam em órbitas com essa velocidade no meio do seu anel. A gravidade (G = 1e-6) é desprezível e foi omitida.',
    },
    water: {
      name: 'Água',
      description:
        'A molécula de água do v1: um átomo de oxigênio (8 prótons, 8 nêutrons, 8 elétrons) entre dois átomos de hidrogênio, com os núcleos unidos pelo mapa de forças 2 do v1 e tudo acoplado por Coulomb em 1/d. O v1 dava a cada elétron uma velocidade tangencial de 16 com sentido aleatório; aqui eles começam em órbitas com essa velocidade no meio do seu anel. A gravidade (G = 1e-6) é desprezível e foi omitida.',
    },
    'super-nucleus-3d': {
      name: 'Supernúcleo 3D',
      description:
        'O Supernúcleo 3D do v1: 10000 partículas compactadas numa bola de raio 1, com massa aleatória (até 256), carga aleatória (até ±16) e carga nuclear ±1, explodem sob Coulomb (k = 0.01) e gravidade (G = 1e-6); depois a força nuclear powAX do v1 (alcance 1e6: cargas nucleares iguais se atraem abaixo de um quarto dele e se repelem além) as reúne num núcleo 3D gigante. O v1 arredondava massas e cargas para inteiros; aqui elas são uniformes.',
    },
    'plasma-ball': {
      name: 'Bola de plasma',
      description:
        'A Bola de plasma do v1: 9999 elétrons (m 0.5) e quarks up e down (m 3 e 6) com carga nuclear ±1 aleatória começam numa bola de raio 1, explodem sob um Coulomb fraco (k = 1/60) e preenchem uma esfera refletora de raio 1e5, onde a força nuclear powAX do v1 (alcance 1e4) e a gravidade (G = 1e-3) os moldam num plasma 3D.',
    },
    'strong-blob': {
      name: 'Aglomerado forte',
      description:
        'O Aglomerado forte 0 do v1 em 3D: 1100 partículas com carga aleatória ±50 e carga nuclear ±1 numa bola de 2000, sob a força nuclear senoidal padrão do v1 (cargas nucleares iguais se atraem dentro da metade do alcance de 2000 e se repelem na metade externa; cargas opostas, o contrário) e um Coulomb fraco em 1/d (k = 1/137). A gravidade (G = 1e-6) é desprezível e foi omitida.',
    },
    'standard-model': {
      name: 'Modelo Padrão',
      description:
        'O Modelo Padrão 3 do v1: 10000 partículas de quatro tipos (semelhante a neutrino com m = 0.01, elétron, quark up e quark down) com carga nuclear ±1 aleatória num disco de 2e4, sob a força nuclear powAX do v1 (atração abaixo de 0.25 do alcance de 1e4, repulsão além) e Coulomb, dentro de um círculo refletor. A gravidade (G = 1e-3) é desprezível e foi omitida.',
    },
    'standard-model-1': {
      name: 'Modelo Padrão 1',
      description:
        'O Modelo Padrão 1 do v1: 9999 elétrons e quarks up e down (m 0.511, 3, 6) com carga nuclear ±1 aleatória começam num disco de raio 1, explodem sob Coulomb (k = 1) e se espalham pelo alcance nuclear powAX do v1, de 1e6, dentro de um círculo refletor de raio 1e7. A gravidade (G = 1e-3) é desprezível e foi omitida.',
    },
    'wild-particles': {
      name: 'Partículas selvagens',
      description:
        'As Partículas selvagens do v1: 10000 partículas de cinco tipos (neutras sem massa e com m 0.01, elétrons, quarks up e down com cargas -1, 2/3, -1/3) e carga nuclear ±1 aleatória começam num disco de raio 100; então a força nuclear senoidal do v1 (alcance 1e4), Coulomb (k = 0.01) e a gravidade (G = 1e-3) as arremessam por um círculo refletor de raio 5e5. O v1 dava às partículas sem massa inércia unitária e nenhuma gravidade; aqui elas têm massa 1.',
    },
    'planetoid-formation': {
      name: 'Formação de planetoides',
      description:
        'A cena de gravação do v1 (comentada no v1): 382 pixels de texto, cada um deles um par de núcleons semelhante a um dêuteron (12 quarks) com quatro elétrons, sob o mapa de forças em degrau do v1 (atração dentro da metade do alcance de 3 fm, repulsão fora), Coulomb em 1/d e uma gravidade forte em 1/d que colapsa o texto em planetoides. O v1 amortecia as velocidades por exp(-c·dt/m); aqui o arrasto é c dividido pela massa média dos quarks (8). Roteirizado como no v1 (os tempos são os segundos do v1 × 60, os arrastos são o seu c / 8): o arrasto cai em t = 180 e volta a subir a partir de t = 4320, a gravidade dobra quatro vezes a partir de t = 5400 e volta a cair pela metade a partir de t = 7560, e então a câmera se afasta em t = 9000.',
    },
    'hexagon-1': {
      name: 'Hexágono 1',
      description:
        'O Hexágono 1 do v1: uma rede em favo de mel de 412 núcleos minúsculos (4 quarks up + 2 down, carga nuclear alternando ±1 em volta de cada hexágono), inclinada 20°, unida pela força nuclear senoidal do v1 (alcance 500) contra Coulomb (k = 1/60). Três fileiras de 500 elétrons com carga nuclear alternada chegam voando pela esquerda à velocidade 200 e atingem a rede a partir de t ≈ 75. A gravidade (G = 1e-6) é desprezível e foi omitida.',
    },
    'hexagon-2': {
      name: 'Hexágono 2',
      description:
        'O Hexágono 2 do v1: dois cristais em favo de mel de 240 átomos cada (6 quarks up + 6 down e 2 elétrons, carga nuclear alternando ±1 em volta de cada hexágono) colidem de frente com velocidade de aproximação 4, sob a força nuclear senoidal do v1 (alcance 500) e Coulomb (k = 1/60), dentro de uma esfera de raio 1e5 que, no ricochete, mantém metade da velocidade normal. A gravidade (G = 1e-3) é desprezível aqui e foi omitida.',
    },
    'hexagon-3': {
      name: 'Hexágono 3',
      description:
        'O Hexágono 3 do v1: uma rede em favo de mel inclinada de 466 núcleos (6 quarks up + 6 down, carga nuclear alternando ±1 em volta de cada hexágono) sob a força nuclear senoidal do v1 (alcance 500) e Coulomb (k = 1/60), alvejada por um feixe de 1230 elétrons em 500 pacotes que vêm voando pela esquerda à velocidade 250 (chegam a partir de t ≈ 60). A gravidade (G = 1e-6) é desprezível e foi omitida.',
    },
    terrarium: {
      name: 'Terrário',
      description:
        'O Terrário do v1: 10000 partículas de cinco tipos (duas neutras leves e elétrons, quarks up e quarks down pesados, de massa 511, 3000, 6000 e cargas -1, 2/3, -1/3) e carga nuclear ±1 aleatória começam num disco de raio 1, explodem sob Coulomb (k = 1) e vivem num círculo refletor de raio 1e6, o tamanho do alcance nuclear senoidal do v1, de modo que todo par a sente. Sem gravidade, como no v1; o tipo sem massa do v1 recebe massa 1 (sua inércia unitária).',
    },
    sandbox: {
      name: 'Sandbox',
      description: 'Espaço vazio com gravidade e Coulomb. Pressione G para gerar partículas.',
    },
  },
};
