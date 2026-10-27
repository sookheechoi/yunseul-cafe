const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const sbHeaders = () => ({
  apikey: SB_KEY,
  ...(String(SB_KEY).startsWith('eyJ') ? { Authorization: `Bearer ${SB_KEY}` } : {}),
  'Content-Type': 'application/json',
});
const MENU_CHOICES = ['미리 고르기', '현장에서 고르기'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 가능해요' });
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase 연결 정보가 없어요. Vercel Storage 연결 후 다시 배포해 주세요.' });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  if (b.website) return res.status(200).json({ ok: true }); // 스팸 함정 칸(사람에게는 안 보임)

  const people = parseInt(b.people, 10);
  const meetDate = clip(b.meet_date, 10);
  const row = {
    name: clip(b.name, 50),
    contact: clip(b.contact, 100),
    meet_date: /^\d{4}-\d{2}-\d{2}$/.test(meetDate) ? meetDate : null,
    people: Number.isInteger(people) && people > 0 && people <= 200 ? people : null,
    budget: clip(b.budget, 30),
    menu_choice: MENU_CHOICES.includes(b.menu_choice) ? b.menu_choice : '현장에서 고르기',
    consent: b.consent === true,
  };
  if (!row.name || !row.contact) return res.status(400).json({ error: '이름과 연락처를 적어 주세요' });
  if (!row.meet_date || !row.people) return res.status(400).json({ error: '모임 날짜와 인원을 적어 주세요' });
  if (!row.consent) return res.status(400).json({ error: '개인정보 수집·이용에 동의해 주세요' });

  const r = await fetch(`${SB_URL}/rest/v1/inquiries`, { method: 'POST', headers: { ...sbHeaders(), Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  if (!r.ok) return res.status(500).json({ error: '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.' });
  return res.status(200).json({ ok: true });
};
