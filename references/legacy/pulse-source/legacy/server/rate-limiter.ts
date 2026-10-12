
const userRequestsMap = new Map<string, number[]>();
const userPlansMap = new Map<string, string>(); // userId -> planName

/**
 * Checks if a user has exceeded their daily generation limit.
 */
export const checkDailyLimit = (userId: string): { allowed: boolean; remaining: number; plan: string } => {
  const plan = userPlansMap.get(userId) || 'Free';
  
  // Pro and Enterprise have unlimited generations
  if (plan === 'Pro' || plan === 'Enterprise') {
    return { allowed: true, remaining: 999, plan };
  }

  const limit = 10; // Free plan limit
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (!userRequestsMap.has(userId)) {
    userRequestsMap.set(userId, [now]);
    return { allowed: true, remaining: limit - 1, plan };
  }

  const userRequests = userRequestsMap.get(userId)!;
  const activeRequests = userRequests.filter(time => now - time < oneDayMs);
  
  if (activeRequests.length >= limit) {
    return { allowed: false, remaining: 0, plan };
  }

  activeRequests.push(now);
  userRequestsMap.set(userId, activeRequests);
  
  return { allowed: true, remaining: limit - activeRequests.length, plan };
};

/**
 * Update user plan (e.g., after upgrade)
 */
export const updateUserPlan = (userId: string, plan: string) => {
  userPlansMap.set(userId, plan);
};

/**
 * Reset limit for a user
 */
export const resetUserLimit = (userId: string) => {
  userRequestsMap.delete(userId);
};
