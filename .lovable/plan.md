# Plano de correção — RLS, Edge Functions e Permissões

## Situação atual (após análise)

O banco já tem uma estrutura sólida de papéis (`master`, `admin`, `secretary`, `teacher`, `student`, `user`, `visitor`) via `user_roles` + `has_role()` + `is_admin_level()`. Todas as tabelas principais (`announcements`, `schedules`, `classes`, `contents`, `exams`, `lessons`, `media`, `profiles`, `menu_pages`, `permissions`, `categories`, `teacher_classes`, `student_classes`) já têm RLS ativa com políticas por papel. **Não há um erro reproduzível informado** — sem saber qual tela/ação falha, uma "refatoração total de RLS" é arriscada: pode quebrar fluxos que hoje funcionam (admin, secretaria, TV).

Por isso este plano foca em **causas mais prováveis do erro RLS** e em **visibilidade de erros**, sem reescrever o modelo de papéis que já existe.

## O que será feito

### 1. Melhor diagnóstico de erros (frontend)
Criar helper `src/lib/supaError.ts` com `describeSupaError(err, { table, op })` que devolve mensagem clara:
- Tabela, operação (INSERT/UPDATE/DELETE), motivo real do Postgres
- Detecta `42501` / "row-level security" e explica "sem permissão para esta ação neste registro"
- Loga stack completo no console

Aplicar nas telas de escrita que hoje usam `toast.error(e.message)` genérico: `AdminAnnouncements`, `AdminSchedules`, `AdminExams`, `AdminLessons`, `AdminContents`, `AdminClasses`, `AdminMedia`, `AdminCategories`, `AdminSettings`, `AdminTvSettings`, `Profile`.

### 2. Garantir `created_by` / `user_id` nos inserts
Verificar cada `.insert(...)` das telas admin: adicionar `created_by: user.id` quando a coluna existir e estiver `NOT NULL` ou for exigida pela política. Migração leve para preencher default `auth.uid()` em colunas `created_by` de `announcements`, `contents`, `lessons`, `exams` quando ausente — evita esquecimento no cliente.

### 3. Ajuste de política para `visitor`
Hoje um usuário recém-criado com papel `visitor` ou `user` só consegue editar o próprio `profiles` — o que já atende o requisito. Vou **apenas confirmar** que:
- `profiles`: SELECT/UPDATE próprios ✓ (já existe)
- Todas as tabelas admin negam escrita para papéis não-staff ✓ (já existe)

Nenhuma migração de papéis nova aqui — o modelo já corresponde ao pedido.

### 4. Ocultar botões de admin para não-staff
No `AdminLayout`/rotas, já existe `ProtectedAdminRoute`. Adicionar no `Index.tsx` / header: só mostrar link "Admin" quando `isAdmin || hasRole('secretary','teacher')`. Nas telas admin com ações de criar/editar, envolver botões com verificação de `hasRole` para esconder botões que a política do banco negaria.

### 5. Edge Functions
Revisar `admin-users` e `parse-schedule`:
- Confirmar que retornam sempre `Response` com CORS mesmo em erros
- Adicionar mensagem detalhada no JSON de erro (mensagem + código)
- Logs de entrada/saída

Sem trocar o `verify_jwt` (deploy padrão). Sem novos secrets.

## O que NÃO será feito (fora do escopo prático)

- **Refatorar todo o sistema de papéis**: já está implementado e corresponde ao pedido. Reescrever quebraria fluxos existentes sem ganho.
- **Novo cargo "Direção"**: mapeia para `master`/`admin` já existentes.
- **Fluxo de aprovação de cadastro**: sistema atual já cria com papel `user` via trigger `handle_new_user`; posso trocar para `visitor` se você confirmar.

## Arquivos afetados (estimativa)
- Novo: `src/lib/supaError.ts`
- Editados: ~10 páginas admin + `Index.tsx` + 2 edge functions
- 1 migração pequena (defaults `created_by`)

## Confirme antes de eu implementar
1. Papel default no cadastro deve virar **`visitor`** (hoje é `user`)? Sim/Não
2. Você tem uma **tela/ação específica** onde vê o erro RLS ou o erro "non-2xx"? Se souber, cite — direciono a correção. Se não souber, sigo o plano acima.
