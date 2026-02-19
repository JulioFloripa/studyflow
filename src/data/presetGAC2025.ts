import { PresetExam } from '@/types/study';

/**
 * Preset GAC 2025 - Pré-Vestibular
 * Baseado na ementa oficial do curso Fleming para as regiões PV RS-SC
 * Estrutura de estudos semana a semana de Biologia (Frentes A e B)
 */
export const presetGAC2025: PresetExam = {
  id: 'gac-2025-biologia',
  name: 'GAC 2025 - Biologia Pré-Vestibular',
  description: 'Curso preparatório completo de Biologia para vestibulares (Fleming PV RS-SC) — Frentes A e B com cronograma de fevereiro a outubro',
  subjects: [
    {
      name: 'Biologia - Frente A: Fundamentos e Evolução',
      priority: 5,
      topics: [
        // Livro 1 - Semanas 1-9
        'Organização e Características dos Seres Vivos',
        'Composição Química: Água e Sais Minerais',
        'Composição Química: Proteínas e Enzimas',
        'Composição Química: Carboidratos e Lipídios',
        'Código Genético e Síntese Proteica',
        'Replicação, Transcrição e Tradução',
        'Origem da Vida e Teorias Evolutivas',
        'Mecanismos Evolutivos e Especiação',
      ],
    },
    {
      name: 'Biologia - Frente A: Classificação e Microbiologia',
      priority: 5,
      topics: [
        // Livro 2 - Semanas 10-18
        'Classificação dos Seres Vivos e Taxonomia',
        'Vírus: Estrutura e Ciclo de Vida',
        'Bactérias e Bacterioses',
        'Reino Protoctista: Algas e Protozoários',
        'Reino Fungi: Estrutura e Reprodução',
      ],
    },
    {
      name: 'Biologia - Frente A: Botânica',
      priority: 4,
      topics: [
        // Livro 3 - Semanas 19-28
        'Reino Vegetal I: Briófitas e Pteridófitas',
        'Reino Vegetal II: Gimnospermas e Angiospermas',
        'Histologia Vegetal: Meristemas e Tecidos',
        'Fisiologia Vegetal: Fotossíntese e Transporte',
        'Hormônios Vegetais e Tropismos',
        'Organografia Vegetal: Raiz, Caule e Folha',
        'Reprodução Vegetal: Flores, Frutos e Sementes',
      ],
    },
    {
      name: 'Biologia - Frente A: Zoologia',
      priority: 4,
      topics: [
        // Livro 3-4 - Semanas 27-36
        'Poríferos e Cnidários',
        'Platelmintos e Nematelmintos',
        'Moluscos e Anelídeos',
        'Artrópodes: Insetos, Aracnídeos e Crustáceos',
        'Equinodermos',
        'Cordados I: Peixes (Agnatos, Condrictes, Osteíctes)',
        'Cordados II: Anfíbios e Répteis',
        'Cordados III: Aves e Mamíferos',
      ],
    },
    {
      name: 'Biologia - Frente B: Citologia e Genética',
      priority: 5,
      topics: [
        // Livro 1 - Semanas 1-9
        'Núcleo Interfásico e Ploidia Celular',
        'Ciclo Celular: Mitose e Meiose',
        'Genética I: Leis de Mendel',
        'Genética II: Polialelia, Epistasia e Genes Múltiplos',
        'Herança Sexual e Cromossomos Sexuais',
        'Genes Ligados e Recombinação Gênica',
        'Mutações Cromossômicas e Síndromes',
      ],
    },
    {
      name: 'Biologia - Frente B: Citologia e Bioenergética',
      priority: 5,
      topics: [
        // Livro 2 - Semanas 10-18
        'Citologia: Organelas e Funções Celulares',
        'Membrana Plasmática e Transporte',
        'Bioenergética: Fotossíntese',
        'Bioenergética: Respiração Celular e Fermentação',
        'Reprodução Animal e Gametogênese',
        'Embriologia Animal: Segmentação e Gastrulação',
        'Tecido Epitelial',
        'Tecidos Conjuntivos: Adiposo, Ósseo e Cartilaginoso',
        'Tecido Muscular e Tecido Nervoso',
      ],
    },
    {
      name: 'Biologia - Frente B: Fisiologia Humana I',
      priority: 4,
      topics: [
        // Livro 3 - Semanas 16-28
        'Sistema Digestório',
        'Sistema Cardiovascular e Circulação',
        'Sistema Linfático',
        'Sistema Imunológico: Imunidade Inata e Adaptativa',
        'Sistema Respiratório e Trocas Gasosas',
        'Sistema Excretor: Rins e Néfrons',
      ],
    },
    {
      name: 'Biologia - Frente B: Fisiologia Humana II',
      priority: 4,
      topics: [
        // Livro 3 - Semanas 20-27
        'Sistema Endócrino: Glândulas e Hormônios',
        'Sistema Reprodutor e Ciclo Menstrual',
        'Sistema Nervoso: Central e Periférico',
        'Sistema Sensorial: Visão, Audição e Outros Sentidos',
      ],
    },
    {
      name: 'Biologia - Frente B: Ecologia e Biotecnologia',
      priority: 4,
      topics: [
        // Livro 4 - Semanas 27-36
        'Introdução à Ecologia: População e Comunidade',
        'Dinâmica de Populações e Relações Ecológicas',
        'Sucessão Ecológica e Biogeografia',
        'Biomas Terrestres e Aquáticos',
        'Ciclos Biogeoquímicos: Carbono, Nitrogênio e Água',
        'Influência Antrópica e Problemas Ambientais',
        'Biotecnologia: Engenharia Genética e Transgênicos',
        'Biotecnologia: Aplicações Médicas e Terapia Gênica',
      ],
    },
  ],
};
