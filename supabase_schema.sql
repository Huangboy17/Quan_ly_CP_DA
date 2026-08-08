-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR QUAN LY CHI PHI & HOP DONG (BUILD COST)
-- ====================================================================

-- 1. BẢNG DỰ ÁN (PROJECTS)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG HỢP ĐỒNG (CONTRACTS)
CREATE TABLE IF NOT EXISTS public.contracts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  content TEXT,
  contractor TEXT,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  signing_date DATE,
  duration_type TEXT DEFAULT 'days',
  execution_days INTEGER DEFAULT 0,
  end_date DATE,
  estimated_settlement_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG THANH TOÁN (PAYMENTS)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  contract_id TEXT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_phase INTEGER DEFAULT 1,
  payment_date DATE NOT NULL,
  amount_before_vat NUMERIC DEFAULT 0,
  vat_rate NUMERIC DEFAULT 10,
  vat_amount NUMERIC DEFAULT 0,
  amount_after_vat NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- BẬT ROW LEVEL SECURITY (RLS) - BẢO BỆ DỮ LIỆU CHÍNH HÃNG THEO USER_ID
-- ====================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 1. Policy cho bảng projects
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
CREATE POLICY "Users can manage their own projects"
  ON public.projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Policy cho bảng contracts
DROP POLICY IF EXISTS "Users can manage their own contracts" ON public.contracts;
CREATE POLICY "Users can manage their own contracts"
  ON public.contracts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Policy cho bảng payments
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
CREATE POLICY "Users can manage their own payments"
  ON public.payments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- TẠO INDEXES TỐI ƯU HÓA TỐC ĐỘ TRUY VẤN REAL-TIME
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
