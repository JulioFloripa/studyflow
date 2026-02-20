# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [2.1.0] - 2026-02-20

### 🎓 Sistema Educacional Completo - Modo Coordenador

#### Adicionado

##### Gestão de Turmas
- Nova página `/turmas` para gerenciamento de turmas
- CRUD completo: criar, editar, excluir turmas
- Organização por ano e semestre
- Contagem automática de alunos por turma
- Interface com cards responsivos

##### Gestão de Alunos
- Nova página `/alunos` para gerenciamento de alunos
- Cadastro completo em 3 categorias:
  - **Pessoal**: nome, email, telefone, data de nascimento
  - **Acadêmico**: carreira pretendida, universidade alvo, série atual
  - **Pedagógico**: ritmo de aprendizagem, métodos de estudo, necessidades especiais
- Interface com abas para organização
- Seleção múltipla de métodos de estudo
- Visualização de perfil completo

##### Grade Horária Visual
- Componente `TimeGridEditor` com calendário semanal
- Blocos de 30 minutos (6h às 22h30)
- 3 status clicáveis:
  - **Livre** (verde): Disponível para estudos
  - **Ocupado** (vermelho): Horário ocupado genérico
  - **Personalizado** (azul): Com descrição customizada
- Personalização de blocos individuais com descrição e cor
- Preenchimento em lote para horários fixos
  - Exemplo: preencher seg-sex 7h-12h como "Aula" automaticamente
- Integração com perfil do aluno

##### Gerador de Ciclo Inteligente
- Novo utilitário `cycleGenerator.ts`
- Análise de horários livres na grade
- Agrupamento de slots consecutivos
- Distribuição por prioridade de disciplinas
- Geração de recomendações personalizadas baseadas em:
  - Ritmo de aprendizagem do aluno
  - Métodos de estudo preferidos
  - Carga horária disponível
- Alocação inteligente de sessões de estudo

##### Sistema de Relatórios
- Nova página `/ciclo-aluno` para visualização e geração
- Gerador de HTML estilizado (`pdfGenerator.ts`)
- Relatório inclui:
  - Informações completas do aluno
  - Resumo executivo (horas, sessões, disciplinas)
  - Distribuição visual por disciplina com barras de progresso
  - Cronograma semanal detalhado
  - Recomendações personalizadas
- Download como HTML (imprimível como PDF pelo navegador)
- Design profissional com gradientes e cores

##### Preset GAC 2025
- Novo preset `presetGAC2025.ts`
- Estrutura completa do curso Fleming PV RS-SC
- 9 disciplinas organizadas:
  - Frente A: Fundamentos, Classificação, Botânica, Zoologia
  - Frente B: Citologia/Genética, Bioenergética, Fisiologia I e II, Ecologia
- 60+ tópicos de Biologia
- Cronograma de fevereiro a outubro

##### Banco de Dados
- 5 novas tabelas criadas:
  - `classes`: Turmas gerenciadas por coordenadores
  - `students`: Alunos com dados completos
  - `time_grid`: Grade horária visual de 30min
  - `custom_cycles`: Ciclos personalizados gerados
  - `generated_reports`: Relatórios em PDF gerados
- Políticas RLS (Row Level Security) configuradas
- Função `initialize_time_grid()` para criar grade automaticamente
- Triggers para atualização automática de `updated_at`
- Índices otimizados para performance

##### Tipos TypeScript
- Novo arquivo `educational.ts` com interfaces completas:
  - `Class`, `Student`, `TimeSlot`, `CustomCycle`, `GeneratedReport`
  - Enums: `StudyMethod`, `LearningPace`, `TimeSlotStatus`
  - Constantes: `TIME_SLOTS`, `DAY_LABELS`, `STUDY_METHOD_LABELS`

##### Contexto e Estado
- Novo `EducationalContext` para gestão de estado educacional
- Métodos para CRUD de turmas, alunos e grade horária
- Integração com `StudyContext` existente
- Carregamento automático de dados relacionados

##### Navegação
- 3 novos links no menu:
  - **Turmas** (ícone School)
  - **Alunos** (ícone Users)
  - **Ciclo do Aluno** (ícone CalendarCheck)
- Rotas configuradas no App.tsx
- Integração com layout responsivo

##### Documentação
- `EDUCATIONAL_SYSTEM_README.md`: Guia completo do sistema
- `MIGRATION_INSTRUCTIONS.md`: Instruções detalhadas de migração
- `CHANGELOG.md`: Este arquivo
- Comentários extensivos no código SQL
- JSDoc em funções TypeScript

#### Modificado
- `App.tsx`: Adicionado `EducationalProvider` e novas rotas
- `Layout.tsx`: Adicionados novos ícones e links de navegação
- `presetExams.ts`: Importação do preset GAC 2025

#### Arquivos Criados
- `src/components/TimeGridEditor.tsx` (280 linhas)
- `src/contexts/EducationalContext.tsx` (320 linhas)
- `src/pages/Classes.tsx` (180 linhas)
- `src/pages/Students.tsx` (380 linhas)
- `src/pages/StudentCycle.tsx` (260 linhas)
- `src/types/educational.ts` (150 linhas)
- `src/lib/cycleGenerator.ts` (280 linhas)
- `src/lib/pdfGenerator.ts` (420 linhas)
- `src/data/presetGAC2025.ts` (140 linhas)
- `supabase/migrations/20260220000000_educational_system.sql` (340 linhas)
- `EDUCATIONAL_SYSTEM_README.md`
- `MIGRATION_INSTRUCTIONS.md`
- `CHANGELOG.md`
- `apply_migration.py`

#### Segurança
- RLS ativado em todas as novas tabelas
- Coordenadores só acessam seus próprios alunos
- Alunos só veem seus próprios dados
- Políticas granulares por operação (SELECT, INSERT, UPDATE, DELETE)

#### Performance
- Índices criados em chaves estrangeiras
- Queries otimizadas com `select('*')`
- Carregamento lazy de grade horária
- Agrupamento eficiente de slots consecutivos

#### UX/UI
- Design consistente com shadcn/ui
- Responsivo para desktop, tablet e mobile
- Feedback visual em todas as ações
- Toasts informativos
- Loading states em operações assíncronas
- Confirmações para ações destrutivas

---

## [2.0.0] - 2026-02-19

### Adicionado
- Sistema de sugestões inteligentes
- Gamificação completa com níveis e badges
- Revisões espaçadas adaptativas
- Dashboard com métricas e gráficos
- Análise de dificuldades

### Modificado
- Refatoração do StudyContext
- Melhorias na UI/UX geral
- Otimização de queries

---

## [1.0.0] - 2026-01-15

### Adicionado
- Versão inicial do Study Cycle Wizard
- Gestão de disciplinas e tópicos
- Registro de sessões de estudo
- Planejamento de ciclos
- Autenticação com Supabase
