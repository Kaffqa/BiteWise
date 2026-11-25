-- Migration: Make medical condition matching case-insensitive in calculate_profile_metrics()
-- Fixes 'Hypertension', 'Diabetes Type 1', and 'Diabetes Type 2' not triggering sodium/sugar caps.

CREATE OR REPLACE FUNCTION calculate_profile_metrics()
RETURNS trigger AS $$
DECLARE
    age INTEGER;
    bmr NUMERIC;
    tdee NUMERIC;
    activity_multiplier NUMERIC;
    caloric_adjustment NUMERIC;
BEGIN
    IF NEW.height_cm IS NOT NULL AND NEW.weight_kg IS NOT NULL AND NEW.birth_date IS NOT NULL THEN
        age := EXTRACT(YEAR FROM age(NEW.birth_date));

        IF NEW.gender = 'male' THEN
            bmr := (10 * NEW.weight_kg) + (6.25 * NEW.height_cm) - (5 * age) + 5;
        ELSIF NEW.gender = 'female' THEN
            bmr := (10 * NEW.weight_kg) + (6.25 * NEW.height_cm) - (5 * age) - 161;
        ELSE
            bmr := (10 * NEW.weight_kg) + (6.25 * NEW.height_cm) - (5 * age) - 78;
        END IF;

        NEW.calculated_bmr := bmr;

        activity_multiplier := CASE NEW.activity_level
            WHEN 'sedentary' THEN 1.2
            WHEN 'lightly_active' THEN 1.375
            WHEN 'moderately_active' THEN 1.55
            WHEN 'very_active' THEN 1.725
            WHEN 'extra_active' THEN 1.9
            ELSE 1.2
        END;

        tdee := bmr * activity_multiplier;
        NEW.calculated_tdee := tdee;

        caloric_adjustment := CASE NEW.goal
            WHEN 'lose_weight_fast' THEN -750
            WHEN 'lose_weight_gradual' THEN -500
            WHEN 'gain_muscle' THEN 300
            ELSE 0
        END;

        NEW.target_calories := tdee + caloric_adjustment;
        NEW.target_protein_g := (NEW.target_calories * 0.30) / 4;
        NEW.target_carbs_g := (NEW.target_calories * 0.40) / 4;
        NEW.target_fat_g := (NEW.target_calories * 0.30) / 9;
        NEW.target_fiber_g := 28;
        NEW.target_sodium_mg := 2300;
        NEW.target_sugar_g := 50;

        IF EXISTS (
            SELECT 1 FROM unnest(COALESCE(NEW.medical_conditions, '{}'::text[])) AS mc
            WHERE lower(mc) LIKE '%hypertension%'
        ) THEN
            NEW.target_sodium_mg := 1500;
        END IF;

        IF EXISTS (
            SELECT 1 FROM unnest(COALESCE(NEW.medical_conditions, '{}'::text[])) AS mc
            WHERE lower(mc) LIKE '%diabetes%'
        ) THEN
            NEW.target_sugar_g := 25;
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing profiles so Hypertension/Diabetes limits apply immediately
UPDATE public.profiles
SET updated_at = now()
WHERE height_cm IS NOT NULL AND weight_kg IS NOT NULL AND birth_date IS NOT NULL;
