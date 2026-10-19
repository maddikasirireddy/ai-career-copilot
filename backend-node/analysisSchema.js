
const { z } = require("zod");

const score = z.number().int().min(0).max(100);

const roadmapPhase = z.object({
  title: z.string(),
  timeline: z.string(),
  topics: z.array(z.string()),
  projects: z.array(z.string())
});

const analysisSchema = z.object({
  match_score: score,
  ats_breakdown: z.object({
    skills_match: score,
    projects_match: score,
    education_match: score,
    keyword_match: score
  }),
  matching_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  suggestions: z.array(z.string()).length(3),
  interview_questions: z.array(z.string()).length(3),
  learning_roadmap: z.array(roadmapPhase).max(3)
});

module.exports = { analysisSchema };
