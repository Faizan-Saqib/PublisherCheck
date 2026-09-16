import { PublisherCheckReport, RiskLevel } from './types.js';

export interface ValidationPassResult {
  report: PublisherCheckReport;
  isValid: boolean;
  inconsistencies: string[];
}

/**
 * Internal validation pass function that iterates through the final report data
 * to ensure counts, averages, and status codes are internally consistent before rendering.
 * If any inconsistency is detected, it marks those specific sections as 'Not checked'
 * rather than displaying misleading data, and recalibrates overall scores accordingly.
 */
export function validateReportConsistency(initialReport: PublisherCheckReport): PublisherCheckReport {
  // Deep copy to prevent side-effects on original input
  const report: PublisherCheckReport = JSON.parse(JSON.stringify(initialReport));
  const inconsistencies: string[] = [];

  const totalSampled = report.sampledPages?.length || report.publishing?.totalArticlesSampled || 0;

  // -------------------------------------------------------------
  // 1. Publishing Activity Validation
  // -------------------------------------------------------------
  const pub = report.publishing;
  if (pub && pub.status !== 'not_checked') {
    let pubInvalid = false;
    const reasons: string[] = [];

    // Count non-negativity and finite checks
    if (!Number.isFinite(pub.totalArticlesSampled) || pub.totalArticlesSampled < 0) {
      pubInvalid = true;
      reasons.push(`Total sampled articles count is invalid (${pub.totalArticlesSampled})`);
    }
    if (!Number.isFinite(pub.sampledArticlesWithDates) || pub.sampledArticlesWithDates < 0) {
      pubInvalid = true;
      reasons.push(`Sampled articles with dates count is invalid (${pub.sampledArticlesWithDates})`);
    }
    if (pub.postsLast30Days !== undefined && (!Number.isFinite(pub.postsLast30Days) || pub.postsLast30Days < 0)) {
      pubInvalid = true;
      reasons.push(`Posts in last 30 days is invalid (${pub.postsLast30Days})`);
    }
    if (pub.postsLast90Days !== undefined && (!Number.isFinite(pub.postsLast90Days) || pub.postsLast90Days < 0)) {
      pubInvalid = true;
      reasons.push(`Posts in last 90 days is invalid (${pub.postsLast90Days})`);
    }
    if (pub.totalArticlesOnSite !== null && pub.totalArticlesOnSite !== undefined && (!Number.isFinite(pub.totalArticlesOnSite) || pub.totalArticlesOnSite < 0)) {
      pubInvalid = true;
      reasons.push(`Total articles on site count is invalid (${pub.totalArticlesOnSite})`);
    }

    // Relational count consistency
    if (pub.sampledArticlesWithDates > pub.totalArticlesSampled) {
      pubInvalid = true;
      reasons.push(`Articles with dates (${pub.sampledArticlesWithDates}) exceeds total sampled (${pub.totalArticlesSampled})`);
    }
    if (pub.postsLast30Days !== undefined && pub.postsLast90Days !== undefined && pub.postsLast30Days > pub.postsLast90Days) {
      pubInvalid = true;
      reasons.push(`Posts in last 30 days (${pub.postsLast30Days}) exceeds last 90 days (${pub.postsLast90Days})`);
    }
    if (pub.postsLast90Days !== undefined && pub.postsLast90Days > pub.totalArticlesSampled && pub.totalArticlesSampled > 0) {
      pubInvalid = true;
      reasons.push(`Posts in last 90 days (${pub.postsLast90Days}) exceeds total sampled (${pub.totalArticlesSampled})`);
    }

    // Date validity check
    if (pub.latestPostDate) {
      const parsedTime = Date.parse(pub.latestPostDate);
      if (Number.isNaN(parsedTime)) {
        pubInvalid = true;
        reasons.push(`Latest post date timestamp is unparseable (${pub.latestPostDate})`);
      }
    }

    // Status consistency
    if (pub.totalArticlesSampled === 0) {
      pubInvalid = true;
      reasons.push('Cannot verify publishing activity with 0 sampled articles');
    } else if (pub.sampledArticlesWithDates === 0 && (pub.status === 'active' || pub.status === 'slow')) {
      pubInvalid = true;
      reasons.push(`Status marked as ${pub.status} but 0 articles contained identifiable publication dates`);
    }

    if (pubInvalid) {
      inconsistencies.push(`Publishing Activity: ${reasons.join('; ')}`);
      pub.status = 'not_checked';
      pub.signalStatus = 'NOT_CHECKED';
      pub.signalState = 'NOT_CHECKED';
      pub.headline = 'Publishing Activity Unverified';
      pub.explanation = pub.totalArticlesSampled > 0
        ? `Inconsistent publication dates or article counts were detected during validation (${pub.sampledArticlesWithDates} of ${pub.totalArticlesSampled} sampled articles). Marked as Not Checked.`
        : 'Inconsistent publication dates or article counts were detected during the internal validation pass. This section has been marked as Not Checked.';
      pub.evidence = [];
    }
  }

  // -------------------------------------------------------------
  // 2. Outbound-Link Pattern Validation
  // -------------------------------------------------------------
  const links = report.outboundLinks;
  if (links && links.status !== 'not_checked') {
    let linksInvalid = false;
    const reasons: string[] = [];

    if (!Number.isFinite(links.totalExternalLinks) || links.totalExternalLinks < 0) {
      linksInvalid = true;
      reasons.push(`Total external links count is invalid (${links.totalExternalLinks})`);
    }
    if (!Number.isFinite(links.totalArticlesSampled) || links.totalArticlesSampled < 0) {
      linksInvalid = true;
      reasons.push(`Total articles sampled for links is invalid (${links.totalArticlesSampled})`);
    }
    if (!Number.isFinite(links.avgExternalPerArticle) || links.avgExternalPerArticle < 0) {
      linksInvalid = true;
      reasons.push(`Average external links per article is invalid (${links.avgExternalPerArticle})`);
    }
    if (!Number.isFinite(links.maxExternalOnSingleArticle) || links.maxExternalOnSingleArticle < 0) {
      linksInvalid = true;
      reasons.push(`Max external on single article is invalid (${links.maxExternalOnSingleArticle})`);
    }

    // Average calculation consistency verification (based on article pages or total sampled pages)
    const effectiveDivisor = (links.totalArticlePagesSampled && links.totalArticlePagesSampled > 0)
      ? links.totalArticlePagesSampled
      : links.totalArticlesSampled;

    if (effectiveDivisor > 0 && links.totalExternalLinks >= 0) {
      // If links are found on article pages, avg should be non-negative and finite
      if (!Number.isFinite(links.avgExternalPerArticle) || links.avgExternalPerArticle < 0) {
        linksInvalid = true;
        reasons.push(`Average external links (${links.avgExternalPerArticle}) is invalid`);
      }
    }

    // Max vs Average consistency: Max CANNOT be strictly less than the Average
    if (links.totalArticlesSampled > 0 && links.totalExternalLinks > 0) {
      if (links.maxExternalOnSingleArticle < Math.floor(links.avgExternalPerArticle)) {
        linksInvalid = true;
        reasons.push(`Max external links (${links.maxExternalOnSingleArticle}) cannot be less than average (${links.avgExternalPerArticle})`);
      }
      if (links.maxExternalOnSingleArticle > links.totalExternalLinks) {
        linksInvalid = true;
        reasons.push(`Max external links on a single page (${links.maxExternalOnSingleArticle}) cannot exceed total external links (${links.totalExternalLinks})`);
      }
    }

    // Attribute count consistency - auditing FOLLOW, NOFOLLOW, SPONSORED, UGC, and UNKNOWN
    const { followedLinksCount, nofollowLinksCount, sponsoredLinksCount, ugcLinksCount } = links;
    const unknownRelLinksCount = links.unknownRelLinksCount ?? 0;

    if (
      followedLinksCount < 0 ||
      nofollowLinksCount < 0 ||
      sponsoredLinksCount < 0 ||
      ugcLinksCount < 0 ||
      unknownRelLinksCount < 0
    ) {
      linksInvalid = true;
      reasons.push('Negative link attribute counts detected');
    }

    if (
      followedLinksCount > links.totalExternalLinks ||
      nofollowLinksCount > links.totalExternalLinks ||
      sponsoredLinksCount > links.totalExternalLinks ||
      ugcLinksCount > links.totalExternalLinks ||
      unknownRelLinksCount > links.totalExternalLinks
    ) {
      linksInvalid = true;
      reasons.push('Individual link attribute counts exceed total external links');
    }

    // Mathematical consistency check: Every individual link must be strictly accounted for
    const auditedRelSum = followedLinksCount + nofollowLinksCount + sponsoredLinksCount + ugcLinksCount + unknownRelLinksCount;
    if (links.totalExternalLinks > 0 && auditedRelSum !== links.totalExternalLinks) {
      linksInvalid = true;
      reasons.push(`Sum of audited rel counts (${auditedRelSum}) does not equal total external links (${links.totalExternalLinks})`);
    }

    // Check pages with highest external links
    if (Array.isArray(links.pagesWithHighestExternalLinks)) {
      for (const p of links.pagesWithHighestExternalLinks) {
        if (p.externalLinksCount > links.maxExternalOnSingleArticle) {
          linksInvalid = true;
          reasons.push(`Page external count (${p.externalLinksCount}) exceeds reported max (${links.maxExternalOnSingleArticle})`);
        }
      }
    }

    // Check linkClassification breakdown integrity if present
    if (links.linkClassification) {
      const lc = links.linkClassification;
      if (
        lc.editorialCitationCount < 0 ||
        lc.commercialOrAffiliateCount < 0 ||
        lc.socialOrCommunityCount < 0 ||
        lc.platformOrTechCount < 0 ||
        lc.generalExternalCount < 0
      ) {
        linksInvalid = true;
        reasons.push('Negative link classification destination counts detected');
      }

      const categorySum =
        lc.editorialCitationCount +
        lc.commercialOrAffiliateCount +
        lc.socialOrCommunityCount +
        lc.platformOrTechCount +
        lc.generalExternalCount;

      if (links.totalExternalLinks > 0 && Math.abs(categorySum - links.totalExternalLinks) > 2) {
        linksInvalid = true;
        reasons.push(`Sum of classified link destinations (${categorySum}) does not match total external links (${links.totalExternalLinks})`);
      }
    }

    if (linksInvalid) {
      inconsistencies.push(`Outbound Links: ${reasons.join('; ')}`);
      links.status = 'not_checked';
      links.signalStatus = 'NOT_CHECKED';
      links.signalState = 'NOT_CHECKED';
      links.headline = 'Outbound Link Density Unverified';
      links.explanation = 'Link totals, calculated averages, or attribute distributions were internally inconsistent. Outbound link pattern marked as Not Checked.';
      links.evidence = [];
    }
  }

  // -------------------------------------------------------------
  // 3. Guest-Post / Contribution Signals Validation
  // -------------------------------------------------------------
  const guest = report.guestPostSignals;
  if (guest && guest.status !== 'not_checked') {
    let guestInvalid = false;
    const reasons: string[] = [];

    const foundCount = Array.isArray(guest.contributionPagesFound) ? guest.contributionPagesFound.length : 0;
    if (guest.status === 'found' && foundCount === 0) {
      guestInvalid = true;
      reasons.push('Status is "found" but 0 contribution pages were listed');
    }
    if (guest.status === 'not_detected' && foundCount > 0) {
      guestInvalid = true;
      reasons.push(`Status is "not_detected" but ${foundCount} contribution pages were found`);
    }

    if (guestInvalid) {
      inconsistencies.push(`Guest Post Signals: ${reasons.join('; ')}`);
      guest.status = 'not_checked';
      guest.signalStatus = 'NOT_CHECKED';
      guest.signalState = 'NOT_CHECKED';
      guest.headline = 'Contributor Guidelines Unverified';
      guest.explanation = 'Contribution discovery status contradicted the discovered pages collection. Marked as Not Checked.';
      guest.evidence = [];
      guest.contributionPagesFound = [];
    }
  }

  // -------------------------------------------------------------
  // 6. Editorial Transparency Validation
  // -------------------------------------------------------------
  const edit = report.editorialTransparency;
  if (edit && edit.status !== 'not_checked') {
    let editInvalid = false;
    const reasons: string[] = [];

    if (!Number.isFinite(edit.authorProfiles?.count) || edit.authorProfiles?.count < 0) {
      editInvalid = true;
      reasons.push(`Author profiles count is invalid (${edit.authorProfiles?.count})`);
    }
    if (edit.authorProfiles?.found === false && edit.authorProfiles?.count > 0) {
      editInvalid = true;
      reasons.push(`Author profiles marked not found, but author count is ${edit.authorProfiles.count}`);
    }

    if (editInvalid) {
      inconsistencies.push(`Editorial Transparency: ${reasons.join('; ')}`);
      edit.status = 'not_checked';
      edit.signalStatus = 'NOT_CHECKED';
      edit.signalState = 'NOT_CHECKED';
      edit.headline = 'Editorial Transparency Unverified';
      edit.explanation = 'Editorial policy markers failed internal consistency verification. Marked as Not Checked.';
      edit.evidence = [];
    }
  }

  // -------------------------------------------------------------
  // 7. Author Attribution & Bylines Validation
  // -------------------------------------------------------------
  const authors = report.contentAuthors;
  if (authors && authors.status !== 'not_checked') {
    let authorsInvalid = false;
    const reasons: string[] = [];

    const baselineArticles = links?.totalArticlesSampled || totalSampled;

    if (!Number.isFinite(authors.articlesWithAuthorCount) || authors.articlesWithAuthorCount < 0) {
      authorsInvalid = true;
      reasons.push(`Articles with author count is invalid (${authors.articlesWithAuthorCount})`);
    }
    if (!Number.isFinite(authors.articlesWithDatesCount) || authors.articlesWithDatesCount < 0) {
      authorsInvalid = true;
      reasons.push(`Articles with dates count is invalid (${authors.articlesWithDatesCount})`);
    }
    if (!Number.isFinite(authors.articlesWithUpdatedDatesCount) || authors.articlesWithUpdatedDatesCount < 0) {
      authorsInvalid = true;
      reasons.push(`Articles with updated dates count is invalid (${authors.articlesWithUpdatedDatesCount})`);
    }

    if (baselineArticles > 0 && authors.articlesWithAuthorCount > baselineArticles) {
      authorsInvalid = true;
      reasons.push(`Articles with authors (${authors.articlesWithAuthorCount}) exceeds total articles (${baselineArticles})`);
    }
    if (authors.articlesWithUpdatedDatesCount > authors.articlesWithDatesCount) {
      authorsInvalid = true;
      reasons.push(`Updated dates count (${authors.articlesWithUpdatedDatesCount}) exceeds articles with dates (${authors.articlesWithDatesCount})`);
    }

    if (authors.articlesWithAuthorCount === 0 && authors.authorNamesFoundCount > 0) {
      authorsInvalid = true;
      reasons.push(`Articles with authors is 0 but author names found is ${authors.authorNamesFoundCount}`);
    }

    if (authorsInvalid) {
      inconsistencies.push(`Author Attribution: ${reasons.join('; ')}`);
      authors.status = 'not_checked';
      authors.signalStatus = 'NOT_CHECKED';
      authors.signalState = 'NOT_CHECKED';
      authors.headline = 'Author Attribution Unverified';
      authors.explanation = 'Author byline counts or date coverage showed internal inconsistencies. Marked as Not Checked.';
      authors.evidence = [];
    }
  }

  // -------------------------------------------------------------
  // 8. Technical Website Checks & Status Codes Validation
  // -------------------------------------------------------------
  const tech = report.technicalChecks;
  if (tech && tech.status !== 'not_checked') {
    let techInvalid = false;
    const reasons: string[] = [];

    // HTTP Status Code check
    if (!Number.isInteger(tech.statusCode) || tech.statusCode < 200 || tech.statusCode > 599) {
      techInvalid = true;
      reasons.push(`HTTP status code is invalid or out of standard range (${tech.statusCode})`);
    }

    // Canonical tag ratio: must be 0 <= ratio <= 1
    if (!Number.isFinite(tech.canonicalTagsRatio) || tech.canonicalTagsRatio < 0 || tech.canonicalTagsRatio > 1) {
      techInvalid = true;
      reasons.push(`Canonical tags ratio must be between 0 and 1 (${tech.canonicalTagsRatio})`);
    }

    // Response speed & redirects
    if (!Number.isFinite(tech.responseSpeedMs) || tech.responseSpeedMs < 0) {
      techInvalid = true;
      reasons.push(`Response speed is invalid (${tech.responseSpeedMs}ms)`);
    }
    if (!Number.isFinite(tech.redirectCount) || tech.redirectCount < 0) {
      techInvalid = true;
      reasons.push(`Redirect count is invalid (${tech.redirectCount})`);
    }

    // Logical contradiction between status code and overall status
    if (tech.statusCode >= 400 && tech.status === 'good') {
      techInvalid = true;
      reasons.push(`Technical status cannot be 'good' with HTTP error code ${tech.statusCode}`);
    }

    if (techInvalid) {
      inconsistencies.push(`Technical Checks: ${reasons.join('; ')}`);
      tech.status = 'not_checked';
      tech.signalStatus = 'NOT_CHECKED';
      tech.signalState = 'NOT_CHECKED';
      tech.headline = 'Technical Website Setup Unverified';
      tech.explanation = 'Server status code, canonical ratio, or latency figures failed internal sanity verification. Marked as Not Checked.';
      tech.evidence = [];
    }
  }

  // -------------------------------------------------------------
  // 9. Canonical Check Normalization & Single Source of Truth
  // -------------------------------------------------------------
  function resolveCheckStatus(
    check: { status?: string; signalState?: 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED'; evidence?: any[] } | undefined
  ): 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED' {
    if (!check) return 'NOT_CHECKED';
    if (check.status === 'not_checked' || check.signalState === 'NOT_CHECKED') {
      check.status = 'not_checked';
      check.signalState = 'NOT_CHECKED';
      check.evidence = [];
      return 'NOT_CHECKED';
    }
    if (check.signalState === 'SIGNAL') {
      return 'SIGNAL';
    }
    check.signalState = 'VERIFIED';
    return 'VERIFIED';
  }

  const checkConfigs: Array<{ name: string; state: 'VERIFIED' | 'SIGNAL' | 'NOT_CHECKED' }> = [
    { name: 'Publishing Cadence', state: resolveCheckStatus(report.publishing) },
    { name: 'Outbound Links', state: resolveCheckStatus(report.outboundLinks) },
    { name: 'Technical Checks', state: resolveCheckStatus(report.technicalChecks) },
    { name: 'Guest Post Guidelines', state: resolveCheckStatus(report.guestPostSignals) },
    { name: 'Publisher Transparency', state: resolveCheckStatus(report.editorialTransparency) },
    { name: 'Author Attribution', state: resolveCheckStatus(report.contentAuthors) },
  ];

  const verified = checkConfigs.filter(c => c.state === 'VERIFIED').length;
  const signal = checkConfigs.filter(c => c.state === 'SIGNAL').length;
  const notChecked = checkConfigs.filter(c => c.state === 'NOT_CHECKED').length;
  const total = checkConfigs.length;

  report.signalCounts = {
    verified,
    signal,
    notChecked,
    total,
  };
  report.checksCompletedCount = verified + signal;
  report.checksTotalCount = total;

  // Active risk signals strictly include only verified caution/warning signals, never NOT_CHECKED
  const activeSignals = checkConfigs.filter(c => c.state === 'SIGNAL').map(c => c.name);

  if (notChecked >= 5 || totalSampled === 0) {
    report.overallRiskLevel = 'INSUFFICIENT DATA';
    report.summaryVerdict = 'Limited data was verifiable from public pages during the scan. Insufficient accessible pages to complete evaluation.';
  } else if (report.guestPostSignals?.hasCommercialTerms || signal >= 3) {
    report.overallRiskLevel = 'STRONG CAUTION SIGNALS';
    const mentioned = activeSignals.slice(0, 3).join(', ');
    report.summaryVerdict = `Strong explicit evidence or multiple caution signals were observed (${mentioned}). Thorough manual due diligence is recommended before proceeding.`;
  } else if (signal >= 1) {
    report.overallRiskLevel = 'REVIEW RECOMMENDED';
    const mentioned = activeSignals.join(', ');
    report.summaryVerdict = `Caution signals were observed in ${mentioned}. Human due diligence review is recommended before proceeding.`;
  } else {
    report.overallRiskLevel = 'NO MAJOR CAUTION SIGNALS';
    report.summaryVerdict = 'All verified checks reflect standard public publisher signals. No major caution signals or explicit commercial terms were detected in sampled pages.';
  }

  report.validationNotes = inconsistencies;
  report.validationPassApplied = true;

  return report;
}
