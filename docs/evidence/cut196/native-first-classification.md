# Cut196 — first native failure classification

Original audit:801 passed,36 failed,6 ignored in52.85s. Raw log remains
`scratchpad/cut196/native-first.log`; historical fixture evidence is unchanged.

These classifications describe each first failed assertion, not permission to
ignore later failures. No first assertion establishes a runtime defect: all
conflict with explicit owner changes. Unrelated assertions remain required.

| Failed test | Superseded expectation / required replacement |
| --- | --- |
| `endgame::tests::live_unsettled_absence_and_invalid_state_requests_preserve_exact_saves` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::a_boss_that_cannot_be_hurt_drives_the_hero_off` | Return/guard financial share60% or0. Financial returns100% while XP/renown retain their existing yield rules; preserve exact reconciliation. |
| `firearm::class_tests::paid_backup_is_optional_home_only_and_remains_kit_on_actual_sends` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::a_pack_swap_that_lowers_the_carry_is_on_the_exit_line` | Physical-item loss refunds pickup value. Conversion is final; test no coin deduction and actual currency theft separately. |
| `tests::a_death_the_replays_all_survive_is_dice_and_its_patches_act_on_the_floor` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::a_return_walks_home_and_can_die_on_the_way` | Return/guard financial share60% or0. Financial returns100% while XP/renown retain their existing yield rules; preserve exact reconciliation. |
| `tests::a_watched_exit_carries_the_automations_picks` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::an_unused_supply_comes_back_to_the_shelf` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::auto_keep_follows_the_chip_and_never_evicts_across_categories` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::auto_supply_restocks_the_shelf_when_the_hero_comes_home` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::bones_only_has_no_vault` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::bank_keeps_all_loot_and_gold` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::carried_gold_never_goes_below_zero` | Physical-item loss refunds pickup value. Conversion is final; test no coin deduction and actual currency theft separately. |
| `tests::death_keeps_nothing_and_leaves_bones` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::death_deltas_are_the_camp_forecasts_move` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::exit_event_stake_and_report_carry_the_ledger` | Return/guard financial share60% or0. Financial returns100% while XP/renown retain their existing yield rules; preserve exact reconciliation. |
| `tests::first_bank_at_each_depth_is_a_mark` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::exit_pending_then_keep_and_keep_pref` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::forge_rows_carry_the_next_rung` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::found_supplies_go_to_the_shelf_and_the_repeat_buys_only_used_kinds` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::loot_is_one_unit_from_pickup_to_the_bank` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::no_mark_for_the_frontier_and_one_a_night` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::ledger_line_reconciles_on_every_exit` | Return/guard financial share60% or0. Financial returns100% while XP/renown retain their existing yield rules; preserve exact reconciliation. |
| `tests::return_keeps_sixty_percent` | Return/guard financial share60% or0. Financial returns100% while XP/renown retain their existing yield rules; preserve exact reconciliation. |
| `tests::salvage_feeds_the_forge_and_tiers_apply` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::the_repeat_remembers_and_restores_a_kind_at_zero_gold` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::theft_carries_its_amount` | Physical-item loss refunds pickup value. Conversion is final; test no coin deduction and actual currency theft separately. |
| `tests::unlocked_supplies_are_free_at_zero_gold_and_never_kept_back` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::the_nights_ledger_reconciles_and_a_wasted_kind_is_not_rebought` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::saves_from_307dbed_send_identically` | Old cross-version golden hash. Compare actual current-engine events/outcomes across serialization; preserve historical evidence. |
| `tests_cut28::a_caged_item_reaches_the_keep_sheet` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests::the_keep_sheets_prices_are_the_ledgers` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |
| `tests_cut305::guide_income_counts_actual_checkpoint_passage_and_rounded_exit_payment` | Return/guard financial share60% or0. Financial returns100% while XP/renown retain their existing yield rules; preserve exact reconciliation. |
| `tests_cut119::the_307dbed_hash_restores_with_pets_pinned_off` | Old cross-version golden hash. Compare actual current-engine events/outcomes across serialization; preserve historical evidence. |
| `tests_cut118::the_307dbed_hash_holds_with_the_systems_pinned_off` | Old cross-version golden hash. Compare actual current-engine events/outcomes across serialization; preserve historical evidence. |
| `tests_cut30_pkg::prospective_projection_death_deltas_measure_current_indices_and_recache_after_edits` | Manual Keep/storage/found shelving or spending/discovery via old salvage. Assert no deferred decision, one pickup value, quantities/ownership/discovery and zero preparation cost. |

All36 failures are listed. Runtime defects found by subsequent retained or new
assertions must be recorded separately and fixed; this table does not certify
the full audit, queue, balance or fun acceptance.

Subsequent genuine metadata defect: a merged stack with2 prepared leashes and3
found leashes produced correct money/discovery/fate totals, but its find card
displayed `leash (5)`. A stricter independent card-label assertion exposed it
(`scratchpad/cut196/merged-card-regression.log`). The fix clamps the display
clone to actual remaining found units; it does not modify the physical stack,
prepared ownership, bones or currency. Targeted results are recorded in
`merged-card-fixed.log` and `merged-card-clippy.log` in the same directory.
