// Generic demonstration settings. Keep personal preferences in environment variables,
// never in a publicly committed repository.
// Immigration screening is a keyword-based aid, not legal advice. Verify employer postings.
function listSetting(name, defaults, delimiter=',') {
  const raw=process.env[name];
  if (!raw?.trim()) return defaults;
  return [...new Set(raw.split(delimiter).map(s=>s.trim()).filter(Boolean))];
}
export const EMPLOYERS = listSetting('JOB_SCOUT_EMPLOYERS', ['Google','Microsoft','Amazon']);
export const LOCATIONS = listSetting('JOB_SCOUT_LOCATIONS', ['US-remote'], ';');
export const RESUMES = {
  backend: process.env.JOB_SCOUT_BACKEND_RESUME || 'backend-resume.pdf',
  cloud: process.env.JOB_SCOUT_CLOUD_RESUME || 'cloud-resume.pdf',
  productivity: process.env.JOB_SCOUT_PRODUCTIVITY_RESUME || 'developer-productivity-resume.pdf'
};
const NO_SPONSORSHIP_PATTERNS = [
  /(?:do(?:es)? not|will not|cannot|can't|unable to|not able to|won't)\s+(?:offer|provide|consider|support)?\s*(?:visa|immigration|h[\s-]?1b|work\s+visa)?\s*sponsors?(?:hip|hips)?/i,
  /\bno\s+(?:visa|immigration|h[\s-]?1b)?\s*sponsorship\b(?:\s+(?:available|offered|provided|for this role|at this time))?/i,
  /(?:not|ineligible)\s+(?:eligible\s+)?(?:for\s+)?(?:visa|immigration|h[\s-]?1b)?\s*sponsorship/i,
  /(?:will not|cannot|can't|unable to|not able to)\s+(?:be able to\s+)?(?:provide|offer|support|consider)?\s*(?:visa|immigration|h[\s-]?1b)?\s*sponsorship/i,
  /(?:sponsorship|h[\s-]?1b\s+(?:visa|transfer))\s+(?:is\s+)?(?:not available|not offered|unavailable|not provided|not supported)/i,
  /(?:must|need to|required to)\s+(?:be\s+)?(?:currently\s+)?(?:legally\s+)?authorized\s+to\s+work[^.;\n]{0,180}\bwithout\b[^.;\n]{0,100}\bsponsorship\b/i,
  /(?:must|need to)\s+not\s+require\s+(?:visa\s+)?sponsorship\s+(?:now|currently|in the future)/i,
  /(?:not|no)\s+eligible\s+(?:for\s+)?h[\s-]?1b\s+transfer/i,
  /(?:u\.?s\.?\s+citizenship|u\.?s\.?\s+citizens)\s+(?:only|required)/i,
  // Alternate wording in careers listings about transfers and employer petitions.
  /(?:this\s+)?(?:position|role|company|employer|we)\s+(?:does\s+not|do\s+not|will\s+not|cannot|can't|won't)\s+(?:support|accept|permit|allow|facilitate)\s+(?:h[\s-]?1b|h[\s-]?1b\s+visa|visa)\s+(?:visa\s+)?transfers?/i,
  /(?:we\s+are|company\s+is|employer\s+is)\s+(?:not\s+able|unable)\s+to\s+(?:transfer|process)\s+(?:your\s+|an?\s+)?h[\s-]?1b\b/i,
  /(?:h[\s-]?1b|visa)\s+(?:visa\s+)?transfers?\s+(?:are|is)\s+(?:not\s+supported|not\s+accepted|unavailable|not\s+permitted)/i,
  /(?:employment\s+)?(?:visa|immigration|h[\s-]?1b)\s+sponsorship\s+(?:will|would|can)\s+not\s+be\s+(?:considered|offered|provided|supported|available)/i,
  /(?:must|should|need\s+to|required\s+to|have\s+to)\s+(?:be\s+)?(?:legally\s+)?(?:eligible|authorized)\s+to\s+work[^.;\n]{0,180}\bwithout\s+(?:the\s+)?(?:(?:need|requirement)\s+for\s+|(?:needing|requiring)\s+)?(?:visa\s+|employer\s+|company\s+)?sponsorship\b/i,
];
const POSITIVE_PATTERNS = [
  /(?:h[\s-]?1b\s+(?:visa\s+)?(?:transfers?|sponsorship))\s+(?:are|is)\s+(?:accepted|supported|available|provided)/i,
  /(?:visa|immigration)\s+sponsorship\s+(?:is\s+)?(?:available|provided|offered)\s+(?:for\s+)?(?:this\s+role|qualified\s+candidates|this\s+position)?/i,
  /(?:we|company)\s+(?:will|can|do)\s+sponsor\s+(?:qualified\s+)?(?:candidates|employees|h[\s-]?1b\s+(?:applicants|visas?))/i
];
export function classifySponsorship(text='') {
  if (typeof text !== 'string' || !text.trim()) return {status:'not_stated',evidence:null};
  for (const re of NO_SPONSORSHIP_PATTERNS) {
    const match = re.exec(text);
    if (match) return {status:'explicitly_excluded',evidence:excerpt(text,match.index,match[0].length)};
  }
  for (const re of POSITIVE_PATTERNS) {
    const match = re.exec(text);
    if (match) return {status:'appears_supported_verify_official',evidence:excerpt(text,match.index,match[0].length)};
  }
  return {status:'not_stated',evidence:null};
}
function excerpt(s,start,len) {return s.slice(Math.max(0,start-40), Math.min(s.length,start+len+65)).replace(/\s+/g,' ').trim();}
export function chooseResume(title='',description='') {
  const t = `${title}`.toLowerCase();
  const d = `${description}`.toLowerCase();
  const rules = {
    productivity:[/developer\s+(?:experience|productivity|tools|platform)/i,/build\s+(?:systems?|infrastructure|engineering|tooling)/i,/ci\s*\/\s*cd|release\s+(?:engineering|platform)|deployment\s+automation|buildkite|devex/i],
    cloud:[/cloud\s+(?:infrastructure|platform|engineering|engineer)/i,/site\s+reliability|sre|infrastructure\s+engineer|platform\s+infrastructure/i,/kubernetes|terraform|aws|multi.region|cloudformation|observability/i],
    backend:[/backend|back.end|distributed\s+systems?|microservices?|java\s+engineer/i,/rest\s+api|spring\s+boot|dynamodb|kafka|api\s+design|event.driven/i]
  };
  const score={backend:0,cloud:0,productivity:0};
  for (const [type,patterns] of Object.entries(rules)) {
    for(const re of patterns) {if(re.test(t)) score[type]+=5; if(re.test(d)) score[type]+=1;}
  }
  // Tie-breaker: title-first signal; default backend is most broadly representative.
  const best=Object.entries(score).sort((a,b)=>b[1]-a[1] || ['backend','cloud','productivity'].indexOf(a[0])-['backend','cloud','productivity'].indexOf(b[0]))[0][0];
  return {category:best,file:RESUMES[best],reason:{backend:'Java, APIs, and distributed backend systems',cloud:'AWS, cloud infrastructure, and reliability',productivity:'Buildkite, release automation, and developer tooling'}[best]};
}
export function orderedMatchingJobs(jobs=[]) {
  const included=[],excluded=[];
  for(const job of jobs) {
    const sponsorship=classifySponsorship(job.officialPostingText || job.description || '');
    const matched={...job,sponsorship,officialVerification:job.officialPostingText ? 'Caller-provided official posting text; URL/content must be independently checked' : 'No official posting text provided; eligibility unverified',resume:chooseResume(job.title,job.officialPostingText || job.description)};
    (sponsorship.status==='explicitly_excluded'?excluded:included).push(matched);
  }
  const parseDate = j => {const d=j.officialPostedAt || j.postedDate; if(!d || !/^\d{4}-\d{2}-\d{2}/.test(d))return -Infinity; const n=Date.parse(d);return Number.isNaN(n)?-Infinity:n;};
  included.sort((a,b)=>parseDate(b)-parseDate(a) || String(a.company||'').localeCompare(String(b.company||'')) || String(a.title||'').localeCompare(String(b.title||'')));
  return {count:included.length, excludedCount:excluded.length, jobs:included, excluded:excluded.map(({id,company,title,sponsorship})=>({id,company,title,sponsorship})),dateNote:'Dates from the caller or provider; no invented dates. Unknown dates sort last.'};
}
