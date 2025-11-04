# 📋 Aplicar Migração - Sistema de Funcionários Completo

## 🎯 Objetivo
Criar o sistema completo de funcionários com registro de ponto, reconhecimento facial e GPS.

---

## 📝 PASSO A PASSO

### 1️⃣ Acesse o Supabase Dashboard

1. Abra: **https://supabase.com/dashboard**
2. Faça login e selecione seu projeto
3. Clique em **"SQL Editor"** no menu lateral
4. Clique em **"New Query"**

### 2️⃣ Execute a Migração

1. Abra o arquivo: `supabase/migrations/20250104000001_create_employees_system.sql`
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. **Cole no SQL Editor** do Supabase (Ctrl+V)
4. Clique em **"Run"** ou pressione **Ctrl+Enter**

### 3️⃣ Verifique a Criação

Execute estas queries para verificar:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'time_records', 'admin_sessions')
ORDER BY table_name;

-- Verificar estrutura da tabela employees
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

-- Verificar função de validação de CPF
SELECT proname FROM pg_proc WHERE proname = 'validate_cpf';
```

---

## ✅ O QUE A MIGRAÇÃO CRIA

### 1. **Tabela `employees` (Ampliada)**
- ✅ Campos completos: nome, CPF, email, telefone, endereço, cargo, departamento
- ✅ Data de admissão e salário
- ✅ Foto do funcionário (`photo_url`)
- ✅ Encoding facial (`facial_encoding`) para reconhecimento
- ✅ Validação de CPF única e formatada
- ✅ Constraint para validar CPF usando função customizada

### 2. **Tabela `time_records` (Registro de Ponto)**
- ✅ Tipos de registro: entrada, saída, início pausa, fim pausa
- ✅ Coordenadas GPS (latitude, longitude)
- ✅ Endereço obtido do GPS
- ✅ Foto tirada no momento do registro
- ✅ Confiança do reconhecimento facial (0-100)
- ✅ Informações do dispositivo
- ✅ Sistema de verificação por admin

### 3. **Tabela `admin_sessions`**
- ✅ Sessões de administradores
- ✅ Tokens de sessão únicos
- ✅ Expiração automática
- ✅ Rastreamento de IP e User Agent

### 4. **Função `validate_cpf`**
- ✅ Valida CPF brasileiro completo
- ✅ Verifica dígitos verificadores
- ✅ Rejeita CPFs inválidos (111.111.111-11, etc.)

### 5. **Políticas RLS (Row Level Security)**
- ✅ Admins podem gerenciar todos os funcionários
- ✅ Funcionários podem ver apenas seus próprios registros
- ✅ Funcionários podem criar seus próprios registros de ponto
- ✅ Admins podem ver e gerenciar todos os registros

### 6. **Índices para Performance**
- ✅ Índices em CPF, email, role, status
- ✅ Índices em employee_id, recorded_at, record_type
- ✅ Índices em tokens de sessão

---

## ⚠️ IMPORTANTE

- ✅ A migração é **idempotente** (pode ser executada múltiplas vezes)
- ✅ Se a tabela `employees` já existir, apenas adiciona as colunas faltantes
- ✅ Não remove dados existentes
- ✅ Valida CPF antes de inserir (rejeita CPFs inválidos)

---

## 🚀 PRÓXIMOS PASSOS

Após aplicar a migração:

1. ✅ **Criar interface de login para admins**
2. ✅ **Criar formulário de cadastro de funcionários**
3. ✅ **Implementar captura de foto facial**
4. ✅ **Implementar registro de ponto com GPS**
5. ✅ **Implementar reconhecimento facial**

---

## 🔍 TROUBLESHOOTING

### Erro: "function update_updated_at_column() does not exist"
**Solução:** Execute primeiro a migration que cria essa função, ou crie manualmente:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Erro: "relation 'employees' does not exist"
**Solução:** A migration criará a tabela automaticamente. Se persistir, verifique se você tem permissões de administrador.

### Erro: "duplicate key value violates unique constraint"
**Solução:** Verifique se já existe um funcionário com o mesmo CPF ou email. A constraint garante que CPF e email sejam únicos.

---

## 📊 ESTRUTURA FINAL

```
employees
├── id (UUID, PK)
├── name (VARCHAR)
├── cpf (VARCHAR, UNIQUE) ✅
├── email (VARCHAR, UNIQUE)
├── phone (VARCHAR)
├── address (TEXT)
├── role (VARCHAR)
├── department (VARCHAR)
├── hire_date (DATE)
├── salary (DECIMAL)
├── photo_url (TEXT) ✅
├── facial_encoding (JSONB) ✅
├── is_active (BOOLEAN)
├── notes (TEXT)
└── timestamps

time_records
├── id (UUID, PK)
├── employee_id (UUID, FK)
├── record_type (VARCHAR) ✅
├── recorded_at (TIMESTAMP)
├── latitude (DECIMAL) ✅
├── longitude (DECIMAL) ✅
├── address (TEXT) ✅
├── photo_url (TEXT) ✅
├── facial_match_confidence (DECIMAL) ✅
├── device_info (JSONB) ✅
├── is_verified (BOOLEAN)
├── verified_by (UUID, FK)
├── verified_at (TIMESTAMP)
└── timestamps

admin_sessions
├── id (UUID, PK)
├── admin_id (UUID, FK)
├── session_token (VARCHAR, UNIQUE)
├── expires_at (TIMESTAMP)
├── ip_address (VARCHAR)
└── user_agent (TEXT)
```

---

## ✅ CONCLUSÃO

Após aplicar esta migração, você terá:
- ✅ Sistema completo de funcionários
- ✅ Validação de CPF
- ✅ Estrutura para reconhecimento facial
- ✅ Estrutura para registro de ponto com GPS
- ✅ Sistema de sessões para admins
- ✅ Políticas de segurança (RLS)

