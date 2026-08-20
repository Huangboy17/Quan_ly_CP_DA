-- ====================================================================
-- MIGRATION V3: HOÀN THIỆN HỆ THỐNG TÀI KHOẢN 3 CẤP
-- Ngày: 2026-08-20
-- IDEMPOTENT — An toàn khi chạy lại
-- KHÔNG xóa dữ liệu, KHÔNG drop bảng, KHÔNG reset profiles
-- ====================================================================

-- ============================================================
-- 1. FIX is_admin() — Nhận diện cả 'admin' và 'super_admin'
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role IN ('admin', 'super_admin'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. THÊM CỘT phone VÀO profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ============================================================
-- 3. MỞ RỘNG CHECK CONSTRAINT CHO status
-- Thêm 'archived' vào danh sách hợp lệ
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_status_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_status_check;
  END IF;
  
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('pending', 'active', 'blocked', 'archived'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

-- ============================================================
-- 4. MỞ RỘNG CHECK CONSTRAINT CHO role
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('super_admin', 'admin', 'level_1', 'level_2', 'user'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

-- ============================================================
-- 5. TẠO BẢNG audit_logs (TRƯỚC CÁC RPC vì RPC sẽ INSERT vào đây)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  target_user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 6. FIX TRIGGER handle_new_user
-- Public registration → level_1 + pending
-- Edge Function → metadata chỉ định role
-- ON CONFLICT DO NOTHING → không ghi đè
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_role TEXT;
  new_status TEXT;
  new_parent UUID;
BEGIN
  -- Kiểm tra metadata từ Edge Function
  IF new.raw_user_meta_data->>'account_type' = 'level_2' THEN
    new_role := 'level_2';
    new_status := 'active';
    new_parent := (new.raw_user_meta_data->>'parent_id')::UUID;
  ELSE
    -- Public registration → level_1 + pending
    new_role := 'level_1';
    new_status := 'pending';
    new_parent := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status, parent_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new_role,
    new_status,
    new_parent
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 7. HELPER: Đếm Level 2 active cho Level 1
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_level2_count(p_parent_id uuid)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM public.profiles 
    WHERE parent_id = p_parent_id 
    AND role = 'level_2' 
    AND status != 'archived'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 8. FIX update_user_status — Thêm 'archived', kiểm tra subordinates
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_status(target_user_id uuid, new_status text)
RETURNS void AS $$
DECLARE
  sub_count INTEGER;
  target_role TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can update status';
  END IF;
  
  IF new_status NOT IN ('pending', 'active', 'blocked', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: %', new_status;
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own status';
  END IF;

  -- Nếu archive Level 1: kiểm tra subordinates
  IF new_status = 'archived' THEN
    SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;
    IF target_role = 'level_1' THEN
      SELECT COUNT(*) INTO sub_count FROM public.profiles 
        WHERE parent_id = target_user_id 
        AND role = 'level_2' 
        AND status != 'archived';
      IF sub_count > 0 THEN
        RAISE EXCEPTION 'Cannot archive: account still has % active Level 2 members', sub_count;
      END IF;
    END IF;
  END IF;

  UPDATE public.profiles 
  SET status = new_status, updated_at = NOW() 
  WHERE id = target_user_id;
  
  -- Audit log
  INSERT INTO public.audit_logs (actor_id, target_user_id, action, metadata)
  VALUES (
    auth.uid(), target_user_id, 
    CASE new_status
      WHEN 'active' THEN 'approve_or_unblock'
      WHEN 'blocked' THEN 'block_account'
      WHEN 'archived' THEN 'archive_account'
      ELSE 'status_change'
    END,
    jsonb_build_object('new_status', new_status)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_user_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_user_status(uuid, text) TO authenticated;

-- ============================================================
-- 9. FIX update_user_quota
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_quota(target_user_id uuid, new_quota integer)
RETURNS void AS $$
DECLARE
  target_role TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can update quota';
  END IF;
  
  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF target_role != 'level_1' THEN
    RAISE EXCEPTION 'Can only set quota for Level 1 accounts';
  END IF;
  
  IF new_quota < 0 THEN
    RAISE EXCEPTION 'Quota cannot be negative';
  END IF;
  
  UPDATE public.profiles 
  SET max_quota = new_quota, updated_at = NOW() 
  WHERE id = target_user_id;
  
  INSERT INTO public.audit_logs (actor_id, target_user_id, action, metadata)
  VALUES (auth.uid(), target_user_id, 'update_quota', jsonb_build_object('new_quota', new_quota));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_user_quota(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_quota(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_user_quota(uuid, integer) TO authenticated;

-- ============================================================
-- 10. TẠO update_user_profile — Sửa full_name, phone
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_profile(
  target_user_id uuid, 
  new_full_name text DEFAULT NULL,
  new_phone text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can update profiles';
  END IF;

  UPDATE public.profiles 
  SET 
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    updated_at = NOW()
  WHERE id = target_user_id;
  
  INSERT INTO public.audit_logs (actor_id, target_user_id, action, metadata)
  VALUES (auth.uid(), target_user_id, 'update_profile', 
    jsonb_build_object('full_name', new_full_name, 'phone', new_phone));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text) TO authenticated;

-- ============================================================
-- 11. TẠO rpc_safe_delete_account — Soft delete with subordinate check
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_safe_delete_account(target_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  target_role TEXT;
  target_status TEXT;
  sub_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  SELECT role, status INTO target_role, target_status 
  FROM public.profiles WHERE id = target_user_id;
  
  IF target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Tài khoản không tồn tại');
  END IF;
  
  IF target_role = 'level_1' THEN
    SELECT COUNT(*) INTO sub_count FROM public.profiles 
      WHERE parent_id = target_user_id 
      AND role = 'level_2' 
      AND status != 'archived';
    IF sub_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'has_subordinates',
        'count', sub_count,
        'message', format('Tài khoản còn %s thành viên cấp 2. Vui lòng xử lý trước khi xóa.', sub_count)
      );
    END IF;
  END IF;
  
  UPDATE public.profiles 
  SET status = 'archived', updated_at = NOW() 
  WHERE id = target_user_id;
  
  INSERT INTO public.audit_logs (actor_id, target_user_id, action, metadata)
  VALUES (auth.uid(), target_user_id, 'archive_account', 
    jsonb_build_object('previous_role', target_role, 'previous_status', target_status));
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.rpc_safe_delete_account(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_safe_delete_account(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_safe_delete_account(uuid) TO authenticated;

-- ============================================================
-- 12. FIX rpc_check_and_lock_quota — Atomic quota enforcement
-- Dùng FOR UPDATE để lock row, chống race condition
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_check_and_lock_quota(p_parent_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
  current_quota INTEGER;
  current_count INTEGER;
  parent_status TEXT;
BEGIN
  -- Lock row để chống race condition
  SELECT max_quota, status INTO current_quota, parent_status
  FROM public.profiles 
  WHERE id = p_parent_id 
  FOR UPDATE;
  
  IF parent_status != 'active' THEN
    RETURN false;
  END IF;
  
  current_count := public.get_level2_count(p_parent_id);
  
  IF current_quota IS NULL OR current_quota <= 0 THEN
    RETURN false;
  END IF;
  
  IF current_count >= current_quota THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 13. CẬP NHẬT RLS profiles — Level 1 xem Level 2 của mình
-- ============================================================
DROP POLICY IF EXISTS "Level 1 can view own Level 2 members" ON public.profiles;
CREATE POLICY "Level 1 can view own Level 2 members"
  ON public.profiles FOR SELECT
  USING (parent_id = auth.uid());

-- ============================================================
-- 14. XỬ LÝ 3 TÀI KHOẢN role = 'user'
-- Tất cả đều không có parent_id → đăng ký công khai → level_1
-- ============================================================
UPDATE public.profiles 
SET role = 'level_1', updated_at = NOW()
WHERE role = 'user' AND parent_id IS NULL;

-- ============================================================
-- 15. RPC LẤY TRẠNG THÁI CỦA TÀI KHOẢN CHA (Cho Level 2 với kiểm tra bảo mật nghiêm ngặt)
-- Chỉ LEVEL_2 mới được gọi và chỉ được gọi với đúng parent_id của mình
-- Chạy với SECURITY DEFINER để bypass RLS một cách có kiểm soát
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_parent_status(p_parent_id uuid)
RETURNS TEXT AS $$
DECLARE
  caller_role TEXT;
  caller_parent UUID;
  parent_status TEXT;
BEGIN
  -- Lấy role và parent_id của tài khoản gọi hàm (auth.uid())
  SELECT role, parent_id INTO caller_role, caller_parent 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Kiểm tra quyền: Phải là LEVEL_2 và parent_id phải khớp với p_parent_id truyền vào
  IF caller_role != 'level_2' OR caller_parent IS NULL OR caller_parent != p_parent_id THEN
    RETURN NULL; -- Từ chối truy cập chéo
  END IF;
  
  -- Lấy status của parent
  SELECT status INTO parent_status 
  FROM public.profiles 
  WHERE id = p_parent_id;
  
  RETURN parent_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_parent_status(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parent_status(uuid) TO authenticated;

-- ============================================================
-- HOÀN TẤT
-- level_2_quota vẫn giữ nguyên (legacy, không sử dụng)
-- Không DROP bất kỳ bảng/cột nào
-- ====================================================================
