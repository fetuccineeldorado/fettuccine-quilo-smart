# 🗑️ Como Limpar Todo o Cache

## Métodos Disponíveis

### 1. Via Console do Navegador (MAIS RÁPIDO)

1. Abra o **Console do Navegador** (F12 → aba "Console")
2. Digite e pressione Enter:
   ```javascript
   clearAllCache()
   ```
3. A página será recarregada automaticamente após limpar o cache

### 2. Limpar Cache do Navegador Manualmente

#### Chrome/Edge:
1. Pressione **Ctrl + Shift + Delete**
2. Selecione:
   - ✅ Dados de navegação em cache
   - ✅ Cookies e outros dados do site
   - ✅ Imagens e arquivos em cache
3. Período: **Todo o período**
4. Clique em **Limpar dados**

#### Firefox:
1. Pressione **Ctrl + Shift + Delete**
2. Selecione:
   - ✅ Cache
   - ✅ Cookies
3. Período: **Tudo**
4. Clique em **Limpar agora**

### 3. Limpar Cache via DevTools

1. Abra **DevTools** (F12)
2. Vá em **Application** (Chrome) ou **Storage** (Firefox)
3. No menu lateral:
   - **Cache Storage**: Clique com botão direito → **Clear All**
   - **Service Workers**: Clique em **Unregister** em cada um
   - **Local Storage**: Clique com botão direito → **Clear**
   - **Session Storage**: Clique com botão direito → **Clear**
4. Recarregue a página (Ctrl + F5)

### 4. Hard Refresh (Recarregar Sem Cache)

- **Windows/Linux**: `Ctrl + Shift + R` ou `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### 5. Limpar Cache Programaticamente

No console do navegador, você pode executar:

```javascript
// Limpar apenas Service Worker cache
caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))));

// Limpar localStorage
localStorage.clear();

// Limpar sessionStorage
sessionStorage.clear();

// Recarregar página
location.reload(true);
```

## 🔄 O Que Foi Implementado

1. **Service Worker atualizado**:
   - Versão incrementada para `v2` (força limpeza de cache antigo)
   - Limpa automaticamente caches antigos na ativação
   - Suporta comando `CLEAR_CACHE` via mensagem

2. **Função global `clearAllCache()`**:
   - Limpa Service Worker cache
   - Limpa localStorage
   - Limpa sessionStorage
   - Recarrega a página automaticamente

3. **Utilitário `clearCache.ts`**:
   - Funções para limpar diferentes tipos de cache
   - Pode ser importado e usado em componentes

## ⚠️ Importante

Após limpar o cache:
- Você precisará fazer login novamente
- Dados locais (como preferências) serão perdidos
- O Service Worker será reinstalado na próxima visita

## 🚀 Limpeza Automática

O sistema agora limpa automaticamente caches antigos quando:
- Um novo Service Worker é instalado
- A versão do cache muda
- O Service Worker é atualizado

## 📝 Teste Rápido

1. Abra o console (F12)
2. Digite: `clearAllCache()`
3. Pressione Enter
4. A página será recarregada com cache limpo

