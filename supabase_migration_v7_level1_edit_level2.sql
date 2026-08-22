-- ====================================================================
-- MIGRATION V7: HÀM CHO PHÉP LEVEL 1 CHỈNH SỬA PROFILE THÀNH VIÊN LEVEL 2
-- Ngày: 2026-08-22
-- ====================================================================

-- Hàm RPC an toàn: Level 1 chỉnh sửa profile của Level 2 thuộc quyền quản lý (parent_id = auth.uid())
-- Chỉ cập nhật các thông tin cá nhân: full_name, phone, job_title
-- Bảo toàn tuyệt đối: id, role, parent_id, status, created_at

CREATE OR REPLACE FUNCTION public.update_level2_profile_by_parent(
  target_user_id uuid,
  new_full_name text DEFAULT NULL,
  new_phone text DEFAULT NULL,
  new_job_title text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  caller_id uuid;
  caller_role text;
  is_owner boolean;
BEGIN
  caller_id := auth.uid();

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated call';
  END IF;

  -- Lấy vai trò của caller
  SELECT role INTO caller_role FROM public.profiles WHERE id = caller_id;

  -- Kiểm tra target user có phải là Level 2 thuộc quản lý của caller (parent_id = caller_id)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_user_id AND parent_id = caller_id
  ) INTO is_owner;

  -- Nếu không phải parent và không phải admin/super_admin -> từ chối
  IF NOT is_owner AND caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: You can only update profiles of Level 2 members assigned to you.';
  END IF;

  -- Cập nhật thông tin cá nhân trên canonical profiles table
  UPDATE public.profiles
  SET
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    job_title = COALESCE(new_job_title, job_title),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Ghi audit log
  INSERT INTO public.audit_logs (actor_id, target_user_id, action, metadata)
  VALUES (caller_id, target_user_id, 'update_level2_profile', 
    jsonb_build_object('full_name', new_full_name, 'phone', new_phone, 'job_title', new_job_title));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cấp quyền thực thi cho authenticated users
REVOKE EXECUTE ON FUNCTION public.update_level2_profile_by_parent(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_level2_profile_by_parent(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_level2_profile_by_parent(uuid, text, text, text) TO authenticated;
