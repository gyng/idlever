//! Controlled authored catalogue export; no gameplay/earned eligibility claim.
use idlever_core::{class_tree, hero::Class};
fn main() {
    let classes = Class::EVERY
        .into_iter()
        .map(|class| {
            serde_json::json!({
                "class":class.name(),"nodes":class_tree::catalogue(class)
            })
        })
        .collect::<Vec<_>>();
    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!({
            "scope":"Authored native catalogue; not an earned save or owned-eligibility fixture",
            "classes":classes
        }))
        .unwrap()
    );
}
