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
    const { email, password, fullName, role = 'level_2' } = await req.json()

    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ error: 'Thiếu thông tin bắt buộc (Email, Mật khẩu, Họ tên)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Chỉ cho phép tạo level_2
    if (role !== 'level_2') {
       return new Response(JSON.stringify({ error: 'Chỉ được phép tạo tài khoản Cấp 2.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Check Caller Role (Must be level_1 or super_admin)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, id')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || (callerProfile.role !== 'level_1' && callerProfile.role !== 'super_admin')) {
      return new Response(JSON.stringify({ error: 'Không có quyền tạo tài khoản.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Set parent_id (Người sở hữu Cấp 2 này)
    const parentId = caller.id;

    // 6. CHECK QUOTA USING RPC (Atomic Lock)
    const { data: hasQuota, error: quotaError } = await supabaseAdmin.rpc('rpc_check_and_lock_quota', { p_parent_id: parentId })
    
    if (quotaError) {
       console.error("Quota Check Error:", quotaError)
       return new Response(JSON.stringify({ error: 'Lỗi kiểm tra Quota: ' + quotaError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       })
    }

    if (!hasQuota) {
      return new Response(JSON.stringify({ error: 'Đã vượt quá số lượng Quota tối đa cho phép. Vui lòng nâng cấp gói hoặc lưu trữ (archive) các tài khoản cũ.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 7. CREATE AUTH USER (Không làm mất session của caller vì chạy bằng admin api)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto confirm email
      user_metadata: {
        full_name: fullName,
      }
    })

    if (createError) {
      console.error("Auth Create Error:", createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. UPDATE PROFILE (vì trigger handle_new_user đã tạo profile mặc định là level_1/pending)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: role,
        parent_id: parentId,
        status: 'active',
        max_quota: 0
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      // Rollback (Delete auth user if profile update fails)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      console.error("Profile Update Error:", profileError)
      return new Response(JSON.stringify({ error: 'Lỗi tạo hồ sơ tài khoản: ' + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 9. SUCCESS
    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: newUser.user.id, email: newUser.user.email, role } 
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
