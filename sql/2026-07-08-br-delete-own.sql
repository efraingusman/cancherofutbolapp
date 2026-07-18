-- P0.2: el dueño puede eliminar su propia identidad de negocio
do $$ begin
  begin
    create policy br_delete_own on business_requests for delete
      using (me() = lower(email));
  exception when duplicate_object then null; end;
end $$;
