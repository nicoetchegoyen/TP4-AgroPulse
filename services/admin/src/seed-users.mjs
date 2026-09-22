import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEMO_PASSWORD) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD are required');
}
if (DEMO_PASSWORD === 'CHANGE_ME_BEFORE_USE') throw new Error('Choose a real DEMO_PASSWORD in .env first');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const organizationId = '10000000-0000-4000-8000-000000000001';
const accounts = [
  { email: 'productor@agropulse.test', role: 'producer' },
  { email: 'operador@agropulse.test', role: 'operator' },
  { email: 'asesor@agropulse.test', role: 'advisor' },
];

async function findUser(email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

for (const account of accounts) {
  let user = await findUser(account.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: account.email.split('@')[0] },
    });
    if (error) throw error;
    user = data.user;
    console.info(`[seed] created ${account.email}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: DEMO_PASSWORD, email_confirm: true });
    if (error) throw error;
    console.info(`[seed] updated ${account.email}`);
  }

  const { error: membershipError } = await supabase.from('memberships').upsert({
    user_id: user.id,
    organization_id: organizationId,
    role: account.role,
  });
  if (membershipError) throw membershipError;
}

console.info('[seed] demo users and memberships are ready');
