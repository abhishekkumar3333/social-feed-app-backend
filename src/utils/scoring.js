/**
 * Calculates a ranking score for a post based on engagement and age.
 * formula: score = (likes * 1 + comments * 1.5 + shares * 2) / (age_hours + 2) ^ 1.8
 * 
 * @param {Object} params
 * @param {number} params.likes
 * @param {number} params.comments
 * @param {number} params.shares
 * @param {Date} params.createdAt
 * @returns {number} 
 */
const { SCORING_WEIGHTS } = require('../config/appConfig');

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
