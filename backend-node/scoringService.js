
function calculateSkillsScore(matchingSkills, missingSkills) {
  const matched = matchingSkills.length;
  const missing = missingSkills.length;
  const total = matched + missing;

  if (total === 0) {
    return null;
  }

  return Math.round((matched / total) * 100);
}


function calculateOverallScore(breakdown) {
  const {
    skills_match,
    projects_match,
    education_match,
    keyword_match
  } = breakdown;

  return Math.round(
    skills_match * 0.4 +
    projects_match * 0.3 +
    education_match * 0.15 +
    keyword_match * 0.15
  );
}


module.exports = {
  calculateSkillsScore,
  calculateOverallScore
};
