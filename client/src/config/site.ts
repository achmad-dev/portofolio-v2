export const SITE = {
  name: 'Achmad Al Fazari',
  role: 'Backend, AI & Infrastructure Engineer',
  title: 'Achmad Al Fazari — Backend, AI & Infrastructure Engineer',
  description:
    'Building reliable backend services, cloud infrastructure, and practical AI workflows with Go, Python, and PostgreSQL.',
  email: 'alfayaquta@proton.me',
  github: 'https://github.com/achmad-dev',
};
export const CASE_STUDY = {
  fileId: 'case-studies/ai-ads-workflow-study.md',
  path: 'case-studies/ai-ads-workflow-study/',
  title: 'AI-Assisted Ad Creative and Landing Page Workflow',
  description:
    'How I designed an AI-assisted campaign workflow at Alivate with Go orchestration, structured contracts, reference selection, and creative review.',
};
export const caseStudyHref = (base = '/') => `${base}${CASE_STUDY.path}`;
