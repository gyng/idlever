//! Exact current Session absence baseline for Cut244; no grants or storage calls.
use idlever_core::bloodlines::Session;
use serde_json::json;
use std::{fs, path::Path};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    idlever_core::chronicle::use_shipping_words();
    let args: Vec<_> = std::env::args().collect();
    let source = fs::read_to_string(args.get(1).ok_or("SAVE OUTPUT_DIR")?)?;
    let out = Path::new(args.get(2).ok_or("SAVE OUTPUT_DIR")?);
    fs::create_dir(out)?;
    let mut session = Session::load(&source)?;
    fs::write(out.join("loaded.session.json"), session.save())?;
    let selected = session.selected;
    let ids: Vec<_> = std::iter::once(selected).chain(session.others.keys().copied()).collect();
    let mut actions = Vec::new();
    for id in ids {
        session.select_bloodline(id)?;
        let result = if session.run.is_none() { Some(session.try_send()) } else { None };
        actions.push(json!({"selectBloodline":id,"trySend":result}));
    }
    session.select_bloodline(selected)?;
    let prepared = session.save();
    fs::write(out.join("prepared.session.json"), &prepared)?;
    let mut whole = session.clone();
    let expected = whole.run_offline_mode(8 * 3600, false, true);
    assert!(expected.runs > 0);
    fs::write(out.join("whole.report.json"), serde_json::to_vec_pretty(&expected)?)?;
    fs::write(out.join("whole.session.json"), whole.save())?;
    for reload in [false, true] {
        let mut sliced = session.clone();
        let mut remaining = 8 * 3600;
        let mut index = 0;
        let widths = [1, 719, 3600];
        let report = loop {
            let width = remaining.min(widths[index % widths.len()]);
            let last = width == remaining;
            let report = sliced.run_offline_slice(width, last);
            if last { break report; }
            remaining -= width;
            index += 1;
            if reload { sliced = Session::load(&sliced.save())?; }
        };
        let mode = if reload { "reloaded" } else { "sliced" };
        fs::write(out.join(format!("{mode}.report.json")), serde_json::to_vec_pretty(&report)?)?;
        fs::write(out.join(format!("{mode}.session.json")), sliced.save())?;
        assert_eq!(report, expected, "full report: {mode}");
        assert_eq!(serde_json::to_value(&sliced)?, serde_json::to_value(&whole)?, "every Session/replay field: {mode}");
    }
    assert_eq!(session.save(), prepared, "source Session immutable");
    assert_eq!(fs::read_to_string(&args[1])?, source, "input file immutable");
    fs::write(out.join("summary.json"), serde_json::to_vec_pretty(&json!({
        "source":args[1],"selected":selected,"residents":session.others.len()+1,
        "actions":actions,"elapsedSeconds":8*3600,"runs":expected.runs,
        "wholeSlicedReloadedExact":true,"noGrantsOrStorageCalls":true
    }))?)?;
    println!("PASS: {} residents, {} runs, exact whole/sliced/reloaded8h",session.others.len()+1,expected.runs);
    Ok(())
}
