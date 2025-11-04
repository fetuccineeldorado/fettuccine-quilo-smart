# 📋 GUIA COMPLETO - Sistema de Funcionários com Cadastro e Registro de Ponto

## 🎯 Visão Geral

Sistema completo de gerenciamento de funcionários com:
- ✅ Cadastro completo de funcionários
- ✅ Captura de foto facial para reconhecimento
- ✅ Validação de CPF único
- ✅ Login administrativo
- ✅ Registro de ponto eletrônico (próxima fase)
- ✅ Integração com GPS (próxima fase)

---

## 📦 COMPONENTES CRIADOS

### 1. **Estrutura de Banco de Dados**
- ✅ Migration SQL completa: `supabase/migrations/20250104000002_create_employees_system_complete.sql`
- ✅ Tabela `employees` expandida com todos os campos
- ✅ Tabela `time_clock` para registro de ponto
- ✅ Tabela `admin_users` para gerenciar administradores
- ✅ Validação de CPF no banco de dados
- ✅ Políticas RLS (Row Level Security) configuradas

### 2. **Componentes React**
- ✅ `src/pages/AdminLogin.tsx` - Tela de login para admins
- ✅ `src/components/EmployeeManagerComplete.tsx` - Gestão completa de funcionários
- ✅ `src/components/FaceCapture.tsx` - Captura de foto facial
- ✅ `src/utils/cpfValidator.ts` - Validador de CPF brasileiro

---

## 🚀 COMO APLICAR

### PASSO 1: Aplicar Migration SQL no Supabase

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New Query**
4. Copie e cole o conteúdo completo de:
   - `supabase/migrations/20250104000002_create_employees_system_complete.sql`
5. Clique em **Run** (ou Ctrl+Enter)
6. Aguarde a execução e verifique as mensagens de sucesso

### PASSO 2: Criar Bucket no Storage

1. No Supabase Dashboard, vá em **Storage**
2. Clique em **New Bucket**
3. Nome: `employee-photos`
4. Marque como **Public bucket** (para acesso às fotos)
5. Clique em **Create bucket**

### PASSO 3: Criar Primeiro Admin

Execute no SQL Editor:

```sql
-- Substitua 'seu-email@exemplo.com' pelo email do admin
-- O usuário precisa estar cadastrado no auth.users primeiro

INSERT INTO admin_users (
  user_id,
  email,
  full_name,
  is_super_admin,
  can_manage_employees,
  can_view_reports,
  can_manage_settings,
  is_active
)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' AS full_name,
  true AS is_super_admin,
  true AS can_manage_employees,
  true AS can_view_reports,
  true AS can_manage_settings,
  true AS is_active
FROM auth.users
WHERE email = 'seu-email@exemplo.com';
```

**OU** cadastre o usuário primeiro:

```sql
-- 1. Criar usuário no auth (via Supabase Dashboard > Authentication > Add User)
-- 2. Depois executar:

INSERT INTO admin_users (
  user_id,
  email,
  full_name,
  is_super_admin,
  can_manage_employees,
  can_view_reports,
  can_manage_settings,
  is_active
) VALUES (
  'UUID_DO_USUARIO_AQUI',  -- Substitua pelo UUID do usuário criado
  'admin@exemplo.com',
  'Administrador Principal',
  true,
  true,
  true,
  true,
  true
);
```

### PASSO 4: Testar o Sistema

1. **Acesse a tela de login admin:**
   - URL: `/admin-login` (será adicionada à rota)
   - Ou acesse diretamente: `http://localhost:8080/admin-login`

2. **Faça login com as credenciais do admin**

3. **Acesse a área de funcionários:**
   - Menu: **Funcionários** → **Gestão**
   - Ou diretamente: `/dashboard/employees`

4. **Cadastre um funcionário:**
   - Clique em **"Novo Funcionário"**
   - Preencha os dados
   - **Capture foto facial** (obrigatório para novos funcionários)
   - Clique em **"Cadastrar Funcionário"**

---

## 📋 CAMPOS DO FORMULÁRIO

### Dados Pessoais
- ✅ **Nome Completo** * (obrigatório)
- ✅ **CPF** (validação automática, único)
- ✅ **Email** * (obrigatório, único)
- ✅ **Telefone**
- ✅ **Endereço**

### Dados Profissionais
- ✅ **Cargo** * (obrigatório): Caixa, Garçom, Cozinha, Gerente, Administrador
- ✅ **Posição/Função**: Assistente, Auxiliar, Operador, Supervisor, Coordenador, Gerente, Diretor
- ✅ **Departamento**: Administração, Atendimento, Cozinha, Caixa, Limpeza, Gerência
- ✅ **Data de Admissão**
- ✅ **Salário** (R$)
- ✅ **Status**: Ativo/Inativo

### Foto Facial
- ✅ **Captura via câmera** (webcam ou câmera do celular)
- ✅ **Armazenamento no Supabase Storage**
- ✅ **Obrigatório para novos funcionários**

### Observações
- ✅ Campo de texto livre para anotações

---

## 🔒 SEGURANÇA

### Validações Implementadas
- ✅ **CPF único**: Não permite duplicatas
- ✅ **Email único**: Não permite duplicatas
- ✅ **Validação de CPF**: Algoritmo brasileiro completo
- ✅ **RLS (Row Level Security)**: Apenas admins podem gerenciar funcionários
- ✅ **Autenticação obrigatória**: Login admin necessário

### Permissões
- **Admin Users**: Podem gerenciar funcionários
- **Super Admin**: Podem gerenciar outros admins
- **Funcionários**: Podem apenas visualizar seus próprios dados (futuro)

---

## 📸 CAPTURA DE FOTO FACIAL

### Funcionalidades
- ✅ Acesso à câmera frontal ou traseira
- ✅ Preview em tempo real
- ✅ Captura de foto
- ✅ Retake (tirar nova foto)
- ✅ Alternância entre câmeras
- ✅ Upload automático para Supabase Storage
- ✅ Validação de qualidade (futuro)

### Requisitos
- Navegador moderno com suporte a `getUserMedia`
- Permissão de câmera concedida
- Conexão com internet para upload

---

## 🗄️ ESTRUTURA DO BANCO

### Tabela `employees`
```sql
- id (UUID)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- cpf (VARCHAR, UNIQUE, validado)
- phone (VARCHAR)
- address (TEXT)
- role (ENUM: admin, manager, cashier, kitchen, waiter)
- position (VARCHAR)
- department (VARCHAR)
- salary (DECIMAL)
- hire_date (DATE)
- is_active (BOOLEAN)
- notes (TEXT)
- face_photo_url (TEXT)
- face_hash (TEXT) - para reconhecimento futuro
- created_by (UUID) - referência ao admin
- created_at, updated_at (TIMESTAMP)
```

### Tabela `time_clock`
```sql
- id (UUID)
- employee_id (UUID, FK)
- clock_type (ENUM: entry, exit, break_start, break_end)
- clock_time (TIMESTAMP)
- latitude, longitude (DECIMAL)
- location_address (TEXT)
- device_info (TEXT)
- face_verification_confidence (DECIMAL)
- face_verified (BOOLEAN)
- photo_url (TEXT)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### Tabela `admin_users`
```sql
- id (UUID)
- user_id (UUID, FK para auth.users)
- email (VARCHAR, UNIQUE)
- full_name (VARCHAR)
- is_super_admin (BOOLEAN)
- can_manage_employees (BOOLEAN)
- can_view_reports (BOOLEAN)
- can_manage_settings (BOOLEAN)
- is_active (BOOLEAN)
- last_login (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

---

## 🚧 PRÓXIMAS ETAPAS (Registro de Ponto)

### Fase 2: Registro de Ponto Eletrônico
- [ ] Tela de registro de ponto para funcionários
- [ ] Reconhecimento facial no ponto
- [ ] Captura de localização GPS
- [ ] Validação de horário de trabalho
- [ ] Relatórios de ponto
- [ ] Dashboard de presença

### Fase 3: Funcionalidades Avançadas
- [ ] Notificações push
- [ ] Relatórios em PDF
- [ ] Exportação de dados
- [ ] Integração com folha de pagamento
- [ ] Histórico completo de pontos

---

## 📝 NOTAS IMPORTANTES

1. **CPF**: O sistema valida e formata automaticamente
2. **Foto**: Armazenada no Supabase Storage, bucket `employee-photos`
3. **Segurança**: Apenas admins autenticados podem gerenciar funcionários
4. **Validações**: CPF e Email são únicos no banco de dados
5. **Mobile**: Totalmente responsivo, funciona em celulares e tablets

---

## 🐛 TROUBLESHOOTING

### Erro: "CPF inválido"
- Verifique se o CPF tem 11 dígitos
- O sistema valida automaticamente os dígitos verificadores

### Erro: "Email já cadastrado"
- O email já está em uso por outro funcionário
- Use um email diferente ou edite o funcionário existente

### Erro: "Permissão negada"
- Verifique se você está logado como admin
- Verifique se o usuário está na tabela `admin_users`
- Verifique se `is_active = true` na tabela `admin_users`

### Erro: "Câmera não acessível"
- Verifique as permissões do navegador
- Tente usar HTTPS (requerido para câmera em produção)
- Verifique se há outra aplicação usando a câmera

### Foto não aparece
- Verifique se o bucket `employee-photos` existe no Storage
- Verifique se o bucket é público
- Verifique as políticas RLS do Storage

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Migration SQL criada
- [x] Componente de login admin
- [x] Componente de cadastro completo
- [x] Captura de foto facial
- [x] Validação de CPF
- [x] Integração com Supabase
- [x] Upload de fotos para Storage
- [ ] Testes end-to-end
- [ ] Documentação de API
- [ ] Registro de ponto (próxima fase)

---

## 📞 SUPORTE

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase
3. Consulte a documentação do Supabase
4. Verifique as políticas RLS
