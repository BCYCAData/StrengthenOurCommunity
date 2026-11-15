# Policy sources

These Word documents are the approved editorial sources for the website policies:

| Source                                           | Website page                                | Last updated     |
| ------------------------------------------------ | ------------------------------------------- | ---------------- |
| [Privacy Policy](privacy-policy-2026-11-13.docx) | `src/routes/policies/privacy.svelte`        | 13 November 2026 |
| [Terms of Use](terms-of-use-2026-11.docx)        | `src/routes/policies/termsofservice.svelte` | November 2026    |

Keep sources here in the repository, outside `static/`, so they are not published
as website assets. Git retains previous versions. If public downloads are needed,
place publication copies in `static/documents/` and link them from the pages.

When revising a policy:

1. Add the approved, dated source document and update the table above. Remove the
   superseded source from the current tree; its history remains in Git.
2. Update the corresponding Svelte page in the same change, including its displayed
   date and `time` element. Keep the existing policy URLs.
3. Preserve the approved wording, section numbering, and lists. Use working links
   for email addresses, website addresses, and references to the other policy.
4. Compare the rendered page with the document, check mobile readability and links,
   and run `npm run build` before publishing.

## November 2026 presentation edits

The original Word documents are preserved unchanged. The website normalizes
“Strengthening Our Community” to the existing project name, “Strengthen Our Community”,
and spells out dates. The Privacy Policy's reference to “clicking the box below”
is replaced with a direct email link to `bcycasecretary@gmail.com`, the contact
provided in the source documents. The Terms' “click here” reference links directly
to the Privacy Policy.
