
# Painel Administrativo — Future Shift Board

Vou construir uma área `/admin` completa, protegida por login e role `admin`, com tema próprio (escuro moderno, sidebar fixa) diferente do painel cyberpunk público.

## 1. Backend (Lovable Cloud)

Vou ativar o Lovable Cloud (banco + auth + storage) e criar:

**Auth & Roles**
- Autenticação por e-mail/senha (signup/login/logout)
- Enum `app_role` (`admin`, `user`)
- Tabela `user_roles` + função `has_role()` security definer
- Tabela `profiles` (id, display_name, avatar) com trigger no signup
- Rotas `/admin/*` protegidas: redireciona para `/auth` se não logado, e mostra "Acesso negado" se não for admin

**Tabelas**
- `categories` (id, name, icon, color, created_at)
- `contents` (id, title, subtitle, content, cover_image, gallery[], category_id, tags[], status, author_id, created_at, updated_at) — com trigger `updated_at`
- `media` (id, file_name, file_url, file_type, file_size, uploaded_by, uploaded_at)
- `site_settings` (singleton — id, site_name, logo, favicon, description, social_links jsonb, contact_email, contact_phone, footer_text)

**RLS**
- Leitura pública de `contents` (status='published'), `categories`, `site_settings`
- Escrita/leitura completa em todas as tabelas: apenas `admin`
- `user_roles`: leitura pelo próprio usuário; escrita apenas admin

**Storage**
- Bucket público `media` para imagens/PDFs/vídeos (upload restrito a admins via RLS)

## 2. Frontend Admin (`/admin`)

Layout próprio com `SidebarProvider` shadcn, tema escuro moderno (slate/zinc + accent único), distinto do público.

**Rotas**
- `/auth` — login/cadastro
- `/admin` — Dashboard (cards de estatísticas + últimas atualizações)
- `/admin/contents` — listagem com busca, filtro por categoria, ordenação, paginação; ações editar/excluir/visualizar
- `/admin/contents/new` e `/admin/contents/:id/edit` — formulário com editor rico (textarea estilizado + markdown), upload de capa, galeria múltipla, seleção de categoria, tags, status, auto-save (debounce 2s)
- `/admin/categories` — CRUD inline com seletor de ícone (lucide) e cor
- `/admin/media` — grid de uploads, upload múltiplo, exclusão
- `/admin/settings` — formulário único de configurações do site

**Componentes**
- `AdminLayout`, `AdminSidebar`, `StatCard`, `DataTable`, `ContentForm`, `CategoryDialog`, `MediaGrid`, `ConfirmDialog`, `RichTextEditor` (textarea com toolbar simples), `ProtectedAdminRoute`

**UX**
- Toasts de sucesso/erro (sonner)
- Confirmação antes de excluir
- Loading states e skeleton
- Responsivo (sidebar vira sheet no mobile)

## 3. Detalhes técnicos

- Cliente Supabase em `src/integrations/supabase/client.ts` (gerado pelo Cloud)
- Hook `useAuth()` com `onAuthStateChange` + `getUser()`
- Hook `useIsAdmin()` consultando `has_role`
- Validação Zod nos formulários
- Upload via `supabase.storage.from('media').upload(...)`

## 4. Fora de escopo nesta entrega
- Editor WYSIWYG completo (uso textarea + markdown leve; pode evoluir depois)
- Versionamento de conteúdos
- Logs de auditoria

Após aprovação, ativo o Cloud, crio a migração, e construo todas as telas.
