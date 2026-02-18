# Study Cycle Wizard 🎓

Uma aplicação web inteligente para organização de estudos, planejamento estratégico e análise de desempenho para concurseiros e estudantes.

## 🚀 Funcionalidades

### ✅ Implementadas

- **Dashboard Inteligente**: Visão completa do progresso com métricas semanais, gráficos e insights
- **Sugestões Inteligentes**: Sistema que recomenda automaticamente o que estudar agora baseado em:
  - Revisões atrasadas e agendadas
  - Desempenho em cada tópico
  - Ciclo de estudos planejado
  - Prioridade das disciplinas
- **Gamificação Completa**:
  - Sistema de níveis e XP (1 minuto = 1 XP)
  - Streaks de dias consecutivos estudando
  - 10+ conquistas (badges) desbloqueáveis
  - Página dedicada de conquistas e estatísticas
- **Revisões Espaçadas Adaptativas**:
  - Agendamento automático de revisões (D1, D7, D30)
  - Feedback de facilidade (1-5 estrelas)
  - Algoritmo que ajusta intervalos baseado no desempenho
  - Próxima revisão agendada automaticamente
- **Gestão de Disciplinas e Tópicos**:
  - CRUD completo com cores e prioridades
  - Status de progresso (não iniciado, em andamento, concluído)
  - Importação de presets (ENEM, OAB, etc)
- **Registro de Sessões**:
  - Tempo estudado, questões, páginas, vídeos
  - Anotações por sessão
  - Atualização automática de status dos tópicos
- **Planejamento Automático**:
  - Geração de ciclos de estudo baseados em prioridades
  - Distribuição de tempo por disciplina
  - Sequência otimizada de estudos
- **Análise de Dificuldades**:
  - Ranking de tópicos por taxa de acerto
  - Identificação de assuntos críticos (<70%)
  - Sugestões de ação por desempenho

### 🎯 Melhorias Recentes (v2.0)

1. **Sistema de Sugestões Inteligentes** (`/src/lib/suggestions.ts`)
   - Algoritmo que prioriza revisões atrasadas
   - Identifica tópicos com baixo desempenho
   - Sugere próximo assunto do ciclo
   - Considera disponibilidade e contexto

2. **Gamificação** (`/src/lib/gamification.ts`)
   - Cálculo de nível baseado em horas estudadas
   - Detecção de streaks consecutivos
   - 10 badges desbloqueáveis
   - Página dedicada `/conquistas`

3. **Revisões Adaptativas** (`/src/lib/spacedRepetition.ts`)
   - Algoritmo baseado em SM-2 (Anki-like)
   - Ajuste de intervalos por facilidade
   - Agendamento automático de próximas revisões
   - Diálogo de conclusão com feedback

4. **Componentes Novos**:
   - `NextActionCard`: Card de próxima ação recomendada
   - `GamificationCard`: Card compacto de progresso e badges
   - `ReviewCompletionDialog`: Diálogo para concluir revisões com facilidade

## 🛠️ Stack Tecnológica

- **Frontend**: React 18, TypeScript, Vite
- **UI**: TailwindCSS, shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Gráficos**: Recharts
- **Roteamento**: React Router v6
- **Formulários**: React Hook Form + Zod
- **Estado**: Context API + React Query

## 📦 Instalação

```bash
# Clonar repositório
git clone https://github.com/JulioFloripa/study-cycle-wizard.git
cd study-cycle-wizard

# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Criar arquivo .env com as credenciais do Supabase
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Rodar migrações do Supabase
# Aplicar os arquivos em /supabase/migrations

# Iniciar desenvolvimento
npm run dev
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- `profiles`: Perfil do usuário, metas, disponibilidade, badges desbloqueados
- `subjects`: Disciplinas com prioridade e cor
- `topics`: Tópicos/assuntos de cada disciplina
- `study_sessions`: Sessões de estudo registradas
- `reviews`: Revisões espaçadas agendadas e concluídas
- `study_cycle`: Ciclo de estudos gerado
- `imported_presets`: Controle de presets importados

### Campos Novos (v2.0)

- `profiles.unlocked_badges`: Array de IDs de badges desbloqueados
- `reviews.ease_factor`: Facilidade da revisão (1-5)
- `reviews.next_interval`: Próximo intervalo calculado

## 📊 Arquitetura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes shadcn/ui
│   ├── Layout.tsx      # Layout principal com navegação
│   ├── NextActionCard.tsx        # Card de próxima ação
│   ├── GamificationCard.tsx      # Card de gamificação
│   └── ReviewCompletionDialog.tsx # Diálogo de revisão
├── contexts/           # Context API
│   └── StudyContext.tsx # Estado global de estudos
├── hooks/              # Custom hooks
│   ├── useAuth.tsx     # Autenticação
│   └── use-toast.ts    # Notificações
├── lib/                # Utilitários e lógica de negócio
│   ├── suggestions.ts  # Sistema de sugestões inteligentes
│   ├── gamification.ts # Lógica de gamificação
│   ├── spacedRepetition.ts # Algoritmo de repetição espaçada
│   └── utils.ts        # Utilitários gerais
├── pages/              # Páginas da aplicação
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── StudyPlan.tsx   # Gestão de disciplinas/tópicos
│   ├── Planning.tsx    # Planejamento de ciclos
│   ├── RegisterStudy.tsx # Registro de sessões
│   ├── Reviews.tsx     # Revisões espaçadas
│   ├── Difficulties.tsx # Análise de dificuldades
│   ├── Gamification.tsx # Conquistas e progresso
│   └── Settings.tsx    # Configurações
├── types/              # TypeScript types
│   └── study.ts        # Tipos principais
└── integrations/       # Integrações externas
    └── supabase/       # Cliente Supabase
```

## 🎮 Como Usar

### 1. Configuração Inicial
- Faça login/cadastro
- Configure seu perfil em **Configurações**:
  - Nome e objetivo
  - Meta semanal de horas
  - Disponibilidade por dia da semana
  - Data da prova (opcional)

### 2. Criar Estrutura de Estudos
- Vá em **Plano** para adicionar disciplinas e tópicos
- Ou importe um preset (ENEM, OAB, etc)
- Defina prioridades (1-5) para cada disciplina

### 3. Gerar Planejamento
- Acesse **Planejamento**
- Clique em "Gerar Automaticamente"
- O sistema criará um ciclo otimizado baseado em prioridades

### 4. Estudar com Sugestões
- No **Dashboard**, veja a "Próxima Ação Recomendada"
- Siga a sugestão ou escolha outro tópico
- Registre suas sessões em **Registrar**

### 5. Fazer Revisões
- Acesse **Revisões** para ver pendentes
- Ao concluir, avalie a facilidade (1-5)
- O sistema ajustará automaticamente o próximo intervalo

### 6. Acompanhar Progresso
- **Dashboard**: Métricas semanais, gráficos, assuntos críticos
- **Dificuldades**: Ranking de desempenho por tópico
- **Conquistas**: Veja seu nível, streaks e badges

## 🏆 Sistema de Gamificação

### Níveis
- **XP**: 1 minuto de estudo = 1 XP
- **Fórmula**: Level = √(XP / 100)
- **Títulos**:
  - Level 1-2: Iniciante
  - Level 3-4: Aprendiz
  - Level 5-6: Intermediário
  - Level 7-9: Avançado
  - Level 10-14: Expert
  - Level 15-19: Sábio
  - Level 20+: Mestre Supremo

### Conquistas (Badges)
- 🎯 **Primeira Sessão**: Registrou sua primeira sessão
- 🔥 **Guerreiro Semanal**: Estudou todos os dias da semana
- 💯 **Centurião**: Respondeu 100 questões
- 🏃 **Maratonista**: Estudou 10h em uma semana
- 👑 **Mestre da Consistência**: Streak de 30 dias
- ⭐ **Perfeccionista**: 100% de acerto (mín. 10 questões)
- 🌅 **Madrugador**: Estudou antes das 7h
- 🦉 **Coruja Noturna**: Estudou depois das 23h
- 🔄 **Campeão de Revisões**: Completou 50 revisões
- 📚 **Buscador de Conhecimento**: 100 horas totais

## 🔄 Sistema de Revisões Espaçadas

### Algoritmo
Baseado no **SM-2** (SuperMemo 2), adaptado para simplicidade:

1. **Facilidade 1-2 (Difícil)**: Reinicia o ciclo (próxima revisão em 1 dia)
2. **Facilidade 3 (Médio)**: Mantém intervalo padrão
3. **Facilidade 4-5 (Fácil)**: Aumenta intervalo progressivamente

### Intervalos Típicos
- **1ª revisão**: 1 dia após estudo
- **2ª revisão**: 6-7 dias (se foi fácil)
- **3ª revisão**: 14-30 dias
- **Revisões seguintes**: Multiplicado pelo fator de facilidade (até 180 dias)

## 🚧 Roadmap Futuro

### Fase 1: Análise Avançada
- [ ] Gráficos de evolução temporal
- [ ] Comparação entre períodos
- [ ] Predição de desempenho na prova
- [ ] Relatórios semanais/mensais

### Fase 2: Recursos Avançados
- [ ] Upload de materiais (PDFs, vídeos)
- [ ] Editor de anotações markdown
- [ ] Flashcards integrados
- [ ] Modo offline (PWA)

### Fase 3: Integrações
- [ ] Notificações push/email
- [ ] Integração com Google Calendar
- [ ] Export para PDF/Excel
- [ ] API pública

### Fase 4: Social
- [ ] Compartilhamento de planos
- [ ] Grupos de estudo
- [ ] Rankings públicos/privados

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 👤 Autor

**Julio** - [JulioFloripa](https://github.com/JulioFloripa)

## 🙏 Agradecimentos

- shadcn/ui pela biblioteca de componentes
- Supabase pela infraestrutura backend
- Comunidade de concurseiros que inspirou este projeto

---

**Versão**: 2.0.0  
**Última atualização**: Fevereiro 2026
