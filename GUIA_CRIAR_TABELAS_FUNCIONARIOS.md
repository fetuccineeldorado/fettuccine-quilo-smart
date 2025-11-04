# Guia: Criar Tabelas do Módulo de Funcionários

## 📋 Visão Geral

Este guia explica como criar todas as tabelas necessárias para o módulo completo de funcionários no Supabase, incluindo:
- Tabela de funcionários
- Tabela de localizações da empresa (GPS)
- Tabela de registros de ponto eletrônico
- Tabela de logs de tentativas falhas

## 🚀 Como Executar

### Passo 1: Acessar o Supabase Dashboard
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

### Passo 2: Executar o Script
1. Clique em **New Query**
2. Abra o arquivo `criar_tabelas_funcionarios_completo.sql`
3. Copie todo o conteúdo do arquivo
4. Cole no editor SQL do Supabase
5. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Passo 3: Verificar a Execução
Após executar, você verá mensagens de confirmação:
- ✅ Tabela employees criada/verificada!
- ✅ Tabela company_locations criada/verificada!
- ✅ Tabela time_clock criada/verificada!
- ✅ Tabela failed_attempts criada/verificada!

## 📊 Tabelas Criadas

### 1. `employees` (Funcionários)
Campos principais:
- `id` - UUID único
- `name` - Nome completo (obrigatório)
- `email` - Email único (obrigatório)
- `cpf` - CPF único (opcional)
- `phone` - Telefone (opcional)
- `address` - Endereço (opcional)
- `role` - Cargo (admin, manager, cashier, kitchen, waiter)
- `position` - Posição/Função (opcional)
- `department` - Departamento (opcional)
- `salary` - Salário (opcional)
- `hire_date` - Data de admissão (opcional)
- `is_active` - Status ativo/inativo
- `face_photo_url` - URL da foto facial (opcional)
- `face_hash` - Hash para reconhecimento facial (opcional)
- `user_id` - Link com auth.users (opcional)
- `created_by` - Usuário que criou (opcional)
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### 2. `company_locations` (Localizações da Empresa)
Campos principais:
- `id` - UUID único
- `name` - Nome do local
- `address` - Endereço completo
- `latitude` - Coordenada GPS latitude
- `longitude` - Coordenada GPS longitude
- `radius_meters` - Raio permitido em metros (padrão: 50m)
- `is_active` - Se está ativo
- `description` - Descrição adicional
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### 3. `time_clock` (Registros de Ponto)
Campos principais:
- `id` - UUID único
- `employee_id` - Referência ao funcionário
- `clock_type` - Tipo (entry, exit, break_start, break_end)
- `clock_time` - Data/hora do registro
- `latitude` - Coordenada GPS latitude
- `longitude` - Coordenada GPS longitude
- `location_address` - Endereço obtido do GPS
- `distance_from_company` - Distância em metros do local da empresa
- `face_verification_confidence` - Confiança do reconhecimento facial (0-100)
- `face_verified` - Se foi verificado pelo sistema
- `photo_url` - Foto tirada no momento
- `device_info` - Informações do dispositivo (JSON)
- `is_verified` - Se foi verificado manualmente
- `verified_by` - Admin que verificou
- `verified_at` - Data/hora da verificação
- `notes` - Observações
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### 4. `failed_attempts` (Tentativas Falhas)
Campos principais:
- `id` - UUID único
- `employee_id` - Referência ao funcionário (opcional)
- `attempt_type` - Tipo (gps_validation, face_recognition, both, unknown)
- `face_match_score` - Score de correspondência facial (0-100)
- `latitude` - Coordenada GPS da tentativa
- `longitude` - Coordenada GPS da tentativa
- `distance_from_company` - Distância em metros do local da empresa
- `error_message` - Mensagem de erro
- `device_info` - Informações do dispositivo (JSON)
- `ip_address` - Endereço IP (opcional)
- `user_agent` - User agent do navegador
- `created_at` - Data de criação

## 🔒 Políticas RLS (Row Level Security)

O script configura políticas RLS permissivas para usuários autenticados:
- ✅ Visualizar funcionários
- ✅ Criar funcionários
- ✅ Atualizar funcionários
- ✅ Excluir funcionários
- ✅ Visualizar e gerenciar localizações
- ✅ Visualizar e criar registros de ponto
- ✅ Visualizar e criar logs de tentativas falhas

**Nota:** As políticas são permissivas para facilitar o uso. Em produção, você pode querer restringir baseado em roles/permissões.

## 🛠️ Funções Criadas

### 1. `update_updated_at_column()`
Atualiza automaticamente o campo `updated_at` quando um registro é modificado.

### 2. `validate_cpf(cpf_text VARCHAR)`
Valida o formato do CPF brasileiro.

### 3. `calculate_distance(lat1, lon1, lat2, lon2)`
Calcula a distância entre duas coordenadas GPS usando a fórmula de Haversine (retorna metros).

## 📝 Próximos Passos

### 1. Configurar Localização da Empresa
```sql
INSERT INTO company_locations (name, address, latitude, longitude, radius_meters, is_active)
VALUES (
  'Matriz',
  'Rua Exemplo, 123 - Centro',
  -23.550520,  -- Latitude (substitua pela sua)
  -46.633308,  -- Longitude (substitua pela sua)
  50,          -- Raio em metros
  true
);
```

### 2. Criar Bucket para Fotos (Opcional)
1. Vá em **Storage** no Supabase Dashboard
2. Clique em **New bucket**
3. Nome: `employee-photos`
4. Marque como **Public** se quiser acesso público
5. Configure permissões conforme necessário

### 3. Testar o Sistema
1. Acesse o sistema
2. Vá em **Funcionários**
3. Tente cadastrar um funcionário
4. Verifique se os dados são salvos corretamente

## 🔍 Verificação

### Verificar se as Tabelas Foram Criadas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'company_locations', 'time_clock', 'failed_attempts')
ORDER BY table_name;
```

### Verificar Políticas RLS
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('employees', 'company_locations', 'time_clock', 'failed_attempts')
ORDER BY tablename, policyname;
```

### Verificar Funções
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('update_updated_at_column', 'validate_cpf', 'calculate_distance')
ORDER BY proname;
```

## ⚠️ Notas Importantes

1. **Idempotência:** O script pode ser executado múltiplas vezes sem problemas. Ele usa `CREATE TABLE IF NOT EXISTS` e `DROP POLICY IF EXISTS`.

2. **Campos Opcionais:** A maioria dos campos são opcionais. Apenas `name` e `email` são obrigatórios para funcionários.

3. **CPF:** O campo CPF é opcional, mas se fornecido, deve ser único.

4. **RLS:** As políticas RLS são permissivas. Em produção, considere restringir baseado em roles/permissões específicas.

5. **Storage:** O bucket `employee-photos` precisa ser criado manualmente no Supabase Storage se você quiser armazenar fotos de funcionários.

## 🐛 Solução de Problemas

### Erro: "permission denied"
**Causa:** Políticas RLS bloqueando
**Solução:** Execute o script novamente ou verifique se as políticas foram criadas corretamente.

### Erro: "relation already exists"
**Causa:** Tabela já existe
**Solução:** Normal, o script usa `IF NOT EXISTS`. Pode ignorar ou verificar se a estrutura está correta.

### Erro: "function already exists"
**Causa:** Função já existe
**Solução:** Normal, o script usa `CREATE OR REPLACE`. Pode ignorar.

### Erro ao carregar funcionários no sistema
**Causa:** Políticas RLS ou tabela não existe
**Solução:** 
1. Execute o script `fix_employees_rls_rapido.sql`
2. Verifique se a tabela `employees` existe no Table Editor

## 📚 Arquivos Relacionados

- `criar_tabelas_funcionarios_completo.sql` - Script principal
- `fix_employees_rls_rapido.sql` - Correção rápida de RLS
- `CORRECAO_CADASTRO_FUNCIONARIOS.md` - Correções do cadastro
- `CORRECAO_ERRO_CARREGAR_FUNCIONARIOS.md` - Correções de carregamento

## ✅ Checklist Final

- [ ] Script executado no Supabase SQL Editor
- [ ] Todas as tabelas foram criadas (verificar mensagens)
- [ ] Políticas RLS foram configuradas
- [ ] Funções auxiliares foram criadas
- [ ] Localização da empresa configurada (opcional)
- [ ] Bucket `employee-photos` criado (opcional)
- [ ] Sistema testado (cadastro de funcionário)

---

**Pronto!** O módulo de funcionários está configurado e pronto para uso. 🎉

