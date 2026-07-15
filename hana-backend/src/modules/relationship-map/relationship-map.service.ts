import {
  getARRelationshipMap,
  getAPRelationshipMap,
  getInventoryRelationshipMap,
} from "./relationship-map.queries";

export { getARRelationshipMap, getAPRelationshipMap, getInventoryRelationshipMap };

export const relationshipMapService = {
  getARRelationshipMap,
  getAPRelationshipMap,
  getInventoryRelationshipMap,
};
