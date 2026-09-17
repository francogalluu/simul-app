-- The app creates rows optimistically with UUIDs generated on the device, so the
-- local row and the Realtime echo share one id (no duplicates, no temp ids).
-- A colliding/forged id only produces a primary-key error; RLS still applies.
grant insert (id) on public.habits to authenticated;
grant insert (id) on public.completions to authenticated;
