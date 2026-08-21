-- ====================================================================
-- MIGRATION V5: THAY ĐỔI LOGIC XÓA CẤP 1 TỰ ĐỘNG XÓA TOÀN BỘ CẤP 2
-- Ngày: 2026-08-20
-- ====================================================================

-- 1. Hàm RPC xóa Cascade tài khoản Cấp 1 cùng toàn bộ Cấp 2 trực thuộc
CREATE OR REPLACE FUNCTION public.rpc_delete_account_cascade(target_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  target_role TEXT;
  target_status TEXT;
  sub_record RECORD;
  deleted_sub_count INTEGER := 0;
BEGIN
  -- 1. Kiểm tra quyền Super Admin / Admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can delete accounts';
  END IF;

  -- 2. Không cho phép tự xóa chính mình
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- 3. Lấy thông tin tài khoản cần xóa
  SELECT role, status INTO target_role, target_status 
  FROM public.profiles WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Tài khoản không tồn tại');
  END IF;

  -- 4. Nếu là Cấp 1, xóa toàn bộ Cấp 2 thuộc Cấp 1 trước
  IF target_role = 'level_1' THEN
    FOR sub_record IN 
      SELECT id FROM public.profiles 
      WHERE parent_id = target_user_id AND role = 'level_2'
    LOOP
      -- Gỡ assignee_id khỏi các hợp đồng liên quan đến Cấp 2 (giữ lại dữ liệu hợp đồng)
      UPDATE public.hop_dong SET assignee_id = NULL WHERE assignee_id = sub_record.id;
      
      -- Gỡ tham chiếu trong audit_logs nếu có
      UPDATE public.audit_logs SET actor_id = NULL WHERE actor_id = sub_record.id;
      UPDATE public.audit_logs SET target_user_id = NULL WHERE target_user_id = sub_record.id;

      -- Xóa profile và auth.users của Cấp 2 (Xóa hoàn toàn cả Auth và Profiles)
      DELETE FROM public.profiles WHERE id = sub_record.id;
      DELETE FROM auth.users WHERE id = sub_record.id;
      
      deleted_sub_count := deleted_sub_count + 1;
    END LOOP;
  END IF;

  -- 5. Gỡ tham chiếu của Cấp 1 (hoặc Cấp 2 nếu target là Cấp 2)
  UPDATE public.hop_dong SET assignee_id = NULL WHERE assignee_id = target_user_id;
  UPDATE public.audit_logs SET actor_id = NULL WHERE actor_id = target_user_id;
  UPDATE public.audit_logs SET target_user_id = NULL WHERE target_user_id = target_user_id;

  -- 6. Xóa profile và auth.users của Cấp 1 (hoặc Cấp 2)
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'deleted_subordinates', deleted_sub_count,
    'message', format('Đã xóa thành công tài khoản và %s tài khoản cấp 2 liên quan.', deleted_sub_count)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Không thể xóa tài khoản Cấp 1. Một hoặc nhiều tài khoản Cấp 2 chưa thể xóa. Vui lòng thử lại.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Đồng bộ rpc_safe_delete_account hiện tại gọi rpc_delete_account_cascade
CREATE OR REPLACE FUNCTION public.rpc_safe_delete_account(target_user_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN public.rpc_delete_account_cascade(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Cấp quyền thực thi
GRANT EXECUTE ON FUNCTION public.rpc_delete_account_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_safe_delete_account(uuid) TO authenticated;
