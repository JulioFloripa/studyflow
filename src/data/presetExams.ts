import { PresetExam } from '@/types/study';

export const presetExams: PresetExam[] = [
  {
    id: 'enem',
    name: 'ENEM',
    description: 'Exame Nacional do Ensino Médio — todas as áreas do conhecimento',
    subjects: [
      {
        name: 'Matemática',
        priority: 5,
        topics: [
          'Funções e Gráficos', 'Geometria Plana', 'Geometria Espacial',
          'Probabilidade e Estatística', 'Porcentagem e Juros',
          'Equações e Inequações', 'Progressões (PA e PG)', 'Trigonometria',
          'Análise Combinatória', 'Matrizes e Determinantes',
        ],
      },
      {
        name: 'Linguagens e Códigos',
        priority: 4,
        topics: [
          'Interpretação de Texto', 'Gramática', 'Literatura Brasileira',
          'Figuras de Linguagem', 'Gêneros Textuais', 'Variação Linguística',
          'Funções da Linguagem', 'Redação (Dissertativa-Argumentativa)',
        ],
      },
      {
        name: 'Ciências da Natureza',
        priority: 4,
        topics: [
          'Mecânica', 'Termodinâmica', 'Óptica e Ondas', 'Eletricidade',
          'Química Orgânica', 'Estequiometria', 'Soluções e Concentração',
          'Eletroquímica', 'Genética', 'Ecologia', 'Evolução',
          'Bioquímica e Citologia',
        ],
      },
      {
        name: 'Ciências Humanas',
        priority: 3,
        topics: [
          'História do Brasil Colonial', 'Brasil Império e República',
          'Revolução Industrial', 'Guerras Mundiais', 'Guerra Fria',
          'Geografia do Brasil', 'Geopolítica', 'Urbanização',
          'Filosofia Antiga e Moderna', 'Sociologia Clássica',
        ],
      },
    ],
  },
  {
    id: 'concurso-pf',
    name: 'Concurso Público - Polícia Federal',
    description: 'Agente e Escrivão da Polícia Federal — disciplinas essenciais',
    subjects: [
      {
        name: 'Direito Constitucional',
        priority: 5,
        topics: [
          'Princípios Fundamentais', 'Direitos e Garantias Fundamentais',
          'Organização do Estado', 'Poder Executivo, Legislativo e Judiciário',
          'Controle de Constitucionalidade', 'Segurança Pública',
        ],
      },
      {
        name: 'Direito Administrativo',
        priority: 4,
        topics: [
          'Princípios da Administração', 'Atos Administrativos',
          'Licitação e Contratos', 'Servidores Públicos',
          'Responsabilidade Civil do Estado', 'Processo Administrativo',
        ],
      },
      {
        name: 'Direito Penal',
        priority: 4,
        topics: [
          'Teoria do Crime', 'Crimes contra a Pessoa',
          'Crimes contra o Patrimônio', 'Crimes contra a Administração',
          'Lei de Drogas', 'Legislação Penal Especial',
        ],
      },
      {
        name: 'Português',
        priority: 3,
        topics: [
          'Compreensão e Interpretação', 'Ortografia e Acentuação',
          'Sintaxe', 'Concordância e Regência', 'Pontuação', 'Redação Oficial',
        ],
      },
      {
        name: 'Raciocínio Lógico',
        priority: 3,
        topics: [
          'Proposições e Conectivos', 'Tabelas-Verdade', 'Argumentação Lógica',
          'Diagramas Lógicos', 'Sequências e Padrões',
        ],
      },
      {
        name: 'Informática',
        priority: 2,
        topics: [
          'Sistemas Operacionais', 'Redes de Computadores',
          'Segurança da Informação', 'Banco de Dados', 'Conceitos de Internet',
        ],
      },
    ],
  },
];
