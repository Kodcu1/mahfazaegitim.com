-- ==============================================================================
-- 0022: Atomic Idempotent XP Engine Procedure (Backend Lock & Ledger Integrity)
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.award_xp_idempotent(
    p_student_id UUID,
    p_amount INTEGER,
    p_action_type TEXT,
    p_description TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_xp_row public.students_xp_data%ROWTYPE;
    v_new_wallet INTEGER;
    v_new_lifetime INTEGER;
    v_tx_id UUID;
BEGIN
    -- 1. SECURITY: Ensure authenticated session
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify authorization: Caller must be admin, coach, teacher, or the student themselves
    SELECT role::text INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_id <> p_student_id AND COALESCE(v_caller_role, '') NOT IN ('admin', 'coach', 'teacher') THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not permitted to modify XP for student %', p_student_id;
    END IF;

    -- 2. ROW-LEVEL LOCK: Lock the student's XP record to serialize concurrent operations
    SELECT * INTO v_xp_row
    FROM public.students_xp_data
    WHERE student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.students_xp_data (
            student_id,
            lifetime_xp,
            wallet_xp,
            current_streak_days,
            last_activity_date,
            today_earned_xp,
            updated_at
        ) VALUES (
            p_student_id,
            GREATEST(0, p_amount),
            GREATEST(0, p_amount),
            1,
            CURRENT_DATE,
            GREATEST(0, p_amount),
            timezone('utc'::text, now())
        )
        RETURNING * INTO v_xp_row;
    END IF;

    -- 3. IDEMPOTENCY CHECK (Post-Lock): Abort safely if reference_id already processed
    IF p_reference_id IS NOT NULL AND trim(p_reference_id) <> '' THEN
        IF EXISTS (
            SELECT 1
            FROM public.xp_transactions
            WHERE student_id = p_student_id
              AND reference_id = trim(p_reference_id)
        ) THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_awarded', true,
                'awarded_xp', 0,
                'wallet_xp', v_xp_row.wallet_xp,
                'lifetime_xp', v_xp_row.lifetime_xp,
                'message', 'XP already awarded for this reference ID.'
            );
        END IF;
    END IF;

    -- 4. ATOMIC CALCULATION
    v_new_wallet := GREATEST(0, v_xp_row.wallet_xp + p_amount);
    v_new_lifetime := CASE 
        WHEN p_amount > 0 THEN v_xp_row.lifetime_xp + p_amount 
        ELSE v_xp_row.lifetime_xp 
    END;

    -- 5. ATOMIC UPDATES: students_xp_data table
    UPDATE public.students_xp_data
    SET wallet_xp = v_new_wallet,
        lifetime_xp = v_new_lifetime,
        last_activity_date = CURRENT_DATE,
        today_earned_xp = CASE 
            WHEN p_amount > 0 THEN students_xp_data.today_earned_xp + p_amount 
            ELSE students_xp_data.today_earned_xp 
        END,
        updated_at = timezone('utc'::text, now())
    WHERE student_id = p_student_id;

    -- 6. ATOMIC UPDATES: profiles table balances
    UPDATE public.profiles
    SET xp = v_new_wallet,
        wallet_xp = v_new_wallet,
        total_xp = v_new_lifetime,
        lifetime_xp = v_new_lifetime,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_student_id;

    -- 7. ATOMIC INSERT: xp_transactions ledger
    INSERT INTO public.xp_transactions (
        student_id,
        amount,
        transaction_type,
        description,
        reference_id,
        created_at
    ) VALUES (
        p_student_id,
        p_amount,
        p_action_type,
        p_description,
        NULLIF(trim(p_reference_id), ''),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_awarded', false,
        'transaction_id', v_tx_id,
        'awarded_xp', p_amount,
        'wallet_xp', v_new_wallet,
        'lifetime_xp', v_new_lifetime,
        'message', 'XP successfully and atomically awarded.'
    );
END;
$$;
