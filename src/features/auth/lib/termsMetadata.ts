/** Metadata recorded with the signup (client-side record; not yet persisted server-side). */
export const termsMetadata = (version: string) => ({
  terms_accepted_at: new Date().toISOString(),
  terms_version: version,
});
