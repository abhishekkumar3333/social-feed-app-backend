const { SCORING_WEIGHTS } = require('../constants');

const calculateScore = ({ likes = 0, comments = 0, shares = 0, createdAt }) => {
  const now = new Date();
  const ageInHours = (now - new Date(createdAt)) / (1000 * 60 * 60);
  
  const interactionWeight = 
    (likes * SCORING_WEIGHTS.LIKE) + 
    (comments * SCORING_WEIGHTS.COMMENT) + 
    (shares * SCORING_WEIGHTS.SHARE);

  const decayFactor = Math.pow(ageInHours + SCORING_WEIGHTS.AGE_OFFSET, SCORING_WEIGHTS.DECAY_EXPONENT);
  
  return interactionWeight / decayFactor;
};

module.exports = { calculateScore };
