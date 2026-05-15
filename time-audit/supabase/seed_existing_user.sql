-- One-shot: seed activities for any signed-up user that has none yet.
-- Safe to re-run (the NOT EXISTS check skips users who already have activities).

insert into public.activities (user_id, tier, name, sort_order)
select u.id, t.tier, t.name, t.sort_order
from auth.users u
cross join (values
  ('tier_10k',  'Receiving coaching',                10),
  ('tier_10k',  'Deal negotiation/preparation',      20),
  ('tier_10k',  'Raising capital systems/duties',    30),
  ('tier_10k',  'Organizing/planning schedule',      40),
  ('tier_10k',  'Networking/relationship building',  50),
  ('tier_10k',  'Working on the business',           60),
  ('tier_10k',  'MM involvement and courses',        70),
  ('tier_10k',  'Speaking engagements',              80),

  ('tier_1k',   'Phone text',                        10),
  ('tier_1k',   'Phone call',                        20),
  ('tier_1k',   'Weekly value add / podcasts',       30),
  ('tier_1k',   'Team / individual meetings',        40),
  ('tier_1k',   'Social media posts for business',   50),
  ('tier_1k',   'Balance sheet / P&L review',        60),
  ('tier_1k',   'Random fires',                      70),

  ('tier_mid',  'Paperwork (physical & digital)',    10),
  ('tier_mid',  'News',                              20),
  ('tier_mid',  'Wire money',                        30),
  ('tier_mid',  'Transfer funds',                    40),
  ('tier_mid',  'Walking projects',                  50),
  ('tier_mid',  'Email',                             60),
  ('tier_mid',  'Transaction coordination',          70),
  ('tier_mid',  'Haircut',                           80),

  ('tier_zero', 'Stretching / body work',            10),
  ('tier_zero', 'Recharge',                          20),
  ('tier_zero', 'Entertainment',                     30),
  ('tier_zero', 'Eating',                            40),
  ('tier_zero', 'Gym',                               50),
  ('tier_zero', 'Cold plunge',                       60),
  ('tier_zero', 'Shower',                            70),
  ('tier_zero', 'Bathroom',                          80),
  ('tier_zero', 'Driving',                           90),
  ('tier_zero', 'Jamie time',                       100),
  ('tier_zero', 'YouTube',                          110),
  ('tier_zero', 'Social media leisure',             120),
  ('tier_zero', 'Amazon shop',                      130),
  ('tier_zero', 'Household responsibilities',       140),
  ('tier_zero', 'Check calendar',                   150),
  ('tier_zero', 'Personal life planning',           160),
  ('tier_zero', 'Dentist appointment',              170)
) as t(tier, name, sort_order)
where not exists (
  select 1 from public.activities a where a.user_id = u.id
);
