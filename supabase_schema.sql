-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR QUAN LY CHI PHI & HOP DONG (BUILD COST)
-- Schema thực tế đang sử dụng trên Supabase
-- ====================================================================

-- 1. BẢNG DỰ ÁN (PROJECTS)
-- Table: public.du_an
CREATE TABLE IF NOT EXISTS public.du_an (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ma_du_an TEXT NOT NULL,
  ten_du_an TEXT NOT NULL,
  dia_chi TEXT,
  chu_dau_tu TEXT,
  tong_muc_dau_tu NUMERIC,
  thoi_gian_thuc_hien INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BẢNG HỢP ĐỒNG (CONTRACTS)
-- Table: public.hop_dong
CREATE TABLE IF NOT EXISTS public.hop_dong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.du_an(id) ON DELETE CASCADE,
  so_hop_dong TEXT NOT NULL,
  noi_dung_hop_dong TEXT,
  gia_tri_truoc_vat NUMERIC,
  vat NUMERIC,
  gia_tri_sau_vat NUMERIC,
  nha_thau TEXT,
  ngay_ky DATE,
  tien_do_hop_dong INTEGER,
  ngay_ket_thuc DATE,
  nhom_chi_phi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BẢNG THANH TOÁN (PAYMENTS)
-- Table: public.thanh_toan_chi_phi
CREATE TABLE IF NOT EXISTS public.thanh_toan_chi_phi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.du_an(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.hop_dong(id) ON DELETE SET NULL,
  dot_thanh_toan INTEGER,
  loai_thanh_toan TEXT,
  so_tien NUMERIC,
  ngay_thanh_toan DATE,
  noi_dung TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- BẬT ROW LEVEL SECURITY (RLS) - BẢO VỆ DỮ LIỆU THEO USER_ID
-- ====================================================================

ALTER TABLE public.du_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hop_dong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thanh_toan_chi_phi ENABLE ROW LEVEL SECURITY;

-- 1. Policy cho bảng du_an
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.du_an;
CREATE POLICY "Users can manage their own projects"
  ON public.du_an
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Policy cho bảng hop_dong
DROP POLICY IF EXISTS "Users can manage their own contracts" ON public.hop_dong;
CREATE POLICY "Users can manage their own contracts"
  ON public.hop_dong
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Policy cho bảng thanh_toan_chi_phi
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.thanh_toan_chi_phi;
CREATE POLICY "Users can manage their own payments"
  ON public.thanh_toan_chi_phi
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- TẠO INDEXES TỐI ƯU HÓA TỐC ĐỘ TRUY VẤN
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_du_an_user_id ON public.du_an(user_id);
CREATE INDEX IF NOT EXISTS idx_hop_dong_user_id ON public.hop_dong(user_id);
CREATE INDEX IF NOT EXISTS idx_hop_dong_project_id ON public.hop_dong(project_id);
CREATE INDEX IF NOT EXISTS idx_thanh_toan_user_id ON public.thanh_toan_chi_phi(user_id);
CREATE INDEX IF NOT EXISTS idx_thanh_toan_contract_id ON public.thanh_toan_chi_phi(contract_id);
