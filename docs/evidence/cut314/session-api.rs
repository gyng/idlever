// Isolated Cut314 addition inside bloodlines.rs; town_from stays the shared authority.
impl Session {
    pub fn building_upgrade_offers(&self) -> Vec<crate::cut306_upgrades::SessionOffer> {
        let mut residents = std::iter::once(&self.active).chain(self.others.values());
        let depth = residents
            .clone()
            .map(|g| g.lineage.best_depth)
            .max()
            .unwrap_or(0);
        let device = residents.any(|g| {
            crate::persistent::service_availability(&g.lineage, crate::persistent::away(g))[2]
        });
        let purse = crate::tree::purse(&self.active.lineage);
        let savings = self.active.lineage.town.bank;
        crate::cut306_upgrades::offers_for(&self.active.lineage, depth, device)
            .into_iter()
            .map(|offer| {
                let withdrawal = (offer.price - purse).max(0);
                crate::cut306_upgrades::SessionOffer {
                    offer,
                    purse,
                    savings,
                    withdrawal,
                    affordable_with_savings: withdrawal <= savings,
                    home: !crate::persistent::away(&self.active),
                }
            })
            .collect()
    }

    /// Explicit town command. Refusals perform no withdrawal, synchronization or tick.
    pub fn upgrade_building(
        &mut self,
        id: &str,
        max_price: i32,
        use_savings: bool,
    ) -> Result<crate::cut306_upgrades::Purchase, String> {
        if crate::persistent::away(&self.active) {
            return Err("hero away".into());
        }
        let quote = self
            .building_upgrade_offers()
            .into_iter()
            .find(|o| o.offer.id == id)
            .ok_or("no upgrade")?;
        if !quote.offer.ready {
            return Err(format!("D{} needed", quote.offer.gate));
        }
        if quote.offer.price > max_price {
            return Err("price changed".into());
        }
        if quote.withdrawal > 0 && (!use_savings || !quote.affordable_with_savings) {
            return Err("not enough gold".into());
        }
        // Every fallible eligibility/funding check precedes mutation. The validated
        // withdrawal is exact, and no public single-hero eligibility is substituted
        // for the town-wide quote after funds move.
        if quote.withdrawal > 0 {
            let got = self
                .active
                .bank_withdraw(quote.withdrawal)
                .expect("validated positive owned Savings withdrawal");
            assert_eq!(got, quote.withdrawal);
        }
        self.active.lineage.gold_move(
            -quote.offer.price,
            &format!("upgrade {id} {}", quote.offer.level),
        );
        self.active
            .lineage
            .town
            .levels
            .insert(id.into(), quote.offer.level);
        for g in self.others.values_mut() {
            town_from(&self.active.lineage, &mut g.lineage);
        }
        Ok(crate::cut306_upgrades::Purchase {
            payer: self.selected,
            id: id.into(),
            level: quote.offer.level,
            price: quote.offer.price,
            withdrawal: quote.withdrawal,
            gold_after: self.active.lineage.gold,
            purse_after: crate::tree::purse(&self.active.lineage),
            savings_after: self.active.lineage.town.bank,
        })
    }
}
