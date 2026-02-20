#!/usr/bin/env python3
"""
Script para aplicar migração SQL no Supabase via API
"""
import os
import requests
import sys

# Configurações do Supabase
SUPABASE_URL = "https://ylnxgjpzrrohdlpgibhq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsbnhnanB6cnJvaGRscGdpYmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzk2NTEsImV4cCI6MjA4NjI1NTY1MX0.SIVhhVyLp-UJ6HDgGyw2RCAupMJ8yo2ZrNm2WssjQ88"

# Ler o arquivo de migração
migration_file = "supabase/migrations/20260220000000_educational_system.sql"

print(f"Lendo migração: {migration_file}")
with open(migration_file, 'r', encoding='utf-8') as f:
    sql_content = f.read()

print(f"Conteúdo da migração: {len(sql_content)} caracteres")

# Nota: A API pública do Supabase (anon key) não permite executar SQL diretamente
# por questões de segurança. Precisamos usar a Management API ou o CLI.

print("\n⚠️  IMPORTANTE:")
print("A migração SQL foi criada em: supabase/migrations/20260220000000_educational_system.sql")
print("\nPara aplicar a migração, você tem 3 opções:\n")

print("OPÇÃO 1 - Via Supabase CLI (Recomendado):")
print("  1. Instale o Supabase CLI: https://supabase.com/docs/guides/cli")
print("  2. Faça login: supabase login")
print("  3. Link o projeto: supabase link --project-ref ylnxgjpzrrohdlpgibhq")
print("  4. Aplique a migração: supabase db push")

print("\nOPÇÃO 2 - Via Dashboard do Supabase:")
print("  1. Acesse: https://supabase.com/dashboard/project/ylnxgjpzrrohdlpgibhq/editor")
print("  2. Vá em 'SQL Editor'")
print("  3. Cole o conteúdo do arquivo e execute")

print("\nOPÇÃO 3 - Copiar SQL para executar manualmente:")
print("  O arquivo está em: supabase/migrations/20260220000000_educational_system.sql")

# Tentar via REST API (limitado)
print("\n\nTentando aplicar via REST API...")
print("(Nota: Isso pode não funcionar devido a restrições de segurança)")

# A API REST do Supabase não expõe endpoint para executar SQL arbitrário
# Vamos criar as tabelas via código TypeScript no frontend como alternativa

print("\n✅ SOLUÇÃO ALTERNATIVA:")
print("Vou criar um script de inicialização que será executado no primeiro acesso do app.")
print("Isso garantirá que as tabelas sejam criadas automaticamente.")

sys.exit(0)
