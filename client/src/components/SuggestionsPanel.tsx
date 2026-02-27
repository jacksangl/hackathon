import { RewriteResponse } from "../lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SuggestionsPanelProps {
  data: RewriteResponse | null;
  isLoading: boolean;
  error: string | null;
  onApplyRewrite: (text: string) => void;
}

export const SuggestionsPanel = ({
  data,
  isLoading,
  error,
  onApplyRewrite,
}: SuggestionsPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Suggestions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-mutedForeground">Updating suggestions...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!isLoading && !error && !data ? (
          <p className="text-sm text-mutedForeground">Start editing to get AI suggestions.</p>
        ) : null}

        {data ? (
          <>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {data.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="rounded-md border bg-muted p-3 text-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-mutedForeground">Rewritten text</p>
              <p>{data.rewrittenText}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.keywordsUsed.map((keyword) => (
                <span key={keyword} className="rounded bg-accent px-2 py-1 text-xs">
                  {keyword}
                </span>
              ))}
            </div>

            <Button variant="outline" onClick={() => onApplyRewrite(data.rewrittenText)}>
              Apply Rewrite
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
