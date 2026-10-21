// Rainy Neon: bold city architecture behind a close, rain-marked pane.
float rnBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}

float rnSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.));
}

float rnFill(float d) {
  float w = px() * 1.4 + .0004;
  return 1. - smoothstep(-w, w, d);
}

float rnRim(float d, float width) {
  float w = px() * 1.6 + .0004;
  return 1. - smoothstep(width - w, width + w, abs(d));
}

float rnWin(vec2 p, vec2 center, vec2 size) {
  return rnFill(rnBox(p - center, size));
}

vec3 rnDrop(vec2 p, float i, float t) {
  float seed = hash(vec2(i, 37.));
  float cycle = fract(t * (.012 + i * .0017) + i * .29 + .12);
  float life = smoothstep(.02, .09, cycle) * (1. - smoothstep(.86, .98, cycle));
  float y = mix(1.1, -.12, smoothstep(.04, .9, cycle));
  float baseX = mix(-.41, .41, (i + .5) / 3.) * uAspect;
  float curve = .022 * sin(y * 11. + i * 2.3) + .009 * sin(y * 27. + seed * 5.);
  vec2 q = p - vec2(baseX + curve, y);
  float size = .021 + .008 * seed;
  float d = length(q * vec2(.82, 1.18)) - size;
  float bead = rnFill(d);
  float rim = rnRim(d, .0038);
  float glint = rnFill(length((q - vec2(-size * .27, size * .32)) * vec2(1., 1.25)) - size * .19);
  float dy = p.y - y;
  float pathX = baseX + .022 * sin(p.y * 11. + i * 2.3) + .009 * sin(p.y * 27. + seed * 5.);
  float trail = (1. - smoothstep(.004, .009, abs(p.x - pathX))) * smoothstep(.018, .05, dy) * (1. - smoothstep(.22, .38, dy));
  return vec3(bead, max(rim, glint), trail) * life;
}

vec4 scene(vec2 uv) {
  vec2 p = vec2((uv.x - .5) * uAspect, uv.y);
  float t = uTime;
  vec3 c = mix(uGround, mix(uGround, uC1, .22), amt(.16 + .18 * uv.y));

  // Distant atmosphere and skyline: broad, slow, and visibly behind the buildings.
  float drift = sin(t * .018) * .009;
  float cloud = fbm(vec2(p.x * .7 - t * .0015, p.y * 2. + 5.));
  float cloudBank = smoothstep(.5, .72, cloud) * smoothstep(.48, .76, uv.y);
  c = mix(c, mix(uGround, uC3, .34), amt(cloudBank * .18));
  float phase = mod(t, 29.);
  float reveal = smoothstep(24., 24.16, phase) * (1. - smoothstep(24.62, 24.9, phase));
  c = mix(c, uC3, amt(cloudBank * reveal * .1));

  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float x = mix(-.52, .52, (fi + .5) / 6.) * uAspect + drift;
    float h = .16 + .24 * hash(vec2(fi, 13.));
    float w = .055 + .045 * hash(vec2(fi, 19.));
    float b = rnFill(rnBox(p - vec2(x, .27 + h * .5), vec2(w, h * .5)));
    c = mix(c, mix(uGround, uC3, .18), amt(b * (.68 + reveal * .12)));
    float cap = rnFill(rnBox(p - vec2(x, .27 + h), vec2(w * .7, .004)));
    c = mix(c, uC3, amt(cap * (.12 + reveal * .22)));
  }

  // Three unmistakable midground buildings frame a calm central reading field.
  float nearDrift = sin(t * .012 + 1.4) * .006;
  vec2 b1At = vec2(-uAspect * .38 + nearDrift, .43);
  vec2 b2At = vec2(uAspect * .21 + nearDrift, .39);
  vec2 b3At = vec2(uAspect * .4 + nearDrift, .35);
  float b1D = rnBox(p - b1At, vec2(.17, .23));
  float b2D = rnBox(p - b2At, vec2(.14, .19));
  float b3D = rnBox(p - b3At, vec2(.18, .15));
  float b1 = rnFill(b1D), b2 = rnFill(b2D), b3 = rnFill(b3D);
  c = mix(c, mix(uGround, uC1, .26), amt(b1 * .86));
  c = mix(c, mix(uGround, uC3, .22), amt(b2 * .9));
  c = mix(c, mix(uGround, uC2, .16), amt(b3 * .92));
  c = mix(c, uC1, amt((rnRim(b1D, .003) + rnRim(b2D, .003)) * .12));

  // Large windows survive the gallery card scale and imply inhabited rooms.
  float warm1 = rnWin(p, b1At + vec2(-.075, .07), vec2(.027, .032)) + rnWin(p, b1At + vec2(.05, .07), vec2(.027, .032));
  float cool1 = rnWin(p, b1At + vec2(-.075, -.04), vec2(.027, .032)) + rnWin(p, b1At + vec2(.05, -.04), vec2(.027, .032));
  float warm2 = rnWin(p, b2At + vec2(-.05, .035), vec2(.023, .028)) + rnWin(p, b2At + vec2(.05, -.045), vec2(.023, .028));
  float cool2 = rnWin(p, b2At + vec2(.05, .035), vec2(.023, .028));
  c = mix(c, uC3, amt((warm1 * b1 + warm2 * b2) * .66));
  c = mix(c, uC1, amt((cool1 * b1 + cool2 * b2) * .62));

  // A bold, blank neon sign and bracket sit fully in the lower-right side region.
  vec2 signAt = vec2(uAspect * .395, .39);
  float signD = rnBox(p - signAt, vec2(.17, .066));
  float signPulse = .82 + .12 * sin(t * .31) + .06 * smoothstep(.9, 1., sin(t * .105));
  float panel = rnFill(signD);
  float signEdge = rnRim(signD, .008);
  c = mix(c, mix(uGround, uC2, .26), amt(panel * .84));
  c = mix(c, uC2, amt(signEdge * signPulse));
  c = mix(c, uC2, amt(exp(-max(signD, 0.) * 24.) * .15 * signPulse));
  float bracket = min(rnBox(p - signAt - vec2(-.205, .01), vec2(.035, .009)), rnBox(p - signAt - vec2(-.23, -.035), vec2(.009, .055)));
  c = mix(c, mix(uC1, uC3, .35), amt(rnFill(bracket) * .58));

  // Hard wet-street horizon and broad reflections tied to actual light sources.
  float street = 1. - smoothstep(.235, .265, uv.y);
  c = mix(c, mix(uGround, uC1, .14), amt(street * .92));
  float horizon = 1. - smoothstep(.002, .008, abs(uv.y - .255));
  c = mix(c, uC1, amt(horizon * .28));
  float ripple = .56 + .44 * noise(vec2(p.x * 22., uv.y * 46. - t * .11));
  float signRef = exp(-abs(p.x - signAt.x) * (8. + uv.y * 18.)) * smoothstep(.012, .21, uv.y) * street * ripple;
  float cyanRef = (exp(-abs(p.x - b1At.x) * 17.) + exp(-abs(p.x - b2At.x) * 21.)) * smoothstep(.018, .22, uv.y) * street * ripple;
  c = mix(c, uC2, amt(signRef * .5 * signPulse));
  c = mix(c, uC1, amt(cyanRef * .25));
  float puddles = (1. - smoothstep(.002, .006, abs(mod(uv.y * 24. + p.x * 1.7, .12) - .06))) * street;
  c = mix(c, mix(uC1, uC3, .35), amt(puddles * (signRef + cyanRef) * .16));

  // Only three slow foreground drops: thicker, curved, and clearly on the glass.
  vec3 drops = vec3(0.);
  for (int i = 0; i < 3; i++) drops += rnDrop(p, float(i), t);
  c = mix(c, mix(uGround, uC1, .28), amt(drops.x * .45));
  c = mix(c, mix(uC1, uC3, .52), amt(drops.z * .62));
  c = mix(c, uC3, amt(drops.y * .92));

  // Three fixed beads keep the pane legible between long drop cycles.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 o = vec2(mix(-.37, .34, fi / 2.) * uAspect, .64 + .13 * mod(fi, 2.));
    float d = length((p - o) * vec2(.83, 1.2)) - (.011 + .002 * fi);
    c = mix(c, uC3, amt(rnRim(d, .0024) * .62));
  }

  // Heavy pane edge and sill anchor the view as a real window.
  float sideD = rnBox(p - vec2(uAspect * .475, .53), vec2(.025, .53));
  float sillD = rnBox(p - vec2(0., .245), vec2(uAspect * .5, .018));
  c = mix(c, mix(uGround, uC1, .08), amt((rnFill(sideD) + rnFill(sillD)) * .96));
  c = mix(c, uC1, amt((rnRim(sideD, .003) + rnRim(sillD, .003)) * .34));

  float edge = smoothstep(.42, .78, abs(uv.x - .5) + abs(uv.y - .55) * .28);
  c = mix(c, uGround, amt(edge * .08));
  return vec4(c, 1.);
}
