-- Execute apenas se security_phase1_rls.sql já foi aplicado SEM o seed de admin.

insert into public.admin_allowlist (email)
values ('hoennkeys@gmail.com')
on conflict (email) do nothing;
