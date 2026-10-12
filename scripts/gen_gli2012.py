import sys, rdata
d = rdata.conversion.convert(rdata.parser.parse_file('gli/sysdata.rda'))
l = d['lookup']
names = {1: 'male', 2: 'female'}
def fmt(vals):
    out = []
    for v in vals:
        s = ('%.6f' % v).rstrip('0').rstrip('.')
        if s in ('-0', ''): s = '0'
        out.append(s)
    lines = []
    for i in range(0, len(out), 12):
        lines.append('      ' + ', '.join(out[i:i+12]) + ',')
    return '\n'.join(lines)
parts = []
for g in (1, 2):
    sex = []
    for f in ('FEV1', 'FVC', 'FEV1FVC'):
        s = l[(l.gender == g) & (l.f == f)].sort_values('agebound')
        r = s.iloc[0]
        c = lambda k: float(r[k])
        sex.append(f"""    {f}: {{
      // M = exp(a0 + a1·ln(height cm) + a2·ln(age) + ethnicity term + Mspline)
      a: [{c('a0')}, {c('a1')}, {c('a2')}],
      // ethnicity offsets for M: [African-American, NE Asian, SE Asian, Other/mixed]
      aEthnicity: [{c('a3')}, {c('a4')}, {c('a5')}, {c('a6')}],
      // S = exp(p0 + p1·ln(age) + ethnicity term + Sspline)
      p: [{c('p0')}, {c('p1')}],
      pEthnicity: [{c('p2')}, {c('p3')}, {c('p4')}, {c('p5')}],
      // L = q0 + q1·ln(age) + Lspline
      q: [{c('q0')}, {c('q1')}],
      mSpline: [
{fmt(s.m0.values)}
      ],
      sSpline: [
{fmt(s.s0.values)}
      ],
      lSpline: [
{fmt(s.l0.values)}
      ],
    }},""")
    parts.append(f"  {names[g]}: {{\n" + '\n'.join(sex) + "\n  },")
print("""/**
 * GLI-2012 spirometry reference equation coefficients and age-spline lookup
 * tables (FEV1, FVC, FEV1/FVC), ages 3–95 years in 0.25-year steps.
 *
 * Source: Quanjer PH, Stanojevic S, Cole TJ, et al. Multi-ethnic reference
 * values for spirometry for the 3–95-yr age range: the global lung function
 * 2012 equations. Eur Respir J 2012;40:1324–1343. doi:10.1183/09031936.00080312
 * Tables as distributed in the open-source `rspiro` R package (T. Lytras,
 * GPL-3, github.com/thlytras/rspiro, object `lookup` in R/sysdata.rda) and
 * transcribed by scripts/ (see README "GLI-2012 data provenance").
 *
 * GENERATED DATA — do not edit by hand.
 */

export const GLI2012_AGE_MIN = 3;
export const GLI2012_AGE_MAX = 95;
export const GLI2012_AGE_STEP = 0.25;

export const GLI2012_TABLES = {
""" + '\n'.join(parts) + """
} as const;
""")
