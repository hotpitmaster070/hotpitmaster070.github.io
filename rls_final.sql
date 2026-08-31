-- ============================================
-- HotPit KITCHEN - PREMIUM RLS POLICIES
-- Надежность для детей. Включать только в конце.
-- Дата: 2026
-- ============================================

-- 1. ВКЛЮЧАЕМ ЗАМКИ
ALTER TABLE IF EXISTS restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurant_settings ENABLE ROW LEVEL SECURITY;

-- 2. ЧИСТИМ СТАРЫЕ ПОЛИТИКИ ЕСЛИ БЫЛИ (чтобы не было дублей)
DROP POLICY IF EXISTS "owner_can_all_own_restaurant" ON restaurants;
DROP POLICY IF EXISTS "owner_can_see_own_restaurant" ON restaurants;
DROP POLICY IF EXISTS "user_can_own_profile" ON profiles;
DROP POLICY IF EXISTS "user_can_see_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_see_colleagues_same_restaurant" ON profiles;
DROP POLICY IF EXISTS "settings_for_own_restaurant" ON restaurant_settings;

-- ============================================
-- TABLE: restaurants
-- Логика: Овнер создает и видит только свой ресторан
-- ============================================
CREATE POLICY "owner_can_all_own_restaurant"
ON restaurants FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ============================================
-- TABLE: profiles
-- Логика: Каждый управляет своим профилем
-- Но видит коллег из своего ресторана (нужно для команды)
-- ============================================
CREATE POLICY "user_can_own_profile"
ON profiles FOR ALL
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "colleagues_same_restaurant_select"
ON profiles FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- TABLE: restaurant_settings
-- Логика: Настройки видит только команда своего ресторана
-- ============================================
CREATE POLICY "settings_own_restaurant_all"
ON restaurant_settings FOR ALL
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- ПРОВЕРКА (запусти после включения)
-- ============================================
-- 1. Залогинься как Овнер -> SELECT * FROM restaurants -> должен видеть 1
-- 2. Залогинься как Шеф -> SELECT * FROM restaurants -> должен видеть 1 (свой)
-- 3. Создай 2-й аккаунт с другим рестораном -> первый не должен видеть второй
-- Если видишь ошибку "violates row-level security" - это ХОРОШО, замок работает!
