// Fixed-look bounds, not an optional-stopping procedure. The caller allocates alpha
// across claims and preregistered looks before examining independent seed pairs.
// Median intervals invert Binomial(n, 1/2) tails (conservative with atoms/ties):
// https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm
// Mean intervals use Hoeffding (1963), with a range fixed before observing data:
// https://doi.org/10.1080/01621459.1963.10500830
// alpha is the TOTAL two-sided error budget, split equally between the tails.

function finiteValues(values) {
  if (!Array.isArray(values) || values.some((x) => typeof x !== "number" || !Number.isFinite(x)))
    throw new TypeError("values must be an array of finite numbers");
  // Array#some skips holes; a missing observation must not silently reduce n.
  for (let i = 0; i < values.length; i++)
    if (!Object.hasOwn(values, i)) throw new TypeError("values must not contain holes");
}

function midpoint(a, b) {
  return Math.sign(a) === Math.sign(b) ? a + (b - a) / 2 : a / 2 + b / 2;
}

export function median(values) {
  finiteValues(values);
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : midpoint(sorted[i - 1], sorted[i]);
}

function mean(values) {
  let scale = 0;
  for (const value of values) scale = Math.max(scale, Math.abs(value));
  if (scale === 0) return 0;
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const term = value / scale - correction;
    const next = sum + term;
    correction = next - sum - term;
    sum = next;
  }
  return Math.max(-1, Math.min(1, sum / values.length)) * scale;
}

// Return r such that [X_(r), X_(n-r+1)] has coverage >= 1-alpha.
// r=0 denotes an unbounded interval. Small budgets use exact integer tail counts;
// log arithmetic avoids underflow of 2^-n for larger sample sizes.
function medianRank(n, alpha) {
  const tail = alpha / 2;
  let rank = 0;
  if (n <= 52) {
    let choose = 1n;
    let count = 0n;
    for (let j = 0; j < Math.ceil(n / 2); j++) {
      count += choose;
      if (Number(count) / 2 ** n > tail) break;
      rank = j + 1;
      choose = (choose * BigInt(n - j)) / BigInt(j + 1);
    }
  } else {
    const logTail = Math.log(alpha) - Math.LN2;
    let logProbability = -n * Math.LN2;
    let logCdf = -Infinity;
    for (let j = 0; j < Math.ceil(n / 2); j++) {
      const high = Math.max(logCdf, logProbability);
      logCdf = high + Math.log1p(Math.exp(Math.min(logCdf, logProbability) - high));
      // Conservatively avoid a floating-point boundary decision in the large-n path.
      if (logCdf >= logTail - 1e-12) break;
      rank = j + 1;
      logProbability += Math.log(n - j) - Math.log(j + 1);
    }
  }
  return rank;
}

export function evaluateClaim(values, claim, alpha) {
  finiteValues(values);
  if (!claim || typeof claim !== "object" || Array.isArray(claim))
    throw new TypeError("claim must be an object");
  const allowed = ["estimand", "direction", "threshold", "range"];
  if (Object.keys(claim).some((key) => !allowed.includes(key)))
    throw new TypeError("unknown claim option");
  if (!["median", "mean"].includes(claim.estimand)) throw new TypeError("invalid estimand");
  if (!["at-least", "at-most"].includes(claim.direction)) throw new TypeError("invalid direction");
  if (typeof claim.threshold !== "number" || !Number.isFinite(claim.threshold))
    throw new TypeError("threshold must be finite");
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1)
    throw new TypeError("alpha must be between zero and one");
  const range = claim.range;
  if (claim.estimand === "mean" && range === undefined)
    throw new TypeError("mean requires an a priori range");
  if (range !== undefined) {
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      !Number.isFinite(range[0]) ||
      !Number.isFinite(range[1]) ||
      range[0] > range[1]
    )
      throw new TypeError("range must be ordered finite endpoints");
    if (values.some((value) => value < range[0] || value > range[1]))
      throw new RangeError("observation outside the declared range");
  }
  const n = values.length;
  let lower = -Infinity;
  let upper = Infinity;
  let estimate = null;
  let rank = null;
  if (n > 0 && claim.estimand === "median") {
    const sorted = [...values].sort((a, b) => a - b);
    estimate = median(sorted);
    rank = medianRank(n, alpha);
    if (rank > 0) {
      lower = sorted[rank - 1];
      upper = sorted[n - rank];
    }
  } else if (n > 0) {
    estimate = mean(values);
    const radius = (range[1] - range[0]) * Math.sqrt((Math.log(2) - Math.log(alpha)) / (2 * n));
    lower = Math.max(range[0], estimate - radius);
    upper = Math.min(range[1], estimate + radius);
  }
  let status = "INCONCLUSIVE";
  if (claim.direction === "at-least") {
    if (lower >= claim.threshold) status = "PASS";
    else if (upper < claim.threshold) status = "FAIL";
  } else {
    if (upper <= claim.threshold) status = "PASS";
    else if (lower > claim.threshold) status = "FAIL";
  }
  return { status, n, estimate, lower, upper, alpha, rank };
}
