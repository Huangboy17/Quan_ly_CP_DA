-- ====================================================================
-- BẢN VÁ LỖI (HOTFIX): RLS INFINITE RECURSION TRÊN BẢNG PROFILES
-- ====================================================================

-- 1. XÓA CÁC POLICY GÂY RA RECURSION TRÊN PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. ĐẢM BẢO CHỈ CÒN DUY NHẤT 1 POLICY AN TOÀN TRÊN PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 3. CỦNG CỐ CÁC FUNCTION CHECK QUYỀN ĐỂ CHUẨN XÁC, KHÔNG BỊ CHẶN BỞI RLS
-- (Khi chạy với SECURITY DEFINER bởi postgres, function sẽ bypass RLS hoàn toàn)
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

-- 4. TẠO CÁC RPC CHO QUẢN TRỊ VIÊN ĐỂ TRÁNH QUERIES TRỰC TIẾP QUA RLS

-- Lấy danh sách toàn bộ người dùng (Chỉ dành cho admin)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can view all profiles';
  END IF;
  
  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Khóa quyền truy cập vô danh vào RPC này
REVOKE EXECUTE ON FUNCTION public.get_all_profiles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_profiles() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;


-- Thay đổi trạng thái tài khoản
CREATE OR REPLACE FUNCTION public.update_user_status(target_user_id uuid, new_status text)
RETURNS void AS $$
BEGIN
  -- Chỉ Admin mới được thực hiện
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can update status';
  END IF;
  
  -- Ràng buộc giá trị hợp lệ
  IF new_status NOT IN ('pending', 'active', 'blocked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  
  -- Ngăn chặn Admin tự khóa chính mình
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own status';
  END IF;

  UPDATE public.profiles SET status = new_status WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Khóa quyền truy cập vô danh
REVOKE EXECUTE ON FUNCTION public.update_user_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_user_status(uuid, text) TO authenticated;
