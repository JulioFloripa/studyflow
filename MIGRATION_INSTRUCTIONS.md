# Instruções de Migração do Banco de Dados

## ⚠️ IMPORTANTE: Migração Necessária

Para que as novas funcionalidades (Modo Coordenador, Grade Horária, Gestão de Alunos) funcionem, você precisa aplicar a migração SQL no banco de dados do Supabase.

## Como Aplicar a Migração

### Opção 1: Via Dashboard do Supabase (Mais Fácil)

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard/project/ylnxgjpzrrohdlpgibhq

2. No menu lateral, clique em **SQL Editor**

3. Clique em **New Query**

4. Copie TODO o conteúdo do arquivo:
   ```
   supabase/migrations/20260220000000_educational_system.sql
   ```

5. Cole no editor SQL

6. Clique em **Run** (ou pressione Ctrl+Enter)

7. Aguarde a confirmação de sucesso

### Opção 2: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
cd /home/ubuntu/study-cycle-wizard
supabase login
supabase link --project-ref ylnxgjpzrrohdlpgibhq
supabase db push
```

## O Que a Migração Faz

Esta migração cria:

### 1. Tabela `classes` (Turmas)
- Gerenciamento de turmas por coordenadores
- Campos: nome, descrição, ano, semestre

### 2. Tabela `students` (Alunos)
- Cadastro completo de alunos
- Dados pessoais: nome, email, telefone, data de nascimento
- Dados acadêmicos: carreira pretendida, universidade alvo, série
- Dados pedagógicos: estilo de aprendizagem, métodos de estudo, ritmo

### 3. Tabela `time_grid` (Grade Horária)
- Grade horária visual de 30 minutos
- Status: livre, ocupado, personalizado
- Permite personalizar cada bloco (ex: "Aula de Piano", "Academia")

### 4. Tabela `custom_cycles` (Ciclos Personalizados)
- Ciclos de estudo gerados para cada aluno
- Baseados na grade horária disponível

### 5. Tabela `generated_reports` (Relatórios)
- Armazena relatórios em PDF gerados
- Histórico de relatórios por aluno

### 6. Segurança (RLS)
- Políticas de Row Level Security configuradas
- Coordenadores só veem seus próprios alunos
- Alunos só veem seus próprios dados

### 7. Funções Auxiliares
- `initialize_time_grid()`: Inicializa grade horária automaticamente
- Triggers para atualização de timestamps

## Verificação

Após aplicar a migração, você pode verificar se funcionou:

1. No SQL Editor, execute:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('classes', 'students', 'time_grid', 'custom_cycles', 'generated_reports');
```

2. Deve retornar 5 linhas com os nomes das tabelas

## Problemas Comuns

### Erro: "relation already exists"
- Significa que a tabela já foi criada
- Pode ignorar este erro específico

### Erro: "permission denied"
- Certifique-se de estar logado com uma conta com permissões de administrador
- Verifique se está no projeto correto

### Erro: "syntax error"
- Certifique-se de copiar TODO o conteúdo do arquivo SQL
- Não copie apenas partes do arquivo

## Suporte

Se encontrar problemas, verifique:
1. Se você tem permissões de administrador no projeto Supabase
2. Se o projeto está ativo e acessível
3. Se não há outras migrações pendentes

---

**Arquivo de Migração:** `supabase/migrations/20260220000000_educational_system.sql`
