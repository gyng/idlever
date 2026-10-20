#[cfg(test)]
mod tests {
    use idlever_core::cut306_upgrades::Profile;
    use serde_json::json;
    #[test]
    fn complete_reference_and_budget_profiles_parse() {
        let p = Profile::default();
        assert_eq!(
            Profile::parse(&serde_json::to_string(&p).unwrap()).unwrap(),
            p
        );
        let mut value = serde_json::to_value(p).unwrap();
        value["bank_price_units"] = json!([8, 64]);
        value["vat_price_units"] = json!([8, 64]);
        assert_eq!(
            Profile::parse(&value.to_string()).unwrap().bank_price_units,
            [8, 64]
        );
    }
    #[test]
    fn unknown_missing_duplicate_and_wrong_types_are_rejected() {
        let base = serde_json::to_value(Profile::default()).unwrap();
        let mut unknown = base.clone();
        unknown["bank_price_unit"] = json!([8, 20]);
        assert!(Profile::parse(&unknown.to_string()).is_err());
        let mut missing = base.clone();
        missing.as_object_mut().unwrap().remove("vat_hurry_off_pct");
        assert!(Profile::parse(&missing.to_string()).is_err());
        let duplicate = serde_json::to_string(&Profile::default())
            .unwrap()
            .replacen("\"schema\":1", "\"schema\":1,\"schema\":1", 1);
        assert!(Profile::parse(&duplicate).is_err());
        for value in [
            json!([8]),
            json!([8, 20, 30]),
            json!([8.5, 20]),
            json!([-1, 20]),
            json!("8,20"),
        ] {
            let mut p = base.clone();
            p["bank_price_units"] = value;
            assert!(Profile::parse(&p.to_string()).is_err());
        }
    }
    #[test]
    fn bounded_ordered_values_and_version_are_required() {
        let base = serde_json::to_value(Profile::default()).unwrap();
        for (key, value) in [
            ("schema", json!(2)),
            ("gate_depth", json!([23, 13])),
            ("gate_depth", json!([0, 33])),
            ("gate_depth", json!([13, 34])),
            ("bank_price_units", json!([8, 1001])),
            ("vat_price_units", json!([0, 20])),
            ("bank_nights", json!([2, 8])),
            ("bank_nights", json!([5, 17])),
            ("bank_bonus_permille", json!([-1, 40])),
            ("bank_bonus_permille", json!([20, 101])),
            ("vat_recovery_off_pct", json!([20, 81])),
            ("vat_hurry_off_pct", json!([25, 91])),
            ("vat_hurry_off_pct", json!([50, 25])),
        ] {
            let mut p = base.clone();
            p[key] = value;
            assert!(Profile::parse(&p.to_string()).is_err(), "{key}");
        }
        let mut extreme = base;
        extreme["gate_depth"] = json!([33, 33]);
        extreme["bank_price_units"] = json!([1000, 1000]);
        let p = Profile::parse(&extreme.to_string()).unwrap();
        assert_eq!(
            p.bank_price_units[1] * idlever_core::kit::unit(p.gate_depth[1]),
            925_000
        );
    }
}
fn main() {}
