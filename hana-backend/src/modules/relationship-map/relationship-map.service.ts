import { getARRelationshipMap, getAPRelationshipMap } from "./relationship-map.queries";
import { getIcRfqRelationshipMap } from "./relationship-map.ic.queries";

export { getARRelationshipMap, getAPRelationshipMap, getIcRfqRelationshipMap };

export const relationshipMapService = {
  getARRelationshipMap,
  getAPRelationshipMap,
  getIcRfqRelationshipMap,
};
