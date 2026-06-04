## Plano — Plataforma Escolar Administrável (Future Shift Board v2)

O escopo é grande. Vou entregar em **3 fases** para que cada uma seja revisada e funcione de ponta a ponta. Posso começar pela Fase 1 imediatamente após sua aprovação.

---

### Fase 1 — Fundação: Auth, Perfis, Turmas, Horários, Modo TV dinâmico

**Backend (migrations)**
- Enum `app_role` ampliado: `master`, `admin`, `secretary`, `teacher`, `student`, `visitor` (mantém compat com `admin`/`user` atuais)
- `profiles`: + `must_change_password boolean`, `active boolean`, `phone`
- `classes` (id, name, grade, active)
- `teachers` (user_id, subject)
- `student_classes` (user_id, class_id) — vínculo aluno↔turma
- `teacher_classes` (user_id, class_id) — vínculo professor↔turma
- `schedules` (class_id, teacher_id, subject, room, day_of_week 0-6, start_time, end_time, content_taught, notes)
- `announcements` (title, description, priority, target_scope jsonb {all|grade|class_ids[]}, start_date, end_date, active)
- `menu_pages` (title, slug, icon, color, order_position, visibility jsonb {roles[]})
- `tv_settings` (singleton: rotation_seconds, theme, logo_url, background_url, show_clock, show_news, show_announcements)
- `audit_logs` (user_id, action, module, old_value jsonb, new_value jsonb, created_at, ip)
- Função `has_any_role(_user_id, _roles app_role[])`
- RLS por perfil em cada tabela; GRANTs corretos; triggers `updated_at`; trigger genérico de auditoria nas tabelas principais
- Realtime habilitado em `schedules`, `announcements`, `tv_settings`
- Seed: turmas 1A–1D, 2A–2D, 3A–3D + usuário **Master** (`admin@escola.com` / `Admin@123`, `must_change_password=true`)

**Frontend**
- `useAuth` estendido com `roles[]`, `hasRole()`, `mustChangePassword`
- Página `/auth/change-password` obrigatória no primeiro login
- Página `/auth/forgot-password` + `/auth/reset-password`
- `ProtectedRoute` com checagem por roles
- `/admin` reorganizado: Dashboard, Usuários, Turmas, Horários, Conteúdos, Avisos, Menu, Modo TV, Auditoria, Configurações
- `/tv` (página dedicada, fullscreen, sem menus):
  - Rotação automática das 12 turmas (intervalo de `tv_settings.rotation_seconds`, padrão 30s)
  - Painel lateral direito de avisos (oculto quando não há avisos ativos → conteúdo ocupa 100%)
  - Filtragem de avisos por turma exibida
  - Relógio grande, data, transições suaves, realtime subscription

---

### Fase 2 — Lançamento de Aulas & Portais

- `/secretary/schedules` — grade semanal por turma, criar/editar horários
- `/teacher` — minhas aulas, lançar conteúdo ministrado, atividades, observações
- `/student` — meus horários, avisos da minha turma, conteúdos
- Filtros de avisos por: todas / ano (1º,2º,3º) / turma específica
- Menu dinâmico carregado de `menu_pages` com filtro por role

---

### Fase 3 — Auditoria, Backup, Exportações

- Tela `/admin/audit` com filtros (usuário, módulo, período)
- Edge Function `backup-export` (JSON completo do schema público)
- Exportação CSV/Excel/PDF por módulo (usuários, horários, avisos)
- Cron diário de snapshot em storage `backups/`

---

### Fora de escopo desta entrega
- WYSIWYG completo (mantém markdown leve)
- App mobile nativo
- Notificações push / e-mail transacional (pode ser adicionado depois com Lovable Email)
- SSO externo (Google/Apple) — adicionável sob demanda

---

**Confirma para eu começar pela Fase 1?** Se preferir, posso já incluir Google sign-in na Fase 1 (recomendado) ou priorizar outro bloco antes.
