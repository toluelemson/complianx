# EU AI Act traceability model implementation

## Purpose

This document translates the conceptual model in *Conceptual Modelling of EU AI Act towards Trustworthiness and Regulatory Compliance for AI Systems* into product requirements for Neuraldocx. It is a product and engineering reference, not legal advice and not a claim that a project is compliant without human review.

The model supports a traceable path from an AI system asset to a system requirement, trustworthiness principle, EU AI Act obligation, technical measure, documentation item, and documentary evidence. It is intended to make evidence gaps explicit for the provider, reviewer, and (where relevant) conformity-assessment workflow.

## In scope

The implementation must provide the following project-scoped capabilities.

| Capability | Product behaviour | Acceptance criteria |
| --- | --- | --- |
| System assets | Record the component, model, dataset, process, or interface being assessed, including type, version, and lifecycle stage. | Assets are isolated to the active company and project, auditable, and linkable to applicable obligations. |
| Article-level requirements | Use the versioned regulatory catalogue to identify applicable requirements and their source article, paragraph, category, verification method, and trustworthiness principle. | A saved assessment retains the regulatory-pack version used for its conclusions. |
| Traceability links | Connect assets to requirements/obligations, technical measures, documentation items, and evidence. | The workspace presents the complete chain and identifies any missing mandatory link. |
| Evidence and documentation | Preserve the source, version, provenance, review state, and package inclusion of evidence. | Evidence can substantiate a specific obligation and remains inspectable in finalized package snapshots. |
| Assessment coverage | Show an assessor, date, version, coverage score, and gap list. | Coverage and gaps are derived from saved records; they must never be presented as a definitive legal conclusion. |
| Lifecycle monitoring | Record material lifecycle events and use them to flag when reassessment or renewed evidence review is needed. | Events are project-scoped, auditable, and visible with the traceability history. |
| Stakeholder and review support | Capture provider/developer details and relevant reviewer, notified-body, or authority contacts where users choose to record them. | Stakeholder records are not treated as proof of certification or authority approval. |

## Workflow

1. A provider or authorized team member defines the system scope and records its assets.
2. The assessment determines applicable regulatory requirements from the retained regulatory-pack version.
3. The team links each requirement to the applicable asset(s), implementation measure(s), documentation, and evidence.
4. The system calculates coverage and surfaces missing links as gaps for human follow-up.
5. A reviewer evaluates the evidence, records a decision, and may approve an auditable package where the project workflow permits it.
6. Lifecycle events, incidents, material changes, or new evidence trigger a human reassessment workflow; automated checks only flag this need.

## Regulatory scope and guardrails

The initial traceability model is centred on high-risk-system technical documentation and trustworthiness obligations, especially Articles 9-15, Article 11 and Annex IV. It may also reference provider, deployer, conformity-assessment, and post-market-monitoring obligations when those are present in the selected regulatory pack.

The product must:

- preserve the distinction between a traceability or evidence-coverage result and a legal determination of compliance;
- enforce company and project authorization for every traceability, evidence, and assessment operation;
- retain regulatory content versions with assessments and finalized packages;
- record actor identity and timestamps server-side for material changes; and
- keep institutional enforcement, penalties, and final legal or notified-body conclusions outside automated product claims.

## Delivery priorities

### P0 - core traceability

- Project-scoped assets, obligation links, technical measures, documentation items, evidence links, and traceability history.
- A visual traceability view and API that expose the complete chain and explain gaps.
- Coverage calculation, assessment versioning, auditable finalization checks, and authorization tests.

### P1 - lifecycle-aware assessment

- Structured material-change, monitoring, incident, and reassessment events.
- Configurable reassessment triggers and evidence-review reminders.
- Snapshot comparison showing what changed after an assessment was finalized.

### P2 - extension and validation

- Add structured support for the Article 26 deployer layer and Chapter V General-Purpose AI model obligations after legal-content review.
- Add queryable traceability rules (for example, requirements with no linked asset, measure, documentation, or evidence) without replacing human judgement.
- Validate the model’s usability and terminology with compliance engineers, reviewers, and, where feasible, notified-body practitioners.

## Non-goals

- Automatic certification, conformity assessment, or binding legal advice.
- A claim that uploaded documentation proves the underlying technical measure was implemented.
- Broad implementation of every EU AI Act provision before it is curated, versioned, and reviewed as regulatory content.

## Source

The implementation brief is based on the provided paper, which defines the conceptual traceability chain and identifies lifecycle awareness, Article 26/Chapter V coverage, automated gap queries, and practitioner validation as future directions.
