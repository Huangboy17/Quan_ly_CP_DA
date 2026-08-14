-- ====================================================================
-- SUPABASE MIGRATION: ADMIN APPROVAL FLOW & RLS UPDATES
-- ====================================================================

-- 1. CHUẨN HÓA BẢNG PROFILES (KHÔNG DROP)
-- Thêm các cột nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Cập nhật data cũ (các tài khoản đang có) thành active và user (để không làm gián đoạn)
UPDATE public.profiles 
SET 
  status = 'active', 
  role = 'user' 
WHERE status IS NULL OR role IS NULL;

-- 2. TẠO TRIGGER TỰ ĐỘNG THÊM PROFILE KHI ĐĂNG KÝ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'user', 
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Xóa trigger cũ nếu có rồi tạo lại
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. HÀM KIỂM TRA QUYỀN AN TOÀN (SECURITY DEFINER ĐỂ TRÁNH RLS RECURSION)
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_status TEXT;
BEGIN
  SELECT status INTO user_status FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_status = 'active', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. BẬT RLS VÀ CẬP NHẬT CHÍNH SÁCH BẢO MẬT

-- 4.1. Cho bảng `profiles`
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- KHÔNG CHO PHÉP INSERT HOẶC DELETE TRỰC TIẾP TỪ CLIENT, CHỈ TRIGGER HOẶC ADMIN (SUPABASE DASHBOARD) MỚI ĐƯỢC PHÉP.

-- 4.2. Cập nhật RLS cho các bảng nghiệp vụ
-- (Thêm public.is_active_user() OR public.is_admin())

-- Bảng: du_an
ALTER TABLE public.du_an ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.du_an;
CREATE POLICY "Users can manage their own projects"
  ON public.du_an
  FOR ALL
  USING (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()))
  WITH CHECK (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()));

-- Bảng: hop_dong
ALTER TABLE public.hop_dong ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own contracts" ON public.hop_dong;
CREATE POLICY "Users can manage their own contracts"
  ON public.hop_dong
  FOR ALL
  USING (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()))
  WITH CHECK (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()));

-- Bảng: phu_luc_hop_dong
ALTER TABLE public.phu_luc_hop_dong ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own contract appendices" ON public.phu_luc_hop_dong;
-- Đảm bảo có policy cho phụ lục
CREATE POLICY "Users can manage their own contract appendices"
  ON public.phu_luc_hop_dong
  FOR ALL
  USING (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()))
  WITH CHECK (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()));

-- Bảng: thanh_toan_chi_phi
ALTER TABLE public.thanh_toan_chi_phi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.thanh_toan_chi_phi;
CREATE POLICY "Users can manage their own payments"
  ON public.thanh_toan_chi_phi
  FOR ALL
  USING (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()))
  WITH CHECK (auth.uid() = user_id AND (public.is_active_user() OR public.is_admin()));


-- ====================================================================
-- HƯỚNG DẪN: 
-- THAY THẾ `<EMAIL_CỦA_BẠN>` BẰNG EMAIL TÀI KHOẢN BẠN MUỐN LÀM ADMIN
-- ====================================================================
UPDATE public.profiles 
SET role = 'admin', status = 'active' 
WHERE email = 'buiviethoangktxd@gmail.com';
