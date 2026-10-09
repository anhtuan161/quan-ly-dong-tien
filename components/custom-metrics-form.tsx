"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveCustomMetrics } from "@/lib/actions";
import type { CustomMetric } from "@/lib/types";
import { BUILTIN_VARIABLES } from "@/lib/formulas";

export function CustomMetricsForm({ projectId, initialMetrics }: { projectId: string; initialMetrics: CustomMetric[] }) {
  const [metrics, setMetrics] = useState<CustomMetric[]>(
    initialMetrics.length > 0 ? initialMetrics : [{ key: "", label: "", formula: "", format: "currency" }]
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addMetric = () => {
    setMetrics([...metrics, { key: "", label: "", formula: "", format: "currency" }]);
  };

  const removeMetric = (index: number) => {
    const newMetrics = [...metrics];
    newMetrics.splice(index, 1);
    setMetrics(newMetrics);
  };

  const updateMetric = (index: number, field: keyof CustomMetric, value: string) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setMetrics(newMetrics);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Filter out completely empty rows
    const validMetrics = metrics.filter(m => m.key.trim() !== "" || m.formula.trim() !== "");

    startTransition(async () => {
      const result = await saveCustomMetrics(projectId, validMetrics);
      if (!result.ok) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Clean up UI state to match valid metrics
        if (validMetrics.length === 0) {
          setMetrics([{ key: "", label: "", formula: "", format: "currency" }]);
        } else {
          setMetrics(validMetrics);
        }
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 items-start border p-3 rounded-md relative">
            <div className="col-span-12 md:col-span-3 space-y-2">
              <Label className="text-xs">Key (Variable name)</Label>
              <Input 
                placeholder="e.g. TAX_ESTIMATE" 
                value={metric.key} 
                onChange={e => updateMetric(index, "key", e.target.value)} 
                pattern="^[A-Za-z][A-Za-z0-9_]{0,39}$"
                required
              />
            </div>
            <div className="col-span-12 md:col-span-3 space-y-2">
              <Label className="text-xs">Label (Optional UI name)</Label>
              <Input 
                placeholder="e.g. Tax (10%)" 
                value={metric.label || ""} 
                onChange={e => updateMetric(index, "label", e.target.value)} 
              />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label className="text-xs">Formula</Label>
              <Input 
                placeholder="e.g. TOTAL_INCOME * 0.1" 
                value={metric.formula} 
                onChange={e => updateMetric(index, "formula", e.target.value)} 
                required
              />
            </div>
            <div className="col-span-10 md:col-span-2 space-y-2">
              <Label className="text-xs">Format</Label>
              <Select value={metric.format || "currency"} onValueChange={(v) => updateMetric(index, "format", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
              onClick={() => removeMetric(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-2 text-xs text-muted-foreground">
        <p><strong>Available Built-in Variables:</strong></p>
        <p className="font-mono">{BUILTIN_VARIABLES.join(", ")}</p>
        <p>You can also reference the <code>Key</code> of any custom metric defined above it.</p>
      </div>

      {error && <div className="text-sm font-medium text-destructive">{error}</div>}
      {success && <div className="text-sm font-medium text-emerald-500">Settings saved successfully!</div>}

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={addMetric}>
          <Plus className="mr-2 h-4 w-4" /> Add Metric
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Metrics"}
        </Button>
      </div>
    </form>
  );
}
