import { useEffect } from "react";
import { useMatch, useMatches } from "@tanstack/react-router";

const routeTitles = new Map<string, string>();

export function useDocumentTitle(title: string) {
  const match = useMatch({ strict: false });
  const matches = useMatches();

  useEffect(() => {
    routeTitles.set(match.id, title);

    const activeMatches = [...matches].reverse();
    const activeTitleMatch = activeMatches.find((m) => routeTitles.has(m.id));
    if (activeTitleMatch) {
      document.title = routeTitles.get(activeTitleMatch.id)!;
    }

    return () => {
      routeTitles.delete(match.id);

      const remainingMatches = [...matches].reverse();
      const nextTitleMatch = remainingMatches.find((m) => routeTitles.has(m.id));
      if (nextTitleMatch) {
        document.title = routeTitles.get(nextTitleMatch.id)!;
      }
    };
  }, [title, match.id, matches]);
}
