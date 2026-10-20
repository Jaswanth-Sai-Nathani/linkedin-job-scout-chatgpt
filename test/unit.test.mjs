import test from 'node:test';import assert from 'node:assert/strict';
import {EMPLOYERS,RESUMES,classifySponsorship,chooseResume,orderedMatchingJobs} from '../src/policy.mjs';

test('26 targets, exact three resume files',()=>{assert.equal(EMPLOYERS.length,26);assert.equal(EMPLOYERS.includes('Discord'),true);assert.equal(EMPLOYERS.includes('PNW'),true);assert.deepEqual(Object.values(RESUMES),['Resume_Jaswanth(3).pdf','Resume_Jaswanth(4).pdf','Resume_Jaswanth(5).pdf']);});
test('exclude explicit no-sponsorship variants',()=>{
 for(const text of ['We do not offer visa sponsorship for this role.','Applicants must be authorized to work in the US without company sponsorship now or in the future.','Visa sponsorship is not available.','The company will not sponsor H-1B visas.'])assert.equal(classifySponsorship(text).status,'explicitly_excluded',text);
});
test('not stated remains unknown; positive needs verification',()=>{
 assert.equal(classifySponsorship('Equal opportunity employer.').status,'not_stated');
 assert.equal(classifySponsorship('H-1B transfers are accepted.').status,'appears_supported_verify_official');
});
test('resume matching',()=>{
 assert.equal(chooseResume('Senior Backend Software Engineer','Java microservices APIs').file,RESUMES.backend);
 assert.equal(chooseResume('Cloud Infrastructure Engineer','AWS Kubernetes Terraform').file,RESUMES.cloud);
 assert.equal(chooseResume('Developer Productivity Engineer','Buildkite CI/CD release').file,RESUMES.productivity);
});
test('filter, newest-first, unknown date at bottom',()=>{
 const rs=orderedMatchingJobs([
 {id:'x',title:'Backend Engineer',company:'A',postedDate:'2026-10-11'},
 {id:'excluded',title:'Backend Engineer',company:'B',officialPostingText:'No visa sponsorship available.'},
 {id:'z',title:'Platform Engineer',company:'Z'},
 {id:'n',title:'Cloud Engineer',company:'C',postedDate:'2026-10-18'}
 ]);
 assert.deepEqual(rs.jobs.map(j=>j.id),['n','x','z']);assert.equal(rs.excludedCount,1);
});
test('additional official posting exclusions and non-exclusions',()=>{
 for(const text of ['No sponsorship for this position.','This role is not eligible for visa sponsorship.','At this time we are unable to provide immigration sponsorship.']) assert.equal(classifySponsorship(text).status,'explicitly_excluded',text);
 assert.equal(classifySponsorship('We welcome all applicants and will consider sponsorship on a case by case basis.').status,'not_stated');
});

test('H-1B transfer and indirect sponsorship restrictions',()=>{
 for (const wording of [
  'This position does not support H1B visa transfers.',
  'Employment visa sponsorship will not be considered for this role.',
  'Must be eligible to work in the United States without needing sponsorship.',
  'We are not able to transfer your H-1B visa.',
  'H-1B visa transfers are not accepted.',
 ]) assert.equal(classifySponsorship(wording).status,'explicitly_excluded',wording);
 for (const wording of [
  'Must be legally authorized to work in the United States.',
  'Candidates with valid US work authorization may apply.',
  'Some engineers work without sponsorship; visa sponsorship may be offered to applicants.',
  'H-1B transfers are accepted.',
 ]) assert.notEqual(classifySponsorship(wording).status,'explicitly_excluded',wording);
});
