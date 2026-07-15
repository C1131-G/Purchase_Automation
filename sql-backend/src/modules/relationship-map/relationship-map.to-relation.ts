/** Maps a raw document row into the relationship-graph node shape. */
export const toRelationNode = (doc: Record<string, unknown>) => ({
  cardCode: doc.cardCode ?? doc.filler ?? null,
  cardName: doc.cardName ?? null,
  docDate: doc.docDate,
  docEntry: doc.id,
  docNum: doc.docNum,
  docStatus: doc.docStatus,
  docTotal: doc.docTotal,
});
