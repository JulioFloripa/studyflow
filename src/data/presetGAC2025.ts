import { PresetExam } from '@/types/study';

/**
 * Preset GAC 2025 - Pré-Vestibular
 * Baseado na ementa oficial do curso Fleming para as regiões PV RS-SC
 * Estrutura de estudos semana a semana de Biologia, Física e Química (Frentes A e B)
 */
export const presetGAC2025: PresetExam = {
  id: 'gac-2025',
  name: 'GAC 2025 - Fleming Pré-Vestibular',
  description: 'Guia de Andamento do Curso 2025 - Fleming (RS e SC) - Conteúdo programático completo de Biologia, Física e Química',
  subjects: [
    // ==================== BIOLOGIA ====================
    {
      name: 'Biologia',
      priority: 5,
      topics: [
        // FRENTE A - Livro 1
        'Organização e características dos seres vivos',
        'Composição química dos seres vivos',
        'Código Genético e Síntese Proteica',
        'Origem da vida e Evolução',
        // FRENTE A - Livro 2
        'Classificação dos seres vivos',
        'Vírus e Bacteriófagos',
        'Procariontes e Bacterioses',
        'Reino Protoctista',
        'Reino Fungi',
        // FRENTE A - Livro 3
        'Reino Vegetal I e II',
        'Histologia e Fisiologia Vegetal',
        'Organografia vegetal',
        'Reino Animal I: Poríferos e Cnidários',
        'Reino Animal II: Platelmintos e nematelmíntos',
        // FRENTE A - Livro 4
        'Moluscos e Anelídeos',
        'Artrópodes',
        'Equinodermos e Cordados I',
        'Cordados II: Agnatos, Condríctes e Osteíctes',
        'Anfíbios e Répteis',
        'Aves e Mamíferos',
        // FRENTE B - Livro 1
        'Núcleo Interfásico e Ploidia Celular',
        'Ciclo celular e divisões celulares',
        'Genética I e II',
        'Herança Sexual',
        'Genes Ligados',
        'Mutações cromossômicas',
        // FRENTE B - Livro 2
        'Citologia',
        'Bioenergética',
        'Reprodução animal e gametogênese',
        'Embriologia animal',
        'Tecido Epitelial',
        'Tecidos conjuntivos',
        'Tecido muscular e tecido nervoso',
        // FRENTE B - Livro 3
        'Sistema Digestório',
        'Sistema Cardiovascular e Linfático',
        'Sistema Imunológico e Respiratório',
        'Sistema Excretor',
        'Sistema endócrino e reprodutor',
        'Sistema nervoso',
        'Sistema sensorial',
        // FRENTE B - Livro 4
        'Introdução à ecologia',
        'Dinâmica de populações e relações ecológicas',
        'Sucessão ecológica e biogeografia',
        'Ciclos biogeoquímicos',
        'Influência antrópica nos ecossistemas',
        'Biotecnologia',
      ],
    },
    // ==================== FÍSICA ====================
    {
      name: 'Física',
      priority: 5,
      topics: [
        // FRENTE A - Livro 1
        'Ondulatória - Classificação das Ondas',
        'Ondulatória - Espectro Eletromagnético',
        'Ondulatória - Fenômenos Ondulatórios',
        'Ondulatória - Acústica',
        // FRENTE A - Livro 2
        'Hidrostática - Conceitos Básicos',
        'Hidrostática - Teorema e Princípios',
        'Hidrodinâmica',
        'Cinemática - Conceitos Básicos e Movimentos Retilíneos',
        // FRENTE A - Livro 3
        'Cinemática - Movimentos Curvilíneos',
        'Estática dos Sólidos',
        'Movimento Harmônico Simples',
        'Eletrostática - Cargas elétricas',
        'Eletrostática - Campos Elétricos',
        'Eletrostática - Potencial Elétrico',
        // FRENTE A - Livro 4
        'Eletrodinâmica - Corrente e Resistência',
        'Eletrodinâmica - Circuitos Elétricos',
        'Eletrodinâmica - Capacitores',
        'Física Moderna - Noções de Física Nuclear',
        // FRENTE B - Livro 1
        'Óptica Geométrica - Fundamentos, Reflexão da Luz e Espelhos Planos',
        'Óptica Geométrica - Reflexão nos Espelhos Esféricos',
        'Óptica Geométrica - Refração da Luz',
        'Óptica Geométrica - Lentes Esféricas Delgadas',
        // FRENTE B - Livro 2
        'Termologia - Termometria e Dilatação Térmica',
        'Termologia - Calorimetria',
        'Termodinâmica - Gases ideais e 1ª Lei',
        'Termodinâmica - Máquinas térmicas e 2ª Lei',
        // FRENTE B - Livro 3
        'Dinâmica - Leis de Newton',
        'Dinâmica - Trabalho Mecânico, Potência e Energia Mecânica',
        'Dinâmica - Quantidade de Movimento Linear e Impulso',
        'Dinâmica - Gravitação Universal',
        // FRENTE B - Livro 4
        'Magnetismo',
        'Eletromagnetismo - Campo Magnético gerado por Corrente Elétrica',
        'Eletromagnetismo - Força Magnética',
        'Eletromagnetismo - Indução Eletromagnética',
        'Física Moderna - Noções de Física Quântica',
        'Física Moderna - Teoria da Relatividade Restrita',
      ],
    },
    // ==================== QUÍMICA ====================
    {
      name: 'Química',
      priority: 5,
      topics: [
        // FRENTE A - Livro 1
        'Estrutura Atômica I',
        'Estrutura Atômica II',
        'Tabela Periódica',
        'Ligações Químicas I e II',
        'Geometria Molecular',
        // FRENTE A - Livro 2
        'Forças Intermoleculares',
        'Ácidos',
        'Bases',
        'Sais',
        'Óxidos',
        'Teorias Modernas de ácido-base',
        'Reações Inorgânicas',
        // FRENTE A - Livro 3
        'Cálculos Químicos',
        'Gases',
        'Termoquímica',
        'Soluções',
        'Propriedades Coligativas',
        // FRENTE A - Livro 4
        'Cinética Química',
        'Equilíbrio Químico',
        'Deslocamento do Equilíbrio',
        'Equilíbrio Iônico (ácido, base, sal e água)',
        // FRENTE B - Livro 1
        'Propriedades da Matéria',
        'Substâncias e misturas',
        'Soluções, Suspesões e Coloides',
        'Separações de misturas',
        'Polaridade',
        'Polaridade em Compostos Orgânicos',
        // FRENTE B - Livro 2
        'Introdução à Química Orgânica',
        'Hidrocarbonetos',
        'Funções Oxigenadas I e II',
        'Funções Nitrogenadas e especiais',
        'Reconhecimento das funções orgânicas',
        // FRENTE B - Livro 3
        'Isomeria Constitucional',
        'Isomeria Espacial',
        'Reações Orgânicas I, II e III',
        // FRENTE B - Livro 4
        'Eletroquímica',
        'Radioatividade',
        'Polímeros',
        'Bioquímica',
      ],
    },
  ],
};
