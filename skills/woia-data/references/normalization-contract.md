# Accepted normalization target

Load this contract before normalization review. The base supports every target from 1NF through 5NF; the accepted source decides the required target for the exact relation. Requirements through the accepted target are cumulative, including BCNF before 4NF/5NF.

[The descriptor schema](normalization-contract.schema.json) defines `dev.woia.normalization-contract/v1`: `schema, id, revision, source_ref, org_id, scope, relation, target`. All fields are nonempty strings and the target is one of 1NF, 2NF, 3NF, BCNF, 4NF or 5NF. Extra fields are rejected. The descriptor grants no operation authority.

The host injects a synchronous `resolveTrustedContext(selection)` function into the helper call. It authenticates the actor/Task, resolves the current accepted organization/domain resource and checks permissions before returning context. This function is integration code outside the request/tool schema; never deserialize it or take it from model-supplied policy. A request contains `org_id, scope, task_ref, purpose, relation` and review evidence. It cannot choose a target or supply policy, bindings or trusted context.

The host context has `authenticated: true, current: true, org_id, scope, task_ref, purpose` matching the request, plus:

- `normalization_binding: {status: "ACCEPTED_CURRENT", source_ref, revision, digest_sha256, descriptor}`.
- `domain_source: {current: true, source_ref, revision, digest_sha256}` identifying independent current source evidence checked by the host.

Binding/source revisions and digests must match, as must descriptor source/revision and exact organization/scope/relation. The digest is lowercase SHA-256 of UTF-8 JSON with descriptor keys sorted lexicographically and no whitespace. `normalizationDescriptorDigest(descriptor)` provides that serialization for these flat typed fields. `resolveNormalizationContract(request, resolveTrustedContext)` returns a cloned frozen descriptor. Missing, rejected, obsolete or mismatched bindings fail closed; no default target is selected.

These pure guards verify a host-resolved envelope; they do not authenticate a host, query a live source, persist grants or implement storage controls. Deployments must bind the callback to their actual authenticated host integration. Physical enforcement, actor authority, revision/CAS checks, holds and unknown-effect reconciliation remain separate provider dispatch obligations. Reviewed proof fields never certify a mathematical theorem or actual database enforcement.
