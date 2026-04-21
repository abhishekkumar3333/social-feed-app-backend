module.exports = {
  POST_MAX_LENGTH: 280,
  BAD_WORDS: (process.env.BAD_WORDS || 'spam,abuse,hate,scam').split(','),
  SCORING_WEIGHTS: {
    LIKE: 1,
    COMMENT: 1.5,
    SHARE: 2,
    DECAY_EXPONENT: 1.8,
    AGE_OFFSET: 2,
  },
  JWT_EXPIRE: '30d',
  QUEUES: {
    MODERATION: 'moderation',
    FANOUT: 'fanout',
    NOTIFICATION: 'notification',
    EMAIL: 'email',
    ANALYTICS: 'analytics',
  }
};
