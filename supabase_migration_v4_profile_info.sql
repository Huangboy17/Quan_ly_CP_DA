-- ====================================================================
-- MIGRATION V4: THÊM THÔNG TIN CÁ NHÂN VÀO PROFILES
-- Ngày: 2026-08-20
-- ====================================================================

-- 1. Thêm các cột thông tin cá nhân vào bảng profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT;

-- 2. Tạo hàm (RPC) cho phép người dùng tự cập nhật thông tin của chính mình
CREATE OR REPLACE FUNCTION public.update_own_profile(
  new_full_name TEXT,
  new_birth_date DATE,
  new_job_title TEXT,
  new_company TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    full_name = COALESCE(new_full_name, full_name),
    birth_date = new_birth_date,
    job_title = new_job_title,
    company = new_company,
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Cấp quyền thực thi hàm cho tất cả user đã xác thực (authenticated)
GRANT EXECUTE ON FUNCTION public.update_own_profile(TEXT, DATE, TEXT, TEXT) TO authenticated;