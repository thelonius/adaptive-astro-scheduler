# Feedback

Three feedback channels that turn live usage into training data.
Each one references traces by `request_id` — the trace remains the
single source of truth about what happened.

## 1. Recipe feedback (highest value)

User sees the LLM-generated recipe in the debug UI and edits it:
removes a predicate, changes a weight, adds a constraint. Every
edit is a (prompt → corrected_recipe) pair — supervised label data
for future fine-tuning.

`recipe-feedback.ts` — endpoint
`POST /optimal-timing/v2/feedback/recipe` accepting:

```ts
{
  request_id: string;       // links to the trace
  edited_recipe: Recipe;    // user's corrected version
  edit_reason?: string;     // free-text "why I changed it"
}
```

Stored in table `recipe_edits`:
```
(id, request_id, user_id, original_recipe JSONB, edited_recipe JSONB,
 diff JSONB, edit_reason TEXT, created_at TIMESTAMPTZ)
```

The `diff` field is computed server-side: which predicates were
added / removed / had weights changed. Makes downstream analysis
(e.g. "for relationship intents, users consistently raise the Venus
applying-trine weight") trivial.

## 2. Outcome feedback (secondary)

Post-event rating after the user actually uses a recommended date.
Push notification N days after the recommended date asking
"how did it go?" with 1–5 stars + free text.

`outcome-feedback.ts` — endpoint
`POST /optimal-timing/v2/feedback/outcome`:

```ts
{
  request_id: string;
  used_date: string;       // ISO date the user actually picked
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}
```

Caveats (read these before relying on this signal):
- **Selection bias**: only motivated users respond.
- **Timing**: outcomes for long-term things (business launches)
  aren't visible at +30d.
- **Confirmation bias**: users who rated the recipe high may
  remember the outcome more positively.

So treat outcome data as a secondary, slow-moving signal. Don't
update predicate weights from one rating; aggregate over hundreds
before adjusting anything.

## 3. Quick reaction (fast signal)

`POST /optimal-timing/v2/feedback/reaction`:

```ts
{
  request_id: string;
  reaction: 'fire' | 'meh' | 'wrong';
  target: 'recipe' | 'top_day' | 'overall';
}
```

Cheap signal users can give without thinking. Useful for
dashboards ("which intents have the lowest 'fire' rate") to find
problem areas before formal evals catch them.

## Privacy / ethics

Feedback inherits the privacy posture of the trace it references.
Never use individual feedback in marketing or shareable
aggregations without explicit consent. Aggregate stats only.
