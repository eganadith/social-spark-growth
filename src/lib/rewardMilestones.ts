/** Mirrors Edge Function rewards — free likes unlocked per paid referral count. */
export const REWARD_MILESTONES = [
  { referrals: 1, code: "FREE100", likes: 100 },
  { referrals: 3, code: "FREE500", likes: 500 },
  { referrals: 5, code: "FREE1000", likes: 1000 },
  { referrals: 10, code: "FREE2500", likes: 2500 },
] as const;
