-- Migration v6: Thêm trường Giá trị thực hiện và Giá trị nghiệm thu vào bảng thanh_toan_chi_phi với mặc định là 0
ALTER TABLE public.thanh_toan_chi_phi
  ADD COLUMN IF NOT EXISTS gia_tri_thuc_hien NUMERIC DEFAULT 0;

ALTER TABLE public.thanh_toan_chi_phi
  ADD COLUMN IF NOT EXISTS gia_tri_nghiem_thu NUMERIC DEFAULT 0;

-- Làm mới schema cache cho PostgREST (Supabase API)
NOTIFY pgrst, 'reload schema';
