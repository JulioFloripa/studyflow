# Sistema Educacional Completo - Study Cycle Wizard

## 🎯 Visão Geral

Este sistema adiciona funcionalidades avançadas de gestão educacional ao Study Cycle Wizard, permitindo que coordenadores e professores gerenciem múltiplos alunos com perfis pedagógicos completos e grades horárias personalizadas.

## ✨ Novas Funcionalidades

### 1. 📚 Gestão de Turmas
- Criar e organizar turmas por ano/semestre
- Vincular alunos a turmas específicas
- Visualizar estatísticas por turma

**Acesso:** Menu lateral → **Turmas**

### 2. 👥 Gestão de Alunos
- Cadastro completo com dados pessoais, acadêmicos e pedagógicos
- Perfil detalhado de cada aluno
- Grade horária visual personalizada

**Acesso:** Menu lateral → **Alunos**

#### Dados Coletados:
- **Pessoais:** Nome, email, telefone, data de nascimento
- **Acadêmicos:** Carreira pretendida, universidade alvo, série atual
- **Pedagógicos:** 
  - Ritmo de aprendizagem (lento, moderado, rápido)
  - Métodos de estudo preferidos (Pomodoro, Mapas Mentais, Flashcards, etc.)
  - Necessidades especiais
  - Observações gerais

### 3. 📅 Grade Horária Visual (30min)
- Interface tipo calendário semanal
- Blocos de 30 minutos (6h às 22h30)
- 3 status: **Livre** (verde), **Ocupado** (vermelho), **Personalizado** (azul)
- Click para alternar entre status
- Personalização de blocos: "Aula de Piano", "Academia", "Almoço", etc.
- **Preenchimento em Lote:** Preencher rapidamente horários fixos (ex: aulas seg-sex 7h-12h)

**Como usar:**
1. Selecione um aluno na lista
2. Vá para aba "Grade Horária"
3. Clique nos blocos para alternar status
4. Use "Preencher em Lote" para horários fixos

### 4. 🎓 Preset GAC 2025 - Biologia
- Estrutura completa do curso Fleming PV RS-SC
- 9 disciplinas organizadas (Frentes A e B)
- 60+ tópicos de Biologia
- Cronograma de fevereiro a outubro

**Como importar:**
1. Vá em **Plano de Estudos**
2. Clique em "Importar Preset"
3. Selecione "GAC 2025 - Biologia Pré-Vestibular"

## 🚀 Como Começar

### Passo 1: Aplicar Migração do Banco
⚠️ **OBRIGATÓRIO** antes de usar as novas funcionalidades

Siga as instruções em: `MIGRATION_INSTRUCTIONS.md`

### Passo 2: Criar Turmas
1. Acesse **Turmas** no menu
2. Clique em "Nova Turma"
3. Preencha nome, ano, semestre
4. Salve

### Passo 3: Cadastrar Alunos
1. Acesse **Alunos** no menu
2. Clique em "Novo Aluno"
3. Preencha as 3 abas:
   - **Pessoal:** Dados básicos
   - **Acadêmico:** Objetivos e carreira
   - **Pedagógico:** Perfil de aprendizagem
4. Salve

### Passo 4: Configurar Grade Horária
1. Selecione um aluno na lista
2. Vá para aba "Grade Horária"
3. Use "Preencher em Lote" para horários de aula:
   - Dias: Segunda a Sexta
   - Horário: 07:00 às 12:00
   - Status: Ocupado
   - Descrição: "Aula"
4. Personalize blocos individuais conforme necessário

### Passo 5: Gerar Ciclo de Estudos
(Em desenvolvimento - próxima fase)

## 📊 Métodos de Estudo Disponíveis

O sistema reconhece e orienta sobre:

- **Técnica Pomodoro:** Blocos de 25min + pausas
- **Repetição Espaçada:** Revisões programadas
- **Mapas Mentais:** Organização visual
- **Flashcards:** Memorização ativa
- **Recordação Ativa:** Testar sem consultar
- **Técnica Feynman:** Explicar para aprender
- **Notas Cornell:** Sistema estruturado
- **Resumos:** Síntese de conteúdo
- **Testes Práticos:** Simulados e exercícios

## 🎨 Interface

### Cores da Grade Horária
- 🟢 **Verde:** Horário livre para estudos
- 🔴 **Vermelho:** Horário ocupado (genérico)
- 🔵 **Azul:** Horário personalizado (com descrição)

### Navegação
- **Desktop:** Menu lateral esquerdo
- **Mobile:** Menu inferior (bottom nav)

## 🔒 Segurança

- **RLS (Row Level Security)** ativado em todas as tabelas
- Coordenadores só acessam seus próprios alunos
- Alunos só veem seus próprios dados
- Políticas de acesso granulares

## 📝 Próximas Funcionalidades (Roadmap)

1. **Gerador de Ciclo Inteligente**
   - Usa apenas horários livres da grade
   - Distribui disciplinas por prioridade
   - Respeita ritmo de aprendizagem do aluno

2. **Relatório PDF Imprimível**
   - Grade horária semanal visual
   - Lista de tópicos por disciplina
   - Orientações personalizadas de estudo
   - Metas e objetivos

3. **Questionário VARK**
   - Identifica estilo de aprendizagem
   - Gera orientações personalizadas

4. **Dashboard do Coordenador**
   - Visão geral de todas as turmas
   - Estatísticas de progresso
   - Alertas de alunos com dificuldades

## 🛠️ Tecnologias

- **Frontend:** React + TypeScript + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Componentes:** shadcn/ui
- **Roteamento:** React Router
- **Estado:** Context API

## 📦 Estrutura de Arquivos

```
src/
├── components/
│   └── TimeGridEditor.tsx          # Grade horária visual
├── contexts/
│   ├── StudyContext.tsx            # Estado de estudos (original)
│   └── EducationalContext.tsx      # Estado educacional (novo)
├── pages/
│   ├── Classes.tsx                 # Gestão de turmas
│   └── Students.tsx                # Gestão de alunos
├── types/
│   ├── study.ts                    # Tipos originais
│   └── educational.ts              # Tipos educacionais (novo)
└── data/
    ├── presetExams.ts              # Presets de exames
    └── presetGAC2025.ts            # Preset GAC 2025 (novo)

supabase/
└── migrations/
    └── 20260220000000_educational_system.sql  # Migração completa
```

## 🤝 Contribuindo

Para adicionar novos presets de cursos:

1. Crie arquivo em `src/data/presetNOME.ts`
2. Siga a estrutura do `presetGAC2025.ts`
3. Importe e adicione ao array em `presetExams.ts`

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique se a migração foi aplicada corretamente
2. Consulte o console do navegador para erros
3. Verifique as políticas RLS no Supabase

---

**Versão:** 2.0.0  
**Data:** 20/02/2026  
**Autor:** Manus AI
