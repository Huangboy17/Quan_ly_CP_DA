-- Migration v6: Thêm trường Giá trị thực hiện và Giá trị nghiệm thu vào bảng thanh_toan_chi_phi
ALTER TABLE public.thanh_toan_chi_phi
  ADD COLUMN IF NOT EXISTS gia_tri_thuc_hien NUMERIC DEFAULT NULL;

ALTER TABLE public.thanh_toan_chi_phi
  ADD COLUMN IF NOT EXISTS gia_tri_nghiem_thu NUMERIC DEFAULT NULL;

-- Reload schema cache cho PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';
