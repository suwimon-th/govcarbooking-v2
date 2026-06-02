-- =========================================================================
-- GOV CAR BOOKING - DATABASE SCHEMA & SEED DATA (EXPORT FOR INSTRUCTOR)
-- Generated on: 2026-05-24
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Table Structure for: departments
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- -------------------------------------------------------------------------
-- 2. Table Structure for: profiles
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  role TEXT DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT now(),
  username TEXT,
  password TEXT,
  department_id INTEGER DEFAULT 1,
  position TEXT,
  line_user_id TEXT,
  line_picture_url TEXT,
  CONSTRAINT fk_profiles_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL
);

-- -------------------------------------------------------------------------
-- 3. Table Structure for: vehicles
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT,
  status TEXT DEFAULT 'ACTIVE',
  remark TEXT,
  created_at TIMESTAMP DEFAULT now(),
  plate_number TEXT,
  brand TEXT,
  model TEXT,
  color TEXT,
  photo_urls TEXT[],
  asset_number TEXT,
  received_date DATE,
  weight NUMERIC,
  tax_expire_date DATE,
  fuel_type TEXT,
  engine_size TEXT,
  drive_type TEXT,
  emission_standard TEXT
);

-- -------------------------------------------------------------------------
-- 4. Table Structure for: drivers
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  line_user_id TEXT,
  active BOOLEAN DEFAULT true,
  remark TEXT,
  created_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'AVAILABLE',
  queue_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  line_picture_url TEXT
);

-- -------------------------------------------------------------------------
-- 5. Table Structure for: inspection_items
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  option_a TEXT DEFAULT 'ปกติ',
  option_b TEXT DEFAULT 'มีปัญหา',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------------------------
-- 6. Table Structure for: bookings
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT,
  requester_id UUID NOT NULL,
  department_id INTEGER,
  vehicle_id UUID,
  driver_id UUID,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  assigned_at TIMESTAMP DEFAULT now(),
  driver_attempts INTEGER DEFAULT 0,
  requester_name TEXT,
  start_mileage INTEGER DEFAULT 0,
  end_mileage INTEGER,
  distance INTEGER,
  passenger_count INTEGER DEFAULT 1,
  destination TEXT,
  passengers JSONB,
  requester_position TEXT,
  is_ot BOOLEAN DEFAULT false,
  is_line_notified BOOLEAN DEFAULT false,
  is_satisfied BOOLEAN,
  evaluation_comment TEXT,
  remark TEXT,
  evaluation_scores JSONB,
  CONSTRAINT fk_bookings_requester_id FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_vehicle_id FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_driver_id FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 7. Table Structure for: mileage_logs
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mileage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  driver_id UUID,
  start_mileage INTEGER,
  end_mileage INTEGER,
  distance INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  logged_at TIMESTAMPTZ DEFAULT now(),
  vehicle_id UUID,
  CONSTRAINT fk_mileage_logs_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_mileage_logs_driver_id FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 8. Table Structure for: vehicle_issues
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  reporter_name TEXT NOT NULL,
  vehicle_id UUID,
  plate_number TEXT,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  admin_remark TEXT,
  CONSTRAINT fk_vehicle_issues_vehicle_id FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- 9. Table Structure for: fuel_requests
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  request_date DATE,
  request_number TEXT,
  system_quota TEXT,
  actual_amount NUMERIC,
  period TEXT
);

-- -------------------------------------------------------------------------
-- 10. Table Structure for: vehicle_inspections
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_name TEXT NOT NULL,
  inspector_position TEXT,
  plate_number TEXT NOT NULL,
  driver_name TEXT,
  inspection_date DATE NOT NULL,
  chief_name TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  item_exterior_damage BOOLEAN,
  item_cleanliness_interior BOOLEAN,
  item_cleanliness_exterior BOOLEAN,
  item_lighting_system BOOLEAN,
  item_air_conditioning BOOLEAN,
  item_dashboard_warning BOOLEAN,
  item_readiness BOOLEAN,
  item_engine_oil BOOLEAN,
  item_brake_oil BOOLEAN,
  item_fuel BOOLEAN,
  item_battery_water BOOLEAN,
  item_radiator_water BOOLEAN,
  status VARCHAR DEFAULT 'ACTIVE',
  item_tire_condition BOOLEAN,
  check_results JSONB
);

-- -------------------------------------------------------------------------
-- 11. Table Structure for: fogging_machines
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fogging_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);


-- =========================================================================
-- SEED DATA (ข้อมูลเริ่มต้นระบบเพื่อให้อาจารย์รันและทดสอบได้ทันที)
-- =========================================================================

-- 1. ล้างข้อมูลเก่า (หากมี) เพื่อหลีกเลี่ยงข้อขัดแย้งแบบปลอดภัย
-- TRUNCATE public.departments, public.profiles, public.vehicles, public.drivers, public.inspection_items, public.fogging_machines CASCADE;

-- 2. ข้อมูลฝ่าย/แผนก (Departments)
INSERT INTO public.departments (id, name) VALUES
(1, 'กลุ่มงานบริหารทั่วไป'),
(2, 'กลุ่มงานควบคุมโรคติดต่อ'),
(3, 'กลุ่มงานอนามัยสิ่งแวดล้อม'),
(4, 'กลุ่มงานบริการทางการแพทย์')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. ข้อมูลผู้ใช้ระบบสำหรับเข้าใช้งาน (Profiles - Username/Password)
-- หมายเหตุ: รหัสผ่านเก็บแบบข้อความดิบเพื่อให้จำง่ายและทดสอบได้สะดวกในสภาพแวดล้อมทดสอบการเรียน
INSERT INTO public.profiles (id, username, password, full_name, role, department_id, position) VALUES
('a0e8d0d5-1111-4444-8888-000000000001', 'admin', 'admin123', 'สมพงษ์ รักดี (ผู้ดูแลระบบ)', 'ADMIN', 1, 'หัวหน้างานบริหารทั่วไป'),
('a0e8d0d5-2222-4444-8888-000000000002', 'driver', 'driver123', 'บุญส่ง ใจดี (พนักงานขับรถ)', 'DRIVER', 1, 'พนักงานขับรถยนต์'),
('a0e8d0d5-3333-4444-8888-000000000003', 'user', 'user123', 'พิมลพา สุขใจ (ผู้ใช้ทั่วไป)', 'USER', 2, 'นักวิชาการสาธารณสุข')
ON CONFLICT (id) DO NOTHING;

-- 4. ข้อมูลพนักงานขับรถ (Drivers)
INSERT INTO public.drivers (id, full_name, phone, status, queue_order, active, is_active) VALUES
('b0e8d0d5-1111-4444-8888-000000000001', 'นายบุญส่ง ใจดี', '081-234-5678', 'AVAILABLE', 1, true, true),
('b0e8d0d5-2222-4444-8888-000000000002', 'นายสมคิด ขยันยิ่ง', '082-345-6789', 'AVAILABLE', 2, true, true),
('b0e8d0d5-3333-4444-8888-000000000003', 'นายณรงค์ เก่งกาจ', '083-456-7890', 'AVAILABLE', 3, true, true)
ON CONFLICT (id) DO NOTHING;

-- 5. ข้อมูลยานพาหนะ (Vehicles)
INSERT INTO public.vehicles (id, name, type, brand, model, plate_number, color, status, fuel_type) VALUES
('c0e8d0d5-1111-4444-8888-000000000001', 'รถตู้โดยสาร 12 ที่นั่ง', 'VAN', 'Toyota', 'Commuter', 'นข-1234 นครราชสีมา', 'บรอนซ์เงิน', 'ACTIVE', 'DIESEL'),
('c0e8d0d5-2222-4444-8888-000000000002', 'รถกระบะขับเคลื่อน 4 ล้อ', 'PICKUP', 'Isuzu', 'D-Max', 'กข-5678 ขอนแก่น', 'ดำ', 'ACTIVE', 'DIESEL'),
('c0e8d0d5-3333-4444-8888-000000000003', 'รถพยาบาล/ฉุกเฉิน', 'AMBULANCE', 'Toyota', 'Hiace', 'พข-9999 กรุงเทพฯ', 'ขาว-แดง', 'ACTIVE', 'BENZINE')
ON CONFLICT (id) DO NOTHING;

-- 6. ข้อมูลรายการตรวจสภาพรถ (Inspection Items)
INSERT INTO public.inspection_items (id, key, label, sort_order) VALUES
(gen_random_uuid(), 'item_exterior_damage', 'ความเสียหายภายนอกรอบคัน', 1),
(gen_random_uuid(), 'item_cleanliness_interior', 'ความสะอาดภายในห้องโดยสาร', 2),
(gen_random_uuid(), 'item_cleanliness_exterior', 'ความสะอาดภายนอกตัวรถ', 3),
(gen_random_uuid(), 'item_lighting_system', 'ระบบสัญญาณไฟส่องสว่าง/ไฟเลี้ยว', 4),
(gen_random_uuid(), 'item_air_conditioning', 'ระบบเครื่องปรับอากาศความเย็น', 5),
(gen_random_uuid(), 'item_dashboard_warning', 'ไฟเตือนหน้าปัดรถยนต์', 6),
(gen_random_uuid(), 'item_tire_condition', 'สภาพและลมยางรถยนต์', 7),
(gen_random_uuid(), 'item_engine_oil', 'ระดับน้ำมันเครื่อง', 8),
(gen_random_uuid(), 'item_brake_oil', 'ระดับน้ำมันเบรกและน้ำมันคลัตช์', 9),
(gen_random_uuid(), 'item_fuel', 'ปริมาณน้ำมันเชื้อเพลิง', 10),
(gen_random_uuid(), 'item_battery_water', 'ระดับน้ำกลั่นแบตเตอรี่', 11),
(gen_random_uuid(), 'item_radiator_water', 'ระดับน้ำในหม้อน้ำและถังพักน้ำ', 12)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- 7. ข้อมูลเครื่องพ่นหมอกควัน (Fogging Machines)
INSERT INTO public.fogging_machines (id, code, status) VALUES
(gen_random_uuid(), 'FOG-01', 'ACTIVE'),
(gen_random_uuid(), 'FOG-02', 'ACTIVE'),
(gen_random_uuid(), 'FOG-03', 'OUT_OF_ORDER')
ON CONFLICT (id) DO NOTHING;

-- 8. Table Structure for: booking_audit_logs
CREATE TABLE IF NOT EXISTS public.booking_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  action_by UUID NOT NULL,
  action_by_name TEXT,
  action_at TIMESTAMPTZ DEFAULT now(),
  old_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  changes JSONB NOT NULL,
  CONSTRAINT fk_booking_audit_logs_booking_id FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE
);

-- 9. Table Structure for: print_history_logs
CREATE TABLE IF NOT EXISTS public.print_history_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printed_by UUID NOT NULL,
  printed_by_name TEXT,
  printed_at TIMESTAMPTZ DEFAULT now(),
  report_type TEXT NOT NULL,
  vehicle_id UUID,
  plate_number TEXT,
  driver_id UUID,
  driver_name TEXT,
  report_period TEXT,
  filters JSONB
);

