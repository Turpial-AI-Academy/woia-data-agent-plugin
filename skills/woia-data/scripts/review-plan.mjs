import {isDeepStrictEqual} from 'node:util';
import {resolveNormalizationContract} from './normalization-contract.mjs';
export const RESPONSIBILITIES = Object.freeze(['agreements','identity-source','suitability','change-migration','integrity-controls']);
const text = v => typeof v === 'string' && v.trim().length > 0;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const need = (condition,message) => {if (!condition) throw new Error(message);};
// Pure planning guard. Not a business store, Source Authority Map writer or Core runtime.
export function reviewPlan(input) {
  need(object(input),'Request object required');
  for (const f of ['organization','scope','intended_use','business_owner','correlation_id']) need(text(input[f]),`${f} required`);
  const actor = input.trusted_actor;
  need(object(actor) && text(actor.id) && actor.authenticated === true && actor.authorized === true && actor.organization === input.organization && actor.scope === input.scope,'Authenticated authorized scoped actor required');
  need(RESPONSIBILITIES.includes(input.responsibility),'Unknown governance responsibility');
  need(input.effect === 'evaluation','Data only plans evaluation; no business, contact, paid or financial effect');
  need(object(input.contract) && text(input.contract.id) && text(input.contract.version) && input.contract.accepted === true,'Accepted versioned contract required');
  need(object(input.source_authority),'Source Authority Map required');
  const s = input.source_authority;
  for (const f of ['source','writer','version','business_owner']) need(text(s[f]),`Source ${f} required`);
  need(s.organization === input.organization && s.scope === input.scope,'Source scope mismatch');
  need(s.business_owner === input.business_owner,'Competent owner mismatch');
  need(Array.isArray(input.evidence) && input.evidence.length > 0,'Attributable evidence required');
  const ids = new Set();
  for (const e of input.evidence) {
    need(object(e) && ['id','source','version','checksum'].every(f => text(e[f])),'Immutable evidence reference required');
    need(!ids.has(e.id),'Duplicate evidence'); ids.add(e.id);
  }
  need(['CURRENT','STALE','UNKNOWN','CONFLICT'].includes(input.source_status),'Explicit source status required');
  if (input.responsibility === 'change-migration') {
    const m = input.migration;
    need(object(m) && ['owner','reconciliation','cutover','recovery'].every(f => text(m[f])),'Owned migration reconciliation/cutover/recovery required');
    need(m.restores_external_effects === false && m.revives_revoked_permissions === false,'Recovery cannot reverse effects or revive revoked permissions');
  }
  return {result:input.source_status === 'CURRENT' ? 'EVALUATION_REQUEST_READY':'UNKNOWN_RECONCILIATION_REQUIRED',
    request:{provider:'woia-data-governance',organization:input.organization,scope:input.scope,correlation_id:input.correlation_id,responsibility:input.responsibility,contract:structuredClone(input.contract),evidence:structuredClone(input.evidence)},
    accountable_owner:input.business_owner,business_acceptance:'NOT_GRANTED',runtime_enforcement:'NOT_CLAIMED',effect_executed:false};
}
// Review obligations, not a theorem prover. Samples cannot certify canonical relations.
export function normalizationReview(input,{resolveTrustedContext}={}) {
  const contract = resolveNormalizationContract(input,resolveTrustedContext);
  need(object(input) && text(input.relation) && text(input.owner),'Relation and owner required');
  need(Array.isArray(input.candidate_keys) && input.candidate_keys.length > 0 && input.candidate_keys.every(k => Array.isArray(k) && k.length > 0 && k.every(text) && new Set(k).size === k.length),'Candidate keys required');
  need(object(input.dependencies) && ['functional','multivalued','join'].every(k => Array.isArray(input.dependencies[k])),'Functional/multivalued/join dependencies required');
  need(input.dependencies_authority === 'accepted-semantic-contract','Samples cannot prove normalization');
  need(text(input.lossless_reconstruction_evidence) && text(input.enforceability_evidence),'Separate lossless and enforceability evidence required');
  return {result:'READY_FOR_COMPETENT_REVIEW',target:contract.target,contract,certified:false,backend_selected:false,owner:input.owner};
}
export function reconcileReview(previous,next) {
  need(object(previous) && object(next) && text(previous.key) && text(next.key) && object(previous.intent) && object(next.intent),'Scoped intent/correlation key required');
  need(previous.key === next.key && isDeepStrictEqual(previous.intent,next.intent),'Idempotency conflict');
  need(['KNOWN','UNKNOWN'].includes(previous.outcome),'Explicit prior outcome required');
  return {result:previous.outcome === 'UNKNOWN' ? 'RECONCILE_BEFORE_RETRY':'REUSE_PRIOR_EVIDENCE',execution_authorized:false};
}
