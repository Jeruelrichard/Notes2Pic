-- =============================================================================
-- Notes2Pic: Credit Limits Migration
-- 1. Free exports: 5 per month (across short, medium, carousel)
-- 2. Free carousels: 3 per month (tied to the 5 monthly export credits)
-- 3. Free AI thread generations: 3 lifetime credits (separate from exports)
-- =============================================================================

-- 1. Update record_export RPC
create or replace function public.record_export(p_kind text default 'other')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_paid boolean;
  v_total_count int;
  v_carousel_count int;
  v_free_total_limit int := 5;
  v_free_carousel_limit int := 3;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('allowed', false, 'reason', 'not_authenticated');
  end if;

  v_paid := public.is_paid(v_user_id);
  if v_paid then
    insert into public.exports (user_id, kind) values (v_user_id, p_kind);
    return json_build_object('allowed', true, 'watermark', false, 'remaining', null);
  end if;

  -- Count exports in rolling 30-day window
  select count(*) into v_total_count
  from public.exports
  where user_id = v_user_id
    and created_at > (now() - interval '30 days');

  if v_total_count >= v_free_total_limit then
    return json_build_object(
      'allowed', false,
      'reason', 'export_limit',
      'used', v_total_count,
      'limit', v_free_total_limit
    );
  end if;

  -- Sub-cap for carousels
  if p_kind = 'carousel' then
    select count(*) into v_carousel_count
    from public.exports
    where user_id = v_user_id
      and kind = 'carousel'
      and created_at > (now() - interval '30 days');

    if v_carousel_count >= v_free_carousel_limit then
      return json_build_object(
        'allowed', false,
        'reason', 'carousel_limit',
        'used', v_carousel_count,
        'limit', v_free_carousel_limit
      );
    end if;
  end if;

  insert into public.exports (user_id, kind) values (v_user_id, p_kind);
  return json_build_object(
    'allowed', true,
    'watermark', true,
    'remaining', (v_free_total_limit - v_total_count - 1)
  );
end;
$$;

-- 2. Update record_generation RPC
create or replace function public.record_generation(p_kind text default 'thread')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_paid boolean;
  v_count int;
  v_free_limit int := 3;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('allowed', false, 'reason', 'not_authenticated');
  end if;

  v_paid := public.is_paid(v_user_id);
  if v_paid then
    insert into public.generations (user_id, kind) values (v_user_id, p_kind);
    return json_build_object('allowed', true, 'remaining', null);
  end if;

  -- Count lifetime generations
  select count(*) into v_count
  from public.generations
  where user_id = v_user_id;

  if v_count >= v_free_limit then
    return json_build_object(
      'allowed', false,
      'reason', 'generation_limit',
      'used', v_count,
      'limit', v_free_limit
    );
  end if;

  insert into public.generations (user_id, kind) values (v_user_id, p_kind);
  return json_build_object(
    'allowed', true,
    'remaining', (v_free_limit - v_count - 1)
  );
end;
$$;

-- 3. Update get_usage RPC
create or replace function public.get_usage()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_paid boolean;
  v_total_exports int;
  v_carousel_exports int;
  v_thread_generations int;
  v_free_total_limit int := 5;
  v_free_carousel_limit int := 3;
  v_free_thread_limit int := 3;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('authenticated', false);
  end if;

  v_paid := public.is_paid(v_user_id);
  if v_paid then
    return json_build_object(
      'authenticated', true,
      'paid', true,
      'plan', 'pro',
      'limit', null,
      'remaining', null,
      'carouselRemaining', null,
      'threadsRemaining', null
    );
  end if;

  select count(*) into v_total_exports
  from public.exports
  where user_id = v_user_id
    and created_at > (now() - interval '30 days');

  select count(*) into v_carousel_exports
  from public.exports
  where user_id = v_user_id
    and kind = 'carousel'
    and created_at > (now() - interval '30 days');

  select count(*) into v_thread_generations
  from public.generations
  where user_id = v_user_id;

  return json_build_object(
    'authenticated', true,
    'paid', false,
    'plan', 'free',
    'limit', v_free_total_limit,
    'used', v_total_exports,
    'remaining', greatest(0, v_free_total_limit - v_total_exports),
    'carouselUsed', v_carousel_exports,
    'carouselLimit', v_free_carousel_limit,
    'carouselRemaining', greatest(0, v_free_carousel_limit - v_carousel_exports),
    'threadsUsed', v_thread_generations,
    'threadsLimit', v_free_thread_limit,
    'threadsRemaining', greatest(0, v_free_thread_limit - v_thread_generations)
  );
end;
$$;
