import {
  defineSearchAttributeKey,
  SearchAttributeType,
} from '@temporalio/common';

// KEYWORD (exact-match), not TEXT: these are IDs, queried only by equality
// (`postId="..."`). Temporal's Postgres visibility caps custom Text attributes
// at 3 (already used by CustomTextField/CustomStringField), so TEXT here fails
// registration with "cannot have more than 3 search attribute of type Text".
// Keyword has ample columns and is the correct type for IDs.
export const organizationId = defineSearchAttributeKey(
  'organizationId',
  SearchAttributeType.KEYWORD
);

export const postId = defineSearchAttributeKey(
  'postId',
  SearchAttributeType.KEYWORD
);
