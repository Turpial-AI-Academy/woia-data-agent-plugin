import { createHash } from 'node:crypto';

export const NORMAL_FORMS = Object.freeze(['1NF', '2NF', '3NF', 'BCNF', '4NF', '5NF']);
const fields = Object.freeze(['schema', 'id', 'revision', 'source_ref', 'org_id', 'scope', 'relation', 'target']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const need = (condition, code) => { if (!condition) throw new Error(code); };
const canonical = value => JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])));

export function normalizationDescriptorDigest(descriptor) {
  need(object(descriptor) && Object.keys(descriptor).length === fields.length && fields.every(key => text(descriptor[key])), 'INVALID_NORMALIZATION_DESCRIPTOR');
  need(descriptor.schema === 'dev.woia.normalization-contract/v1' && NORMAL_FORMS.includes(descriptor.target), 'INVALID_NORMALIZATION_DESCRIPTOR');
  return createHash('sha256').update(canonical(descriptor)).digest('hex');
}

// resolveTrustedContext is an injected host callback, never a request JSON field.
// The host must authenticate and resolve the current accepted source/binding before
// invoking these pure guards. A boolean or descriptor supplied by the caller is
// not an authentication mechanism and is deliberately rejected.
export function resolveNormalizationContract(request, resolveTrustedContext) {
  need(object(request), 'NORMALIZATION_REQUEST_REQUIRED');
  for (const key of ['target', 'descriptor', 'policy', 'binding', 'normalization_binding', 'trusted_host', 'trusted_context']) {
    need(!Object.hasOwn(request, key), 'REQUEST_POLICY_NOT_ALLOWED');
  }
  for (const key of ['org_id', 'scope', 'task_ref', 'purpose', 'relation']) need(text(request[key]), 'NORMALIZATION_SCOPE_REQUIRED');
  need(typeof resolveTrustedContext === 'function', 'TRUSTED_HOST_RESOLVER_REQUIRED');
  const selection = Object.freeze(Object.fromEntries(['org_id', 'scope', 'task_ref', 'purpose', 'relation'].map(key => [key, request[key]])));
  const host = resolveTrustedContext(selection);
  need(object(host) && host.authenticated === true && host.current === true, 'CURRENT_AUTHENTICATED_HOST_REQUIRED');
  for (const key of ['org_id', 'scope', 'task_ref', 'purpose']) need(host[key] === selection[key], 'HOST_SCOPE_MISMATCH');
  const binding = host.normalization_binding;
  need(object(binding) && binding.status === 'ACCEPTED_CURRENT', 'ACCEPTED_CURRENT_NORMALIZATION_BINDING_REQUIRED');
  need(['source_ref', 'revision', 'digest_sha256'].every(key => text(binding[key])) && /^[0-9a-f]{64}$/.test(binding.digest_sha256), 'NORMALIZATION_SOURCE_IDENTITY_REQUIRED');
  const descriptor = structuredClone(binding.descriptor);
  const digest = normalizationDescriptorDigest(descriptor);
  need(descriptor.source_ref === binding.source_ref && descriptor.revision === binding.revision && digest === binding.digest_sha256, 'NORMALIZATION_SOURCE_REVISION_OR_DIGEST_MISMATCH');
  need(['org_id', 'scope', 'relation'].every(key => descriptor[key] === selection[key]), 'NORMALIZATION_DESCRIPTOR_SCOPE_MISMATCH');
  const source = host.domain_source;
  need(object(source) && source.current === true && ['source_ref', 'revision', 'digest_sha256'].every(key => source[key] === binding[key]), 'CURRENT_DOMAIN_SOURCE_EVIDENCE_REQUIRED');
  return Object.freeze(descriptor);
}
