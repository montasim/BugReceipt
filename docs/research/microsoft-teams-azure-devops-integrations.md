# Microsoft Teams and Azure DevOps integration research

Date: 2026-08-29  
Scope: Azure DevOps Services (cloud) and Microsoft Teams. Azure DevOps Server needs a separate authentication and deployment assessment.

## Decision

Both integrations are feasible and fit BugReceipt well.

The recommended first release is:

1. Add **Create Azure DevOps bug** and **Add to existing work item** to the reviewed-report screen.
2. Upload the selected report files to that Azure DevOps work item.
3. Optionally post a compact Adaptive Card to a configured Teams channel through an authenticated Teams Workflow. The card should link to the Azure DevOps work item rather than contain the full report.

This keeps Azure DevOps as the system of record and Teams as the notification surface. It also avoids trying to put a video or large network log into a Teams message.

## Microsoft Teams

### Recommended MVP: Teams Workflows webhook

The Teams Workflows app can expose a `When a Teams webhook request is received` trigger and post a message or Adaptive Card to a channel or chat. Workflows are backed by Power Automate and can transform the incoming payload before posting it. This is the smallest practical integration for a fixed internal team. [Microsoft: create incoming webhooks with Workflows](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)

Do not implement the old Office/Microsoft 365 Incoming Webhook connector. Microsoft progressively disabled Office 365 Connectors on May 18–22, 2026 and directs customers to Power Automate Workflows, Teams apps, or Microsoft Graph. [Microsoft 365 Developer Blog: connector retirement](https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/)

Important Workflow constraints:

- Webhook messages are limited to 28 KB and calls above four requests per second can be throttled. HTML is treated as plain text. Send a summary and links, not console/network dumps or a WebM file. [Microsoft: webhook limits](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- Workflows post as the Flow bot and do not support a custom bot name or icon. A Message Card can render, but its buttons are not interactive; use an Adaptive Card for interactions. [Microsoft: connector retirement and Workflow limitations](https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/)
- A Workflow belongs to user owners, not the team or channel, and can become orphaned. Assign at least two co-owners and document ownership transfer. [Microsoft: webhooks and connectors](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/what-are-webhooks-and-connectors)
- The HTTP trigger can allow any tenant user, specific tenant users/service principals, or anyone. `Anyone` is the legacy open mode; a production integration should use tenant authentication or restrict the trigger to BugReceipt's service principal. [Microsoft: OAuth authentication for HTTP triggers](https://learn.microsoft.com/en-us/power-automate/oauth-authentication)

A useful card would contain only:

- report title and page origin;
- Azure work-item ID, state, and link;
- expected/actual summary and reproduction-step count;
- console/network evidence counts, not their raw contents;
- an `Open in Azure DevOps` action.

### Alternatives for a broader product

**Microsoft Graph with delegated access** can send a normal channel message using `ChannelMessage.Send`, or a chat message using `ChatMessage.Send`. Application permission for these send APIs is reserved for migration and is not a general-purpose app-only notification mechanism. It also violates Teams' terms to use messages as a log sink. This makes delegated Graph appropriate for an explicit user-driven “share as me” action, but less convenient than a Workflow for a team-wide backend notification. [Microsoft Graph: send a channel message](https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0), [Microsoft Graph: send a chat message](https://learn.microsoft.com/en-us/graph/api/chat-post-messages?view=graph-rest-1.0)

**A Teams notification bot** is the productized option when BugReceipt needs branded identity, interactive conversations, tenant installation, and proactive notifications. The app/bot must first be installed for the target user, team, or channel before it can send proactive messages. [Microsoft: proactive bot messages](https://learn.microsoft.com/en-ie/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

For the current internal-team use case, a notification bot adds substantially more setup and tenant-administration work than a Workflow. It should follow the MVP, not precede it.

## Azure DevOps Boards

### Create a new ticket

BugReceipt can create a Bug, Issue, Task, or another project-supported work-item type with:

```http
POST https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/${type}?api-version=7.1
Content-Type: application/json-patch+json
```

The JSON Patch document can set `System.Title`, `System.Description`, tags, area/iteration paths, and process-specific fields. Work-item types and required fields vary by the project's process, so BugReceipt must load or configure the destination mapping rather than assume every project has the same Bug schema. [Microsoft: create a work item](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1)

Azure Boards uses HTML rich-text fields for `System.Description` and, on Bug work items, `Microsoft.VSTS.TCM.ReproSteps`. BugReceipt should convert its reviewed Markdown to safe HTML for these fields rather than paste raw Markdown into them. [Microsoft: rich-text work-item fields](https://learn.microsoft.com/en-us/azure/devops/boards/queries/titles-ids-descriptions?view=azure-devops)

### Add a report to an existing ticket

There are two good mechanisms, and they can be combined:

1. Add a Markdown comment through the work-item comments API. The comments model supports Markdown and HTML formats.
2. Patch the work item to add history/field content and `AttachedFile` relations.

[Microsoft: add a work-item comment](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/add-comment?view=azure-devops-rest-7.1), [Microsoft: update a work item and link an attachment](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.1)

The initial UI can accept a work-item ID and validate it with the Get Work Item API. A later picker can search work items through WIQL, with project/type/state filtering.

### Attach the Markdown, JSON, screenshot, or WebM

Attachment is a two-step operation:

1. Upload each selected file as `application/octet-stream` to the Work Item Tracking attachments API.
2. JSON-patch the work item, adding the returned URL under `/relations/-` with `rel: "AttachedFile"`.

The upload API accepts binary or text streams and also supports chunked uploads on accounts with higher upload limits. [Microsoft: upload a work-item attachment](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/attachments/create?view=azure-devops-rest-7.1), [Microsoft: attach the uploaded file](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.1)

Azure DevOps Services currently permits up to 100 attachments per work item and 60 MB per attachment. A BugReceipt recording above 60 MB must be shortened/compressed, omitted, or placed in separately controlled storage with an expiring link. [Microsoft: work tracking limits](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/object-limits?view=azure-devops)

Recommended evidence layout:

- Put the concise reproduction narrative in the work-item fields/comment.
- Attach `bugreceipt-report.md` or `.reprokit.json`/its renamed equivalent for machine-readable detail.
- Attach `recording.webm` only when selected and below the organization limit.
- Preserve the local ZIP export as an alternative; do not duplicate both the individual files and ZIP by default.

## Authentication and secret handling

### Production recommendation

Microsoft recommends Microsoft Entra ID for new Azure DevOps integrations. The old Azure DevOps OAuth service stopped accepting new registrations in April 2025 and is scheduled for full retirement in 2026. PATs are higher-risk, long-lived bearer credentials and Microsoft recommends them only for temporary, personal, legacy, or one-off scenarios. [Microsoft: Azure DevOps OAuth guidance](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth?view=azure-devops), [Microsoft: authentication guidance](https://learn.microsoft.com/en-us/azure/devops/organizations/security/authentication-guidance?view=azure-devops), [Microsoft: PAT guidance](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops)

There are two appropriate identity models:

| Model                                         | Best fit                                                                    | Trade-off                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Entra delegated user OAuth                    | Each user explicitly creates/updates tickets as themselves                  | Better attribution and least privilege, but every user signs in and tenant consent may be required                 |
| Backend service principal or managed identity | One internal team, fixed organizations/projects, centralized administration | Simpler extension UX, but work appears under the application identity and admins must grant it project permissions |

For Azure-hosted automation, Microsoft prefers a managed identity; otherwise use a service principal. The identity must be explicitly added to the Azure DevOps organization and granted least-privilege access in Azure DevOps' own permission model. Entra application permissions alone do not grant Azure DevOps project access. [Microsoft: service principals and managed identities](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity?view=azure-devops)

A browser extension is a public client and cannot keep a client secret, service-principal credential, PAT, or Teams webhook URL confidential. Microsoft supports authorization code flow with PKCE for browser-based public clients without a client secret, but tokens still exist in the browser and need careful lifecycle/storage controls. [Microsoft identity platform: authorization code with PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)

BugReceipt already has a small server path for opt-in email delivery, so a backend-for-frontend is the stronger design:

```text
Extension review UI
  -> explicit share request with selected, redacted evidence
  -> BugReceipt backend (authenticated user + tenant/project allowlist)
       -> Azure DevOps REST API
       -> Teams Workflow webhook (summary + Azure link)
```

The extension should receive a short-lived BugReceipt session, not Microsoft service credentials. The backend should hold encrypted connector configuration and acquire short-lived Entra tokens.

## Privacy and security requirements

These integrations change BugReceipt's privacy boundary: selected evidence leaves local browser storage. Preserve the current trust model with all of the following:

- Keep capture and local filtering unchanged; sharing happens only after review and an explicit destination-specific click.
- Show exactly which fields and files will be uploaded. Make video, request/response bodies, and raw console entries separately removable.
- Run the redaction pass again immediately before upload, not only at capture time.
- Never send authorization headers, cookies, query secrets, form values, or unfiltered request/response bodies.
- Do not put raw evidence in Teams. Teams gets a human-readable summary and a permission-controlled Azure DevOps link.
- Restrict organization, project, work-item type, and Teams destination with server-side allowlists. Do not trust IDs supplied by the extension.
- Use least-privilege Azure DevOps permissions, authenticated Workflow triggers, rate limits, replay protection, audit logs, and idempotency keys.
- Encrypt connector configuration at rest; never log access tokens, webhook URLs, or report bodies.
- Define retention and deletion behavior for any temporary server copy. Prefer streaming attachments to Azure DevOps and deleting temporary data immediately after success.
- Warn before upload when an attachment exceeds 60 MB; never silently omit evidence.
- Return the created/updated item URL and a per-destination success/failure result so partial failures can be retried safely without creating duplicate bugs.

## Proposed implementation sequence

### Phase 1: internal-team MVP

1. Add an integration settings page for the Azure DevOps organization/project, allowed work-item type, and Teams destination display name. Keep credentials server-side.
2. Provision an Entra service principal (or managed identity if hosting on Azure), add it explicitly to the Azure DevOps organization/project, and grant only work-item read/write access.
3. Create an authenticated Teams Workflow webhook, assign co-owners, and restrict its trigger to the backend service principal.
4. Add a backend endpoint with two operations: `createWorkItem` and `updateWorkItem`.
5. Convert the reviewed report to safe Azure DevOps HTML/Markdown, upload selected files, and attach them.
6. After Azure succeeds, optionally post an Adaptive Card to Teams with the work-item link.
7. Add extension actions: **Create Azure bug**, **Add to work item**, and a **Notify Teams** checkbox.
8. Test redaction, permissions, oversized videos, token expiry, throttling, partial failures, retries, and duplicate submissions.

### Phase 2: product integration

1. Add per-tenant Entra consent and delegated user authorization where user attribution is required.
2. Discover allowed Azure organizations/projects, work-item types, fields, and existing tickets instead of relying on manual IDs.
3. Replace the fixed Teams Workflow with a multi-tenant Teams notification bot if branded identity, interactive actions, and customer-managed installation justify the added complexity.
4. Add revocation, connector health, audit events, retention controls, and administrator documentation.

## Feasibility and risk assessment

| Capability                               | Feasibility      | Main risk                                                                       |
| ---------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| Create Azure DevOps work item            | High             | Project processes have different required fields and permissions                |
| Add report to existing work item         | High             | Attachment limits and avoiding duplicate comments/files on retry                |
| Attach Markdown/JSON/screenshot          | High             | Sensitive material must be reviewed and redacted                                |
| Attach WebM                              | High below 60 MB | Recordings may exceed the Azure DevOps Services per-file limit                  |
| Notify fixed Teams channel with Workflow | High             | Workflow ownership, webhook authentication, and 28 KB payload limit             |
| Let a user share via Graph               | Medium-high      | Delegated consent and user/channel discovery                                    |
| Multi-tenant branded Teams bot           | Medium           | Tenant installation, admin consent, conversation references, and support burden |

The main engineering difficulty is not API availability. It is safely moving privacy-filtered evidence from a local-only extension into organization-controlled systems, with correct identity, permissions, size handling, and retry semantics.

## Primary sources

- [Microsoft Teams: create incoming webhooks with Workflows](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- [Microsoft: retirement of Office 365 connectors in Teams](https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/)
- [Power Automate: OAuth authentication for HTTP triggers](https://learn.microsoft.com/en-us/power-automate/oauth-authentication)
- [Microsoft Graph: send a Teams channel message](https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0)
- [Microsoft Graph: send a Teams chat message](https://learn.microsoft.com/en-us/graph/api/chat-post-messages?view=graph-rest-1.0)
- [Microsoft Teams: send proactive bot messages](https://learn.microsoft.com/en-ie/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [Azure DevOps REST: create a work item](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1)
- [Azure DevOps REST: update a work item](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.1)
- [Azure DevOps REST: add a work-item comment](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/comments/add-comment?view=azure-devops-rest-7.1)
- [Azure DevOps REST: upload an attachment](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/attachments/create?view=azure-devops-rest-7.1)
- [Azure DevOps: work tracking limits](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/object-limits?view=azure-devops)
- [Azure DevOps: authentication guidance](https://learn.microsoft.com/en-us/azure/devops/organizations/security/authentication-guidance?view=azure-devops)
- [Azure DevOps: authenticate with Microsoft Entra ID](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/entra?view=azure-devops)
- [Azure DevOps: service principals and managed identities](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity?view=azure-devops)
- [Microsoft identity platform: authorization code flow with PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
