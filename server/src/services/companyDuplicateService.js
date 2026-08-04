import { Op } from 'sequelize';
import { COMPANY_DUPLICATE_CONFIDENCE } from '../constants/plan2Constants.js';
import { Company } from '../models/index.js';
import {
  normalizeCompanyEmail,
  normalizeCompanyIdentity,
  normalizeCompanyName,
} from './companyNormalization.js';

const CONFIDENCE_RANK = {
  [COMPANY_DUPLICATE_CONFIDENCE.HIGH]: 0,
  [COMPANY_DUPLICATE_CONFIDENCE.MEDIUM]: 1,
  [COMPANY_DUPLICATE_CONFIDENCE.LOW]: 2,
};

function addReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function normalizeCity(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function emailDomain(email, { allowInvalid = false } = {}) {
  let normalized;
  try {
    normalized = normalizeCompanyEmail(email);
  } catch (error) {
    if (allowInvalid) return null;
    throw error;
  }
  return normalized?.split('@')[1] ?? null;
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function tokenSubsetSimilarity(left, right) {
  const leftTokens = left.split(' ').filter(Boolean);
  const rightTokens = right.split(' ').filter(Boolean);
  const shorter = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const longer = leftTokens.length <= rightTokens.length ? rightTokens : leftTokens;

  return shorter.length >= 2 && shorter.every((token) => longer.includes(token));
}

function isSimilarNormalizedName(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (tokenSubsetSimilarity(left, right)) return true;

  const distance = levenshteinDistance(left, right);
  const longestLength = Math.max(left.length, right.length);
  return longestLength > 0 && 1 - distance / longestLength >= 0.82;
}

function buildCandidateWhere({ identity, excludeCompanyId, includeArchived }) {
  const where = {};
  if (!includeArchived) where.archivedAt = null;
  if (excludeCompanyId) where.id = { [Op.ne]: excludeCompanyId };

  const or = [];
  if (identity.websiteDomain) or.push({ websiteDomain: identity.websiteDomain });
  if (identity.generalEmail) or.push({ generalEmail: identity.generalEmail });
  if (identity.phone) or.push({ phone: identity.phone });
  if (identity.normalizedName) {
    return where;
  }
  const inputEmailDomain = emailDomain(identity.generalEmail);
  if (inputEmailDomain) or.push({ generalEmail: { [Op.iLike]: `%@${inputEmailDomain}` } });

  if (or.length === 0) return null;
  where[Op.or] = or;
  return where;
}

function evaluateCompany(company, identity) {
  const reasons = [];
  let confidence = null;

  const companyNormalizedName = normalizeCompanyName(company.normalizedName);
  const sameNormalizedName =
    Boolean(identity.normalizedName) && companyNormalizedName === identity.normalizedName;
  const similarNormalizedName = isSimilarNormalizedName(
    identity.normalizedName,
    companyNormalizedName,
  );
  const samePhone = Boolean(identity.phone) && company.phone === identity.phone;
  const sameEmail =
    Boolean(identity.generalEmail) && company.generalEmail === identity.generalEmail;
  const sameCity =
    Boolean(identity.city) && normalizeCity(company.city) === normalizeCity(identity.city);
  const inputEmailDomain = emailDomain(identity.generalEmail);
  const sameEmailDomain =
    Boolean(inputEmailDomain) &&
    emailDomain(company.generalEmail, { allowInvalid: true }) === inputEmailDomain;

  if (identity.websiteDomain && company.websiteDomain === identity.websiteDomain) {
    confidence = COMPANY_DUPLICATE_CONFIDENCE.HIGH;
    addReason(reasons, 'same website domain');
  }

  if (sameNormalizedName && (samePhone || sameEmail)) {
    confidence = COMPANY_DUPLICATE_CONFIDENCE.HIGH;
    addReason(reasons, 'same normalized name');
    if (samePhone) addReason(reasons, 'same phone');
    if (sameEmail) addReason(reasons, 'same email');
  } else if (sameNormalizedName && sameCity && confidence !== COMPANY_DUPLICATE_CONFIDENCE.HIGH) {
    confidence = COMPANY_DUPLICATE_CONFIDENCE.MEDIUM;
    addReason(reasons, 'same normalized name');
    addReason(reasons, 'same city');
  } else if (
    sameEmailDomain &&
    similarNormalizedName &&
    confidence !== COMPANY_DUPLICATE_CONFIDENCE.HIGH
  ) {
    confidence = COMPANY_DUPLICATE_CONFIDENCE.MEDIUM;
    addReason(reasons, 'same email domain');
    addReason(reasons, 'similar normalized name');
  } else if (similarNormalizedName && !confidence) {
    confidence = COMPANY_DUPLICATE_CONFIDENCE.LOW;
    addReason(reasons, 'similar normalized name');
  }

  if (!confidence) return null;

  return {
    companyId: company.id,
    name: company.name,
    confidence,
    reasons,
  };
}

export async function findCompanyDuplicates({
  input = {},
  excludeCompanyId = null,
  includeArchived = false,
} = {}) {
  const identity = normalizeCompanyIdentity({
    ...input,
    generalEmail: input.generalEmail ?? input.email,
  });
  const where = buildCandidateWhere({ identity, excludeCompanyId, includeArchived });
  if (!where) return [];

  const candidates = await Company.findAll({
    attributes: [
      'id',
      'name',
      'normalizedName',
      'city',
      'websiteDomain',
      'generalEmail',
      'phone',
      'archivedAt',
    ],
    where,
  });

  return candidates
    .map((company) => evaluateCompany(company, identity))
    .filter(Boolean)
    .sort((left, right) => {
      const confidenceSort = CONFIDENCE_RANK[left.confidence] - CONFIDENCE_RANK[right.confidence];
      if (confidenceSort !== 0) return confidenceSort;
      return left.name.localeCompare(right.name, 'en');
    });
}
