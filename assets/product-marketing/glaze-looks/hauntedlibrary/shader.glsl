// Haunted Library storybook scene.
float hlCover(float d) {
  float w = px() * 1.6 + .00015;
  return 1. - smoothstep(-w, w, d);
}

float hlBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}

float hlSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.));
}

float hlEllipse(vec2 p, vec2 r) {
  return (length(p / r) - 1.) * min(r.x, r.y);
}

float hlArch(vec2 p) {
  float lower = hlBox(p - vec2(0., -.13), vec2(.225, .285));
  float crown = length(p - vec2(0., .145)) - .225;
  return min(lower, crown);
}

float hlPage(vec2 p) {
  float sheet = hlBox(p, vec2(.23, .3));
  float curl = hlSeg(p, vec2(.1, -.29), vec2(.23, -.17)) - .02;
  return min(sheet, curl);
}

float hlOpenBook(vec2 p) {
  vec2 q = p;
  q.x = abs(q.x);
  q = rot(-.13) * (q - vec2(.21, 0.));
  float leaf = hlBox(q, vec2(.21, .145));
  float spine = hlSeg(p, vec2(0., -.14), vec2(0., .14)) - .018;
  return min(leaf, spine);
}

float hlGhost(vec2 p, float wave) {
  float head = length(p - vec2(0., .22)) - .29;
  float body = hlBox(p - vec2(0., -.13), vec2(.27, .34));
  body = max(body, p.y - .24);
  float hem = p.y + .46 + .045 * sin(p.x * 18. + wave);
  body = max(body, -hem);
  return min(head, body);
}

vec4 scene(vec2 uv) {
  vec2 p = vec2((uv.x - .5) * uAspect, uv.y);
  float t = uTime;

  // Background: moonlit arched window.
  vec3 c = mix(uGround, uC2, amt(.07 + .13 * uv.y));
  c = mix(c, uGround, .2 * smoothstep(.35, 1., abs(uv.x - .5)));
  vec2 wq = p - vec2(0., .64);
  float window = hlCover(hlArch(wq));
  vec3 night = mix(uGround, uC1, .22);
  c = mix(c, night, amt(window * .72));
  float moon = hlCover(length(wq - vec2(.075, .11)) - .064) * window;
  c = mix(c, mix(uC1, uC3, .16), amt(moon * .68));
  float mullion = hlCover(min(abs(wq.x) - .006, abs(wq.y + .11) - .006));
  mullion = max(mullion, hlCover(abs(abs(wq.x) - .105) - .004));
  float latticeA = hlCover(abs(fract((wq.x + wq.y) * 8. + .5) - .5) - .035);
  float latticeB = hlCover(abs(fract((wq.x - wq.y) * 8. + .5) - .5) - .035);
  float panes = max(mullion, max(latticeA, latticeB) * .42) * window;
  c = mix(c, mix(uGround, uC2, .35), amt(panes * .72));
  float archTrim = hlCover(abs(hlArch(wq)) - .015);
  c = mix(c, mix(uC2, uC3, .13), amt(archTrim * .68));
  float columns = abs(abs(p.x) - .285) - .015;
  c = mix(c, mix(uGround, uC2, .7), amt(hlCover(columns) * .8));

  // Midground: the shy ghost peeks, waves, then hides.
  float gp = mod(t * .42, 14.);
  float reveal = smoothstep(.7, 2.2, gp) * (1. - smoothstep(10.5, 12.3, gp));
  float gx = mix(.49, .292, reveal) * uAspect;
  vec2 gq = (p - vec2(gx, .56 + .018 * sin(t * .8))) / .105;
  float ghost = hlCover(hlGhost(gq, t * 1.4)) * reveal;
  float ghostHalo = exp(-max(hlGhost(gq, t * 1.4), 0.) * 3.4) * reveal;
  c = mix(c, uC1, amt(ghostHalo * .14));
  c = mix(c, mix(uC1, uC3, .08), amt(ghost * .68));
  float eyes = hlCover(length(vec2(abs(gq.x) - .1, gq.y - .27) * vec2(1., 1.5)) - .035);
  float smile = hlCover(max(abs(length(gq - vec2(0., .13)) - .09) - .014, gq.y - .13));
  c = mix(c, uGround, amt((eyes + smile) * ghost * .75));
  float handWave = sin(gp * 3.5) * smoothstep(2.5, 3.5, gp) * (1. - smoothstep(8., 9., gp));
  vec2 hand = vec2(.245, -.02) + rot(handWave * .38) * vec2(.12, .15);
  float arm = hlSeg(gq, vec2(.18, -.05), hand) - .045;
  c = mix(c, uC1, amt(hlCover(arm) * reveal * .62));

  // Bookcases frame the room and occlude the ghost.
  float shelfSide = step(.292 * uAspect, abs(p.x));
  vec3 darkWood = mix(uGround, uC2, .5);
  c = mix(c, darkWood, amt(shelfSide * .82));
  float innerPost = hlCover(abs(abs(p.x) - .302 * uAspect) - .013);
  float outerPost = hlCover(abs(abs(p.x) - .475 * uAspect) - .012);
  float shelfRows = hlCover(abs(fract(uv.y * 4.6 + .03) - .5) - .035) * shelfSide;
  c = mix(c, mix(uC2, uC3, .16), amt(max(max(innerPost, outerPost), shelfRows) * .72));

  vec2 bg = vec2(uv.x * 22., uv.y * 4.6);
  vec2 bid = floor(bg), bq = fract(bg) - .5;
  float bh = .22 + .19 * hash(bid + 2.7);
  bq = rot((hash(bid + 8.1) - .5) * .15) * (bq - vec2(0., -.5 + bh));
  float book = hlCover(hlBox(bq, vec2(.34, bh))) * shelfSide * step(.1, hash(bid + 4.));
  vec3 bookColor = mix(darkWood, hash(bid + 7.) > .65 ? uC3 : uC1, .1 + .12 * hash(bid + 9.));
  c = mix(c, bookColor, amt(book * .62));
  float gild = hlCover(abs(bq.y + bh * .25) - .018) * book;
  c = mix(c, uC3, amt(gild * .18));

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 o = vec2((-.2 + .2 * fi) * uAspect + .035 * sin(t * (.24 + .03 * fi) + fi), .5 + .12 * fi + .025 * sin(t * .47 + fi * 2.));
    vec2 q = rot(-.28 + .24 * sin(t * .3 + fi * 1.7)) * (p - o) / (.044 - .004 * fi);
    float page = hlCover(hlPage(q));
    c = mix(c, mix(uC3, uC1, .42), amt(page * (.48 + .06 * fi)));
    float writing = max(hlCover(abs(q.y + .08) - .014), hlCover(abs(q.y - .03) - .012));
    c = mix(c, uGround, amt(writing * page * .18));
  }

  // Foreground: carved reading desk.
  float desktop = hlBox(p - vec2(0., .105), vec2(uAspect * .51, .085));
  float apron = hlBox(p - vec2(0., .015), vec2(uAspect * .48, .055));
  float legs = min(hlBox(p - vec2(-uAspect * .39, -.04), vec2(.06, .18)), hlBox(p - vec2(uAspect * .39, -.04), vec2(.06, .18)));
  float desk = hlCover(min(desktop, min(apron, legs)));
  c = mix(c, mix(uGround, uC3, .1), amt(desk * .96));
  float deskEdge = hlCover(abs(desktop) - .012);
  c = mix(c, uC3, amt(deskEdge * .23));

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float side = i < 3 ? -1. : 1.;
    float row = i < 3 ? fi : fi - 3.;
    vec2 o = vec2(side * (.28 + .035 * row) * uAspect, .205 + .045 * row);
    vec2 q = rot(side * (.025 - .018 * row)) * (p - o);
    float stackBook = hlCover(hlBox(q, vec2(.13 + .025 * mod(fi, 2.), .025)) - .006);
    vec3 leather = mix(mix(uGround, uC2, .72), uC3, .12 + .06 * mod(fi, 2.));
    c = mix(c, leather, amt(stackBook * .9));
    c = mix(c, uC3, amt(hlCover(abs(q.y) - .005) * stackBook * .26));
  }

  vec2 oq = rot(.025 * sin(t * .18)) * (p - vec2(.02, .238)) / .13;
  float openBook = hlCover(hlOpenBook(oq));
  c = mix(c, mix(uC3, uC1, .5), amt(openBook * .72));
  float bookSpine = hlCover(hlSeg(oq, vec2(0., -.15), vec2(0., .15)) - .018);
  c = mix(c, uGround, amt(bookSpine * openBook * .55));
  float pageLines = max(hlCover(abs(oq.y + .055) - .01), hlCover(abs(oq.y - .045) - .01));
  c = mix(c, uGround, amt(pageLines * openBook * .15));

  // Three-arm candelabra with independent flames.
  vec2 base = vec2(-.35 * uAspect, .2);
  float brass = hlSeg(p, base + vec2(0., -.05), base + vec2(0., .2)) - .012;
  brass = min(brass, hlSeg(p, base + vec2(0., .11), base + vec2(-.11, .17)) - .01);
  brass = min(brass, hlSeg(p, base + vec2(0., .11), base + vec2(.11, .17)) - .01);
  brass = min(brass, hlBox(p - base - vec2(0., -.055), vec2(.09, .018)) - .01);
  c = mix(c, uC3, amt(hlCover(brass) * .85));
  for (int i = 0; i < 3; i++) {
    float fi = float(i), x = (fi - 1.) * .11;
    vec2 o = base + vec2(x, .255 - .03 * abs(fi - 1.));
    float candle = hlCover(hlBox(p - o + vec2(0., .035), vec2(.018, .07)) - .004);
    float flick = .84 + .16 * noise(vec2(t * 5.2 + fi * 7., fi));
    vec2 fq = (p - o - vec2(.006 * sin(t * 5. + fi), .055 + .025 * flick)) / .026;
    float flame = hlCover(hlEllipse(fq, vec2(.38, .72)));
    float glow = exp(-length(p - o - vec2(0., .06)) * 24.) * flick;
    c = mix(c, uC3, amt(glow * .13));
    c = mix(c, mix(uC3, uC1, .2), amt(candle * .72));
    c = mix(c, uC3, amt(flame * .95));
  }

  // Candlelit dust rises through the middle distance.
  for (int i = 0; i < 9; i++) {
    float fi = float(i), h = hash(vec2(fi, 6.));
    vec2 o = vec2((h - .5) * uAspect * .8 + .018 * sin(t * .7 + fi), .18 + mod(t * (.018 + .008 * h) + h, .68));
    float d = length(p - o);
    float mote = exp(-d * d * 18000.) * (.55 + .45 * sin(t * 1.4 + fi * 2.3));
    c = mix(c, mix(uC3, uC1, .28), amt(mote * .5));
  }

  c = mix(c, uGround, .11 * smoothstep(.32, .72, length((uv - .5) * vec2(.72, 1.))));
  return vec4(c, 1.);
}
