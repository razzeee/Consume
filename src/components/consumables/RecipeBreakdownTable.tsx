import type { IngredientFulfillmentRow } from '#/domain/types'
import WowIcon from '#/components/WowIcon'
import { getIngredientIconCandidates } from '#/domain/wowIcons'

type Props = {
  bom: IngredientFulfillmentRow[]
}

export default function RecipeBreakdownTable({ bom }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--wow-line)]">
      <table className="raid-bom-table min-w-full border-collapse text-sm">
        <thead className="bg-[var(--wow-surface-deep)] text-left text-xs uppercase tracking-[0.12em] text-[var(--wow-ink-soft)]">
          <tr>
            <th className="px-3 py-2">Ingredient</th>
            <th className="px-3 py-2">Baseline required</th>
            <th className="px-3 py-2">Ingredient supplied</th>
            <th className="px-3 py-2">Ready equivalent reduction</th>
            <th className="px-3 py-2">Remaining</th>
            <th className="px-3 py-2">Progress</th>
          </tr>
        </thead>
        <tbody>
          {bom.map((row) => {
            const progressRatio =
              row.baselineRequired <= 0
                ? 1
                : Math.min(
                    1,
                    Math.max(
                      0,
                      (row.baselineRequired - row.remaining) /
                        row.baselineRequired,
                    ),
                  )

            return (
              <tr
                key={row.ingredientId}
                className="border-t border-[var(--wow-line)]"
              >
                <td className="px-3 py-2 font-medium text-[var(--wow-ink)]">
                  <span className="inline-flex items-center gap-2">
                    <WowIcon
                      alt={row.ingredientName}
                      candidates={getIngredientIconCandidates({
                        id: row.ingredientId,
                        name: row.ingredientName,
                        iconKey: row.ingredientIconKey,
                      })}
                      className="h-5 w-5 rounded border border-[var(--wow-line)] object-cover"
                    />
                    {row.ingredientName}
                  </span>
                </td>
                <td className="px-3 py-2 text-[var(--wow-ink-soft)]">
                  {row.baselineRequired}
                </td>
                <td className="px-3 py-2 text-[var(--wow-ink-soft)]">
                  {row.ingredientSupplied}
                </td>
                <td className="px-3 py-2 text-[var(--wow-ink-soft)]">
                  {row.readyEquivalentReduction}
                </td>
                <td className="px-3 py-2 font-semibold text-[var(--wow-ink)]">
                  {row.remaining}
                </td>
                <td className="px-3 py-2 text-[var(--wow-ink-soft)]">
                  <div className="progress-meter min-w-24">
                    <div
                      className="progress-meter-fill"
                      style={{ width: `${Math.round(progressRatio * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
