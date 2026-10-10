import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizationDescriptorDigest, resolveNormalizationContract} from '../skills/woia-data/scripts/normalization-contract.mjs';
import {normalizationReview,reconcileReview} from '../skills/woia-data/scripts/review-plan.mjs';

const request=()=>({org_id:'org:test',scope:'services',task_ref:'task:test',purpose:'schema-review',relation:'ServiceAssignment',owner:'owner:test',candidate_keys:[['service','assignee']],dependencies:{functional:[],multivalued:[],join:[]},dependencies_authority:'accepted-semantic-contract',lossless_reconstruction_evidence:'proof:lossless',enforceability_evidence:'proof:constraints'});
const host=(r,target='3NF')=>{
  const descriptor={schema:'dev.woia.normalization-contract/v1',id:'normalization:services',revision:'7',source_ref:'contract:services',org_id:r.org_id,scope:r.scope,relation:r.relation,target};
  const identity={source_ref:descriptor.source_ref,revision:descriptor.revision,digest_sha256:normalizationDescriptorDigest(descriptor)};
  return {authenticated:true,current:true,org_id:r.org_id,scope:r.scope,task_ref:r.task_ref,purpose:r.purpose,normalization_binding:{status:'ACCEPTED_CURRENT',...identity,descriptor},domain_source:{current:true,...identity}};
};
for(const target of ['1NF','2NF','3NF','BCNF','4NF','5NF'])test('accepted '+target+' is carried to competent review without certification',()=>{
  const result=normalizationReview(request(),{resolveTrustedContext:s=>host(s,target)});
  assert.equal(result.target,target);assert.equal(result.contract.target,target);assert.equal(result.certified,false);assert.equal(result.backend_selected,false);
});
test('request cannot choose a weaker target or fake a trusted context',()=>{
  assert.throws(()=>normalizationReview(request()),/TRUSTED_HOST_RESOLVER_REQUIRED/);
  for(const field of ['target','policy','descriptor','binding','normalization_binding','trusted_host','trusted_context'])assert.throws(()=>normalizationReview({...request(),[field]:'1NF'},{resolveTrustedContext:s=>host(s,'5NF')}),/REQUEST_POLICY_NOT_ALLOWED/);
});
for(const [name,change,code] of [
  ['stale context',h=>h.current=false,'CURRENT_AUTHENTICATED_HOST_REQUIRED'],
  ['unauthenticated context',h=>h.authenticated=false,'CURRENT_AUTHENTICATED_HOST_REQUIRED'],
  ['scope mismatch',h=>h.scope='other','HOST_SCOPE_MISMATCH'],
  ['purpose mismatch',h=>h.purpose='other','HOST_SCOPE_MISMATCH'],
  ['Task mismatch',h=>h.task_ref='other','HOST_SCOPE_MISMATCH'],
  ['obsolete binding',h=>h.normalization_binding.status='REVOKED','ACCEPTED_CURRENT_NORMALIZATION_BINDING_REQUIRED'],
  ['stale source',h=>h.domain_source.current=false,'CURRENT_DOMAIN_SOURCE_EVIDENCE_REQUIRED'],
  ['source revision mismatch',h=>h.domain_source.revision='6','CURRENT_DOMAIN_SOURCE_EVIDENCE_REQUIRED'],
  ['source digest mismatch',h=>h.domain_source.digest_sha256='0'.repeat(64),'CURRENT_DOMAIN_SOURCE_EVIDENCE_REQUIRED'],
  ['tampered descriptor',h=>h.normalization_binding.descriptor.target='1NF','NORMALIZATION_SOURCE_REVISION_OR_DIGEST_MISMATCH']
])test(name+' fails closed',()=>{
  assert.throws(()=>normalizationReview(request(),{resolveTrustedContext:s=>{const h=host(s);change(h);return h}}),new RegExp(code));
});
test('immutability and hash reject extra policy fields',()=>{
  const r=request(),h=host(r),resolved=resolveNormalizationContract(r,()=>h);
  assert.ok(Object.isFrozen(resolved));h.normalization_binding.descriptor.target='5NF';assert.equal(resolved.target,'3NF');
  assert.throws(()=>normalizationDescriptorDigest({...resolved,grant:true}),/INVALID_NORMALIZATION_DESCRIPTOR/);
});
test('samples and missing reconstruction/enforceability evidence cannot claim review readiness',()=>{
  for(const field of ['lossless_reconstruction_evidence','enforceability_evidence']){
    const r=request();delete r[field];assert.throws(()=>normalizationReview(r,{resolveTrustedContext:s=>host(s,'5NF')}),/Separate lossless and enforceability evidence required/);
  }
  assert.throws(()=>normalizationReview({...request(),dependencies_authority:'sample-observation'},{resolveTrustedContext:s=>host(s)}),/Samples cannot prove normalization/);
});
test('unknown outcomes reconcile before retry and changed intent cannot reuse correlation',()=>{
  const previous={key:'k',intent:{relation:'ServiceAssignment'},outcome:'UNKNOWN'};
  assert.equal(reconcileReview(previous,structuredClone(previous)).result,'RECONCILE_BEFORE_RETRY');
  assert.throws(()=>reconcileReview(previous,{...previous,intent:{relation:'Other'}}),/Idempotency conflict/);
});
