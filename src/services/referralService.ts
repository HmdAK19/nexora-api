import { referralRepository } from '../repositories/index.js';

const REWARD_RATE = 20;

export const referralService = {
  async getSummary(userId: string) {
    const referrals = await referralRepository.listByUser(userId);
    const rewardTotal = referrals.reduce((total, referral) => total + referral.rewardAmount, 0);

    return {
      code: `NEXORA-${userId
        .replace(/[^a-z0-9]/gi, '')
        .toUpperCase()
        .slice(0, 12)}`,
      inviteCount: referrals.length,
      qualifiedCount: referrals.filter((referral) => referral.status !== 'joined').length,
      referrals: referrals.map(({ userId: _userId, ...referral }) => referral),
      rewardCurrency: 'USDT' as const,
      rewardRate: REWARD_RATE,
      rewardTotal,
    };
  },
};
