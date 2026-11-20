import { CASE_STUDY, SITE } from '../../config/site';
export function terminalCommand(value: string): {
  text: string;
  fileId?: string;
  clear?: boolean;
} {
  const command = value.trim().split(/\s+/)[0].toLowerCase();
  const navigation: Record<string, { text: string; fileId: string }> = {
    ls: {
      text: 'about.md  case-studies/  blog/\nOpening About.',
      fileId: 'content/about.md',
    },
    blog: { text: 'Opening Writing & Research.', fileId: 'blog-index' },
    'case-study': {
      text: 'Opening the AI Ads Workflow case study.',
      fileId: CASE_STUDY.fileId,
    },
  };
  if (navigation[command]) return navigation[command];
  if (command === 'clear') return { text: '', clear: true };
  const responses: Record<string, string> = {
    help: 'Available commands:\n  help        Show available commands\n  ls          List content and open About\n  blog        Open Writing & Research\n  case-study  Open the AI Ads Workflow case study\n  github      GitHub profile URL\n  whoami      About Achmad\n  projects    Selected work\n  contact     Email address\n  clear       Clear terminal history\n  sudo        Try your luck',
    github: SITE.github,
    whoami: `${SITE.name} — ${SITE.role}. I build reliable backend services, cloud infrastructure, and practical AI workflows.`,
    projects:
      'Peach Health Asia — discount management, AI workflows, automated reports\nAlivate — multi-agent AI and ads automation\nClickHouse Go client — open-source contribution',
    contact: `Email: ${SITE.email}`,
    sudo: 'User is not in the sudoers file. This incident will be reported.',
  };
  return {
    text:
      responses[command] ??
      (command ? `bash: ${command}: command not found` : ''),
  };
}
