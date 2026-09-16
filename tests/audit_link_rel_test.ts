import { auditIndividualLinkRel, analyzeOutboundLinks } from '../server/analysis/links.js';
import { validateReportConsistency } from '../src/validationPass.js';
import { PublisherCheckReport } from '../src/types.js';
import * as cheerio from 'cheerio';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('--- TEST 1: Individual Link Rel Audit ---');
// 1. Missing or empty rel
const missingRel = auditIndividualLinkRel(undefined);
assert(missingRel.classification === 'FOLLOW', 'Missing rel must be FOLLOW');
assert(missingRel.hasFollowToken === false, 'Missing rel has no follow token');

const emptyRel = auditIndividualLinkRel('   ');
assert(emptyRel.classification === 'FOLLOW', 'Empty rel must be FOLLOW');

// 2. Standard benign tokens (noopener, noreferrer, external)
const benignRel = auditIndividualLinkRel('noopener noreferrer');
assert(benignRel.classification === 'FOLLOW', 'Benign standard tokens must be FOLLOW');
assert(benignRel.unknownTokens.length === 0, 'No unknown tokens in noopener noreferrer');

// 3. Explicit follow
const explicitFollow = auditIndividualLinkRel('follow');
assert(explicitFollow.classification === 'FOLLOW', 'rel="follow" must be FOLLOW');
assert(explicitFollow.hasFollowToken === true, 'Explicit follow token detected');

// 4. Standard nofollow
const nofollowRel = auditIndividualLinkRel('nofollow');
assert(nofollowRel.classification === 'NOFOLLOW', 'rel="nofollow" must be NOFOLLOW');
assert(nofollowRel.hasNofollowToken === true, 'Nofollow token detected');

// 5. Sponsored
const sponsoredRel = auditIndividualLinkRel('sponsored');
assert(sponsoredRel.classification === 'SPONSORED', 'rel="sponsored" must be SPONSORED');
assert(sponsoredRel.hasSponsoredToken === true, 'Sponsored token detected');

// 6. UGC
const ugcRel = auditIndividualLinkRel('ugc');
assert(ugcRel.classification === 'UGC', 'rel="ugc" must be UGC');
assert(ugcRel.hasUgcToken === true, 'UGC token detected');

// 7. Compound directives (e.g. nofollow sponsored)
const compoundRel = auditIndividualLinkRel('nofollow sponsored');
assert(compoundRel.classification === 'SPONSORED', 'Compound nofollow sponsored should be categorized as SPONSORED');
assert(compoundRel.hasNofollowToken === true && compoundRel.hasSponsoredToken === true, 'Both tokens tracked in compound rel');

// 8. Unknown / custom / non-standard rel (e.g. 'dofollow', 'partner', 'custom-aff')
// Crucial: Must NOT infer as FOLLOW!
const dofollowRel = auditIndividualLinkRel('dofollow');
assert(dofollowRel.classification === 'UNKNOWN', 'Non-standard "dofollow" must NOT be inferred as FOLLOW, must be UNKNOWN');
assert(dofollowRel.unknownTokens.includes('dofollow'), 'Unknown token recorded');

const customRel = auditIndividualLinkRel('partner-brand');
assert(customRel.classification === 'UNKNOWN', 'Custom rel must be classified as UNKNOWN');
assert(customRel.unknownTokens.includes('partner-brand'), 'Custom token recorded');

console.log('✓ Individual Link Rel Audit passed successfully.');

console.log('--- TEST 2: Full analyzeOutboundLinks Mathematical Consistency ---');
const sampleHtml = `
<!DOCTYPE html>
<html>
<body>
  <article class="entry-content">
    <p>Testing various links:</p>
    <!-- 1. Clean follow -->
    <a href="https://example1.com/a">Clean Link</a>
    <!-- 2. Noopener follow -->
    <a href="https://example2.com/b" rel="noopener noreferrer">Noopener Link</a>
    <!-- 3. Standard nofollow -->
    <a href="https://example3.com/c" rel="nofollow">Nofollow Link</a>
    <!-- 4. Explicit sponsored -->
    <a href="https://example4.com/d" rel="sponsored">Sponsored Link</a>
    <!-- 5. UGC link -->
    <a href="https://example5.com/e" rel="ugc">UGC Link</a>
    <!-- 6. Non-standard unknown rel (not inferred as follow) -->
    <a href="https://example6.com/f" rel="custom-tag">Custom Rel Link</a>
    <!-- 7. Compound sponsored nofollow -->
    <a href="https://example7.com/g" rel="sponsored nofollow">Compound Link</a>
    <!-- Internal links (must not count as external) -->
    <a href="/internal-page">Internal Link 1</a>
    <a href="https://mysite.com/internal-2">Internal Link 2</a>
  </article>
</body>
</html>
`;

const $ = cheerio.load(sampleHtml);
const mockCrawl: any = {
  baseUrl: new URL('https://mysite.com/'),
  discoveredUrls: ['https://mysite.com/post-1'],
  sampledArticles: [
    {
      url: 'https://mysite.com/post-1',
      title: 'Post 1',
      html: sampleHtml,
      $,
    },
  ],
};

const result = analyzeOutboundLinks(mockCrawl);

console.log('Analysis Results:');
console.log(`Total External: ${result.totalExternalLinks}`);
console.log(`FOLLOW: ${result.followedLinksCount}`);
console.log(`NOFOLLOW: ${result.nofollowLinksCount}`);
console.log(`SPONSORED: ${result.sponsoredLinksCount}`);
console.log(`UGC: ${result.ugcLinksCount}`);
console.log(`UNKNOWN: ${result.unknownRelLinksCount}`);

// Mathematical consistency check
const sum = result.followedLinksCount + result.nofollowLinksCount + result.sponsoredLinksCount + result.ugcLinksCount + result.unknownRelLinksCount;
assert(result.totalExternalLinks === 7, `Expected 7 external links, got ${result.totalExternalLinks}`);
assert(sum === result.totalExternalLinks, `Sum (${sum}) must equal totalExternalLinks (${result.totalExternalLinks})`);
assert(result.followedLinksCount === 2, `Expected 2 FOLLOW links (clean + noopener), got ${result.followedLinksCount}`);
assert(result.nofollowLinksCount === 1, `Expected 1 pure NOFOLLOW link, got ${result.nofollowLinksCount}`);
assert(result.sponsoredLinksCount === 2, `Expected 2 SPONSORED links (sponsored + sponsored nofollow), got ${result.sponsoredLinksCount}`);
assert(result.ugcLinksCount === 1, `Expected 1 UGC link, got ${result.ugcLinksCount}`);
assert(result.unknownRelLinksCount === 1, `Expected 1 UNKNOWN rel link, got ${result.unknownRelLinksCount}`);

assert(result.relAudit?.rawRelTokenCounts?.nofollowTokenCount === 2, 'Raw nofollow token count should be 2');
assert(result.relAudit?.rawRelTokenCounts?.unknownTokensFound.includes('custom-tag'), 'Unknown token custom-tag tracked');

console.log('✓ Mathematical consistency and unverified inference exclusion verified.');

console.log('--- TEST 3: Validation Pass Integrity Check ---');
import { FALLBACK_DEMO_REPORT } from '../server/demoData.js';

const testReport: PublisherCheckReport = JSON.parse(JSON.stringify(FALLBACK_DEMO_REPORT));
testReport.outboundLinks = result;

const validatedReport = validateReportConsistency(testReport);
console.log('Validation notes:', validatedReport.validationNotes);
assert(validatedReport.outboundLinks.status !== 'not_checked', 'Valid outbound links should not be marked not_checked');
assert(!validatedReport.validationNotes?.some(n => n.toLowerCase().includes('rel') || n.toLowerCase().includes('external')), 'Should have no rel or link inconsistencies');

// Now test that validation pass detects mathematical inconsistency if relSum !== totalExternalLinks
const tamperedReport: PublisherCheckReport = JSON.parse(JSON.stringify(testReport));
tamperedReport.outboundLinks.followedLinksCount = 999; // intentionally inconsistent

const tamperedValidated = validateReportConsistency(tamperedReport);
assert(tamperedValidated.outboundLinks.status === 'not_checked', 'Tampered outbound links must be marked not_checked by validation pass');
assert(
  tamperedValidated.validationNotes?.some(n => n.includes('Sum of audited rel counts')),
  'Validation notes must describe the rel sum mismatch'
);
console.log('✓ Validation pass successfully caught inconsistency and marked as not_checked.');

console.log('\nALL TESTS COMPLETED SUCCESSFULLY!');
