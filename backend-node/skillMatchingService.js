
const SKILL_ALIASES = {
  "JavaScript": ["javascript", "js"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3"],
  "Node.js": ["node.js", "nodejs"],
  "Express.js": ["express.js", "expressjs"],
  "REST APIs": [
    "rest api",
    "rest apis",
    "restful api",
    "restful apis"
  ],
  "Git": ["git"],
  "GitHub": ["github"],
  "SQL": ["sql"],
  "PostgreSQL": ["postgresql", "postgres"],
  "HTTP methods": [
    "http methods",
    "http verbs"
  ],
  "Debugging": ["debugging", "debug"],
  "Problem-solving": [
    "problem-solving",
    "problem solving"
  ],
  "Python": ["python"],
  "React": ["react", "react.js", "reactjs"],
  "MongoDB": ["mongodb", "mongo"],
  "Docker": ["docker"]
};

function containsTerm(text, term) {
  const escaped = term.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`,
    "i"
  );

  return pattern.test(text);
}

function findSkills(text) {
  return Object.entries(SKILL_ALIASES)
    .filter(([, aliases]) =>
      aliases.some(alias => containsTerm(text, alias))
    )
    .map(([skill]) => skill);
}

function validateSkills(analysis, jobDescription, resumeText) {
  const requiredSkills = findSkills(jobDescription);

  const resumeSkills = new Set(findSkills(resumeText));

  const matchingSkills = requiredSkills.filter(
    skill => resumeSkills.has(skill)
  );

  const missingSkills = requiredSkills.filter(
    skill => !resumeSkills.has(skill)
  );

  return {
    ...analysis,
    matching_skills: matchingSkills,
    missing_skills: missingSkills
  };
}

module.exports = {
  validateSkills,
  findSkills
};
