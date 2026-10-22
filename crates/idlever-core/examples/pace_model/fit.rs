//! Layer 1 fit: the expedition as a Markov chain over floors. A send ends on floor f (does not take its stairs)
//! with hazard σ(η), η = α_state + β_L·Δlevel + ψ(content) + ω_wall + δ_wall·drilled; each state's α is its power
//! (logit units, lower is stronger), ψ the depth's difficulty (smooth), ω/δ the walls (band bosses, the Foundry's
//! golem band) and what a drill takes off them. Fitted by penalized IRLS (Gaussian priors); the per-profile refit
//! starts from the calibration's estimates as prior means.
use super::kernel::Sample;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const NW: usize = 7;
pub const C: usize = 33;
/// The last floor a send is followed to (the King's, at stretch 3); deeper ends are censored there.
pub fn max_floor(st: &Structure) -> u32 { 33 * st.stretch }

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub struct Structure {
    pub stretch: u32,
    pub laps: bool,
    pub expedition: bool,
}
impl Structure {
    pub fn of(b: &idlever_core::balance::Balance) -> Structure {
        Structure { stretch: b.expedition.stretch.max(1), laps: b.expedition.laps, expedition: b.expedition.on }
    }
    fn lap_floors(&self) -> u32 { 33 * self.stretch }
    pub fn lap(&self, f: u32) -> u32 { if self.laps { f.saturating_sub(1) / self.lap_floors() } else { 0 } }
    pub fn content(&self, f: u32) -> u32 { (f.saturating_sub(self.lap(f) * self.lap_floors())).div_ceil(self.stretch) }
    pub fn band(&self, f: u32) -> bool { f.saturating_sub(self.lap(f) * self.lap_floors()).is_multiple_of(self.stretch) }
    pub fn reach(&self, f: u32) -> u32 { if self.lap(f) > 0 { 33 } else { f / self.stretch } }
}

/// The wall a floor is (0–5: the band bosses at content 8/13/18/23/28/33 on their band's last floor; 6: the Foundry's
/// golem band, the four contents above its master) and whether its drill is held.
pub fn wall_of(st: &Structure, f: u32, walls: &[(u32, String, bool)]) -> Option<(usize, bool)> {
    if st.lap(f) > 0 {
        return None;
    }
    let c = st.content(f);
    if st.band(f) {
        if let Some(i) = walls.iter().position(|w| w.0 == c) {
            let k = super::kernel::WALLS.iter().position(|x| *x == c).unwrap_or(0);
            return Some((k, walls[i].2));
        }
    }
    walls.iter().find(|w| w.1 == "foundry_master" && c + 4 >= w.0 && c < w.0).map(|w| (6, w.2))
}

/// Aggregated at-risk rows: (state, Δlevel, content, wall, drilled) → (at risk, ended), weighted.
pub type Rows = BTreeMap<(usize, i32, u32, i32, bool), (f64, f64)>;

pub fn rows(samples: &[Sample], st: &Structure, index: &BTreeMap<String, usize>, base_level: &BTreeMap<String, u32>) -> Rows {
    let mut agg = Rows::new();
    let top = max_floor(st);
    for x in samples {
        let Some(&s) = index.get(&x.state) else { continue };
        let dl = x.level as i32 - base_level.get(&x.state).copied().unwrap_or(x.level) as i32;
        let m = x.max_floor.min(top);
        let ended = !(x.capped || x.max_floor > top);
        // a branch past the first shares the walk to its floor with the natural one: it adds the floors from there
        let first = if x.branch > 0 { x.from.max(1) } else { x.start.max(1) };
        for f in first..=m {
            let w = wall_of(st, f, &x.walls);
            let key = (s, dl, st.content(f).clamp(1, C as u32), w.map_or(-1, |w| w.0 as i32), w.is_some_and(|w| w.1));
            let e = agg.entry(key).or_insert((0.0, 0.0));
            e.0 += 1.0;
            if f == m && ended {
                e.1 += 1.0;
            }
        }
    }
    agg
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Hazard {
    pub alpha: Vec<f64>,
    pub beta_l: f64,
    pub psi: Vec<f64>,
    pub omega: Vec<f64>,
    pub delta: Vec<f64>,
    /// How much of the state's power (α + ψ) a boss wall feels (fitted on a grid; 1: as any floor).
    #[serde(default = "one")]
    pub gamma: f64,
}
fn one() -> f64 { 1.0 }
impl Hazard {
    pub fn len(states: usize) -> usize { states + 1 + C + 2 * NW }
    pub fn to_vec(&self) -> Vec<f64> {
        let mut v = self.alpha.clone();
        v.push(self.beta_l);
        v.extend(&self.psi);
        v.extend(&self.omega);
        v.extend(&self.delta);
        v
    }
    pub fn from_vec(v: &[f64], states: usize, gamma: f64) -> Hazard {
        let o = states + 1;
        Hazard { alpha: v[..states].to_vec(), beta_l: v[states], psi: v[o..o + C].to_vec(), omega: v[o + C..o + C + NW].to_vec(), delta: v[o + C + NW..o + C + 2 * NW].to_vec(), gamma }
    }
    /// The hazard of ending on a floor of `content` (a wall `w`, drilled or not) for power `alpha`.
    pub fn eta(&self, alpha: f64, content: u32, w: Option<(usize, bool)>) -> f64 {
        let mut e = alpha + self.psi[(content.clamp(1, C as u32) - 1) as usize];
        if let Some((k, d)) = w {
            if k < 6 {
                e *= self.gamma;
            }
            e += self.omega[k] + if d { self.delta[k] } else { 0.0 };
        }
        e
    }
}

/// Prior: means and a precision matrix (dense; the parameter count is a few hundred).
pub struct Prior {
    pub mean: Vec<f64>,
    pub prec: Vec<Vec<f64>>,
}

/// The default prior: flat state powers, a smooth ψ (second differences), ψ(1) anchored at 0, walls and drills N(0, 2²).
pub fn default_prior(states: usize, alpha0: f64) -> Prior {
    let p = Hazard::len(states);
    let mut mean = vec![0.0; p];
    let mut prec = vec![vec![0.0; p]; p];
    for (s, m) in mean.iter_mut().enumerate().take(states) {
        *m = alpha0;
        prec[s][s] = 1e-4;
    }
    prec[states][states] = 1e-2;
    let o = states + 1;
    smooth(&mut prec, o, 4.0);
    prec[o][o] += 1e4;
    for k in 0..2 * NW {
        prec[o + C + k][o + C + k] += 0.04;
    }
    Prior { mean, prec }
}
/// Second-difference smoothness on ψ (block at `o`).
pub fn smooth(prec: &mut [Vec<f64>], o: usize, lam: f64) {
    for c in 2..C {
        let idx = [o + c - 2, o + c - 1, o + c];
        let v = [1.0, -2.0, 1.0];
        for a in 0..3 {
            for b in 0..3 {
                prec[idx[a]][idx[b]] += lam * v[a] * v[b];
            }
        }
    }
}

fn sigmoid(x: f64) -> f64 { 1.0 / (1.0 + (-x.clamp(-35.0, 35.0)).exp()) }

/// Penalized IRLS (Newton) for the aggregated binomial rows.
/// A row's nonzero (index, value) pairs, its trials and its events.
type Sparse = (Vec<(usize, f64)>, f64, f64);

/// Returns the estimate and its penalized log-likelihood.
pub fn irls(agg: &Rows, states: usize, prior: &Prior, start: &[f64], gamma: f64) -> (Vec<f64>, f64) {
    let p = Hazard::len(states);
    let o = states + 1;
    let mut th = start.to_vec();
    let idx = |k: &(usize, i32, u32, i32, bool)| -> Vec<(usize, f64)> {
        let g = if (0..6).contains(&k.3) { gamma } else { 1.0 };
        let mut v = vec![(k.0, g)];
        if k.1 != 0 {
            v.push((states, g * k.1 as f64));
        }
        v.push((o + k.2 as usize - 1, g));
        if k.3 >= 0 {
            v.push((o + C + k.3 as usize, 1.0));
            if k.4 {
                v.push((o + C + NW + k.3 as usize, 1.0));
            }
        }
        v
    };
    let rows: Vec<Sparse> = agg.iter().map(|(k, v)| (idx(k), v.0, v.1)).collect();
    for _ in 0..200 {
        let mut g = vec![0.0; p];
        let mut h = vec![vec![0.0; p]; p];
        for (x, n, y) in &rows {
            let eta: f64 = x.iter().map(|(i, v)| th[*i] * v).sum();
            let pr = sigmoid(eta);
            let w = n * pr * (1.0 - pr);
            let r = y - n * pr;
            for (i, vi) in x {
                g[*i] += r * vi;
                for (j, vj) in x {
                    h[*i][*j] += w * vi * vj;
                }
            }
        }
        for i in 0..p {
            let mut q = 0.0;
            for j in 0..p {
                let pij = prior.prec[i][j];
                if pij != 0.0 {
                    q += pij * (th[j] - prior.mean[j]);
                    h[i][j] += pij;
                }
            }
            g[i] -= q;
        }
        let mut step = solve(h, g);
        let m = step.iter().fold(0.0f64, |a, b| a.max(b.abs()));
        if m > 3.0 {
            for s in &mut step {
                *s *= 3.0 / m;
            }
        }
        for i in 0..p {
            th[i] += step[i];
        }
        if m < 1e-9 {
            break;
        }
    }
    let mut ll = 0.0;
    for (x, n, y) in &rows {
        let eta: f64 = x.iter().map(|(i, v)| th[*i] * v).sum();
        let pr = sigmoid(eta).clamp(1e-300, 1.0 - 1e-16);
        ll += y * pr.ln() + (n - y) * (1.0 - pr).ln();
    }
    for i in 0..p {
        for j in 0..p {
            ll -= 0.5 * (th[i] - prior.mean[i]) * prior.prec[i][j] * (th[j] - prior.mean[j]);
        }
    }
    (th, ll)
}

/// Gaussian elimination with partial pivoting (symmetric positive definite in practice).
pub fn solve(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Vec<f64> {
    let n = b.len();
    for i in 0..n {
        let piv = (i..n).max_by(|x, y| a[*x][i].abs().total_cmp(&a[*y][i].abs())).unwrap_or(i);
        a.swap(i, piv);
        b.swap(i, piv);
        let d = a[i][i];
        if d.abs() < 1e-300 {
            continue;
        }
        for r in i + 1..n {
            let f = a[r][i] / d;
            if f != 0.0 {
                let (top, bottom) = a.split_at_mut(r);
                for (x, y) in bottom[0][i..n].iter_mut().zip(&top[i][i..n]) {
                    *x -= f * y;
                }
                b[r] -= f * b[i];
            }
        }
    }
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        let s: f64 = (i + 1..n).map(|c| a[i][c] * x[c]).sum();
        x[i] = if a[i][i].abs() < 1e-300 { 0.0 } else { (b[i] - s) / a[i][i] };
    }
    x
}

/// The rest of a send's measured kernel: floor times, the final floor, XP and wealth per send, how it ends.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Aux {
    /// Ticks per floor by content (1..=33).
    pub tau: Vec<f64>,
    /// Ticks on the final floor by exit tier (bank, return, death).
    pub last: [f64; 3],
    /// XP per Σ(2 + content) of the floors walked, by tier (bank, return).
    pub xp_k: [f64; 2],
    /// Wealth per send: a + b·Σ content of the floors walked.
    pub wealth: [f64; 2],
    /// P(death | the send ends here), by content bucket (content/5, 0–6) × (a wall floor).
    pub pdeath: Vec<f64>,
    /// P(return | alive).
    pub p_return: f64,
}
pub fn bucket(c: u32, wall: bool) -> usize { (c / 5).min(6) as usize * 2 + wall as usize }

pub fn aux(samples: &[Sample], st: &Structure, prior: Option<&Aux>) -> Aux {
    let mut dur: Vec<(f64, f64)> = vec![(0.0, 0.0); C];
    let mut last = [(0.0, 0.0); 3];
    let mut xp = [(0.0, 0.0); 2];
    let mut wealth: Vec<(f64, f64)> = Vec::new();
    let mut pd = vec![(0.0, 0.0); 14];
    let (mut alive, mut ret) = (0.0, 0.0);
    let tier_i = |t: &str| match t { "bank" => Some(0), "return" => Some(1), "death" => Some(2), _ => None };
    for x in samples.iter().filter(|x| x.branch == 0) {
        for w in x.floors.windows(2) {
            if w[1].0 == w[0].0 + 1 {
                let c = st.content(w[0].0).clamp(1, C as u32) as usize - 1;
                dur[c].0 += f64::from(w[1].1 - w[0].1);
                dur[c].1 += 1.0;
            }
        }
        let Some(ti) = tier_i(&x.tier) else { continue };
        if let Some(f) = x.floors.last() {
            last[ti].0 += f64::from(x.turns.saturating_sub(f.1));
            last[ti].1 += 1.0;
        }
        let walked: Vec<u32> = (x.start.max(1)..=x.max_floor.min(max_floor(st))).map(|f| st.content(f)).collect();
        let feat: f64 = walked.iter().map(|c| 2.0 + f64::from(*c)).sum();
        if ti < 2 {
            xp[ti].0 += f64::from(x.xp);
            xp[ti].1 += feat;
            alive += 1.0;
            ret += (ti == 1) as u32 as f64;
        }
        wealth.push((walked.iter().map(|c| f64::from(*c)).sum(), x.wealth as f64));
        let w = wall_of(st, x.max_floor, &x.walls).is_some_and(|w| w.0 < 6);
        let b = bucket(st.content(x.max_floor), w);
        pd[b].0 += 1.0;
        pd[b].1 += (ti == 2) as u32 as f64;
    }
    // floor times: a content with few floors walked borrows a log-linear trend
    let pts: Vec<(f64, f64, f64)> = dur.iter().enumerate().filter(|(_, d)| d.1 > 0.0).map(|(c, d)| ((c + 1) as f64, (d.0 / d.1).ln(), d.1)).collect();
    let (a, b) = wls(&pts);
    let tau: Vec<f64> = (0..C)
        .map(|c| {
            let trend = (a + b * (c + 1) as f64).exp();
            let k = 10.0;
            let base = prior.map_or(trend, |p| p.tau[c]);
            (dur[c].0 + k * base) / (dur[c].1 + k)
        })
        .collect();
    let lastv = [0, 1, 2].map(|i| if last[i].1 > 0.0 { (last[i].0 + 3.0 * prior.map_or(1500.0, |p| p.last[i])) / (last[i].1 + 3.0) } else { prior.map_or(1500.0, |p| p.last[i]) });
    let xpv = [0, 1].map(|i| if xp[i].1 > 0.0 { xp[i].0 / xp[i].1 } else { prior.map_or(if i == 0 { 1.8 } else { 1.1 }, |p| p.xp_k[i]) });
    let wfit = {
        let n = wealth.len() as f64;
        if n >= 3.0 {
            let mx = wealth.iter().map(|w| w.0).sum::<f64>() / n;
            let my = wealth.iter().map(|w| w.1).sum::<f64>() / n;
            let sxx: f64 = wealth.iter().map(|w| (w.0 - mx).powi(2)).sum();
            let sxy: f64 = wealth.iter().map(|w| (w.0 - mx) * (w.1 - my)).sum();
            let b = if sxx > 0.0 { sxy / sxx } else { 0.0 };
            [my - b * mx, b]
        } else {
            prior.map_or([0.0, 0.0], |p| p.wealth)
        }
    };
    let pdeath: Vec<f64> = (0..14).map(|i| (pd[i].1 + 2.0 * prior.map_or(0.1, |p| p.pdeath[i])) / (pd[i].0 + 2.0)).collect();
    let p_return = (ret + 2.0 * prior.map_or(0.2, |p| p.p_return)) / (alive + 2.0);
    Aux { tau, last: lastv, xp_k: xpv, wealth: wfit, pdeath, p_return }
}

fn wls(pts: &[(f64, f64, f64)]) -> (f64, f64) {
    let sw: f64 = pts.iter().map(|p| p.2).sum();
    if sw <= 0.0 {
        return (7.3, 0.0);
    }
    let mx = pts.iter().map(|p| p.0 * p.2).sum::<f64>() / sw;
    let my = pts.iter().map(|p| p.1 * p.2).sum::<f64>() / sw;
    let sxx: f64 = pts.iter().map(|p| p.2 * (p.0 - mx).powi(2)).sum();
    let sxy: f64 = pts.iter().map(|p| p.2 * (p.0 - mx) * (p.1 - my)).sum();
    let b = if sxx > 0.0 { sxy / sxx } else { 0.0 };
    (my - b * mx, b)
}
