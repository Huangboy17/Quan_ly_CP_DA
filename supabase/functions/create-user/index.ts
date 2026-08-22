import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Supabase Admin Client using SERVICE_ROLE_KEY (Bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Verify the caller (Must be logged in)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Parse request body
    const { email, password, fullName, phone, jobTitle, title } = await req.json()
    const effectiveJobTitle = jobTitle || title || null

    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ error: 'Thiếu thông tin bắt buộc (Email, Mật khẩu, Họ tên)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Check Caller Role & Status (Must be active level_1 or super_admin)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, id, status')
      .eq('id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy hồ sơ người dùng.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (callerProfile.role !== 'level_1' && callerProfile.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Không có quyền tạo tài khoản.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (callerProfile.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Tài khoản của bạn không ở trạng thái hoạt động.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Backend tự xác định parent_id — KHÔNG lấy từ frontend
    const parentId = caller.id

    // 6. CHECK QUOTA USING RPC (Atomic Lock — chống race condition)
    const { data: hasQuota, error: quotaError } = await supabaseAdmin.rpc('rpc_check_and_lock_quota', { p_parent_id: parentId })
    
    if (quotaError) {
       console.error("Quota Check Error:", quotaError)
       return new Response(JSON.stringify({ error: 'Lỗi kiểm tra hạn mức: ' + quotaError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       })
    }

    if (!hasQuota) {
      return new Response(JSON.stringify({ error: 'Đã đạt hạn mức thành viên tối đa. Vui lòng liên hệ quản trị viên để nâng cấp.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 7. CREATE AUTH USER với metadata để trigger tạo profile đúng
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        account_type: 'level_2',
        parent_id: parentId,
      }
    })

    if (createError) {
      console.error("Auth Create Error:", createError)
      // Xử lý lỗi email trùng
      if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
        return new Response(JSON.stringify({ error: 'Email này đã được đăng ký trong hệ thống.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. UPDATE PROFILE — đảm bảo chính xác dù trigger đã tạo
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'level_2',
        parent_id: parentId,
        status: 'active',
        full_name: fullName,
        phone: phone || null,
        job_title: effectiveJobTitle,
        max_quota: 0
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      // Rollback: xóa auth user nếu update profile thất bại
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      console.error("Profile Update Error:", profileError)
      return new Response(JSON.stringify({ error: 'Lỗi tạo hồ sơ tài khoản: ' + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 9. GHI AUDIT LOG
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: caller.id,
        target_user_id: newUser.user.id,
        action: 'create_level2',
        metadata: { email, full_name: fullName, parent_id: parentId }
      })

    // 10. SUCCESS
    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: newUser.user.id, email: newUser.user.email, role: 'level_2' } 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Internal Server Error:", error)
    return new Response(JSON.stringify({ error: 'Lỗi máy chủ nội bộ' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
