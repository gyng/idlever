# Cut 191 — superseded preparation assertions

The owner requires unlocked items to be free to equip, use and replenish.
Gold remains a price for permanent unlocks/upgrades. This amendment replaces
the old per-run purchase and offline preparation-income cap; it does not relax
pack capacity, item eligibility, authored choices or source ownership.

Changed assertions in `tests_cut30_pkg.rs`:

- Automatic sustain replaces only obsolete automatic stock at zero Gold and
  zero offline income. The surviving counter retains its actual instance ID.
- Shared-counter preparation fills two healing slots and one counter slot
  without a spending row or budget warning. Manual, found and kennel-provided
  supplies still retain their protected slots.
- Literal/custom repeat quantities and unknown-origin authored ownership stay
  exact. An obsolete negative quote neither charges nor grants Gold; deleting
  one item still removes exactly its corresponding saved repeat slot.
- The automatic two-heal pack works with no offline income, with income, and
  online. No zero-value entries masquerade as preparation spending.

Changed assertion in `tests_cut117.rs`:

- Four actual eight-hour offline simulations retain a functioning run loop
  after paid apprentice forge activity and never claim that free preparation
  exhausted an income budget. A zero-Gold, zero-income refill prepares exactly
  three heals and its report has no supply budget or related worker warning.

The original failed audit remains in `scratchpad/cut191/native-all.log`.
Targeted raw results are `pack-amendment.log` and `budget-amendment.log` in the
same directory. These targeted checks do not certify the full queue, the full
native audit, balance gates, browser behavior or fun-rating acceptance.
