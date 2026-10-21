// Witch's Brew - edge-weighted workshop designed to read behind course cards.
float wbCover(float d) {
  float w = px() * 1.6 + .0002;
  return 1. - smoothstep(-w, w, d);
}

float wbBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}

float wbEllipse(vec2 p, vec2 r) {
  return (length(p / r) - 1.) * min(r.x, r.y);
}

float wbSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.));
}

float wbTri(vec2 p, float w, float h) {
  p.x = abs(p.x);
  return max(-p.y, (p.x * h + p.y * w - w * h) / length(vec2(h, w)));
}

vec4 scene(vec2 uv) {
  vec2 p = vec2((uv.x - .5) * uAspect, uv.y);
  float t = uTime;
  vec3 plum = mix(uGround, uC2, .72);
  vec3 iron = mix(uC2, uC3, .14);
  vec3 edge = mix(uC2, uC3, .42);
  vec3 c = mix(uGround, plum, amt(.18 + .1 * uv.y));

  // Bright arched moon window lives on the far right edge, outside the central course cards.
  float wx = uAspect * .42;
  vec2 wq = p - vec2(wx, .64);
  float arch = min(wbBox(wq + vec2(0., .08), vec2(.135, .2)), length(wq - vec2(0., .12)) - .135);
  float glass = wbCover(arch);
  c = mix(c, mix(uC2, uC3, .2), amt(glass * .62));
  float moon = wbCover(length(p - vec2(wx + .035, .75)) - .052);
  c = mix(c, uC3, amt(moon * .9));
  float frame = wbCover(abs(arch) - .008);
  frame += wbCover(wbSeg(p, vec2(wx, .42), vec2(wx, .86)) - .006);
  frame += wbCover(wbSeg(p, vec2(wx - .135, .58), vec2(wx + .135, .58)) - .006);
  c = mix(c, edge, amt(min(frame, 1.) * .96));
  float sill = wbCover(wbBox(p - vec2(wx, .405), vec2(.16, .012)));
  c = mix(c, mix(uC3, uC2, .45), amt(sill * .72));

  // A crisp cat silhouette occupies the exposed sill; eyes and tail make it readable at thumbnail size.
  vec2 cq = (p - vec2(wx - .04, .455)) / .07;
  float catBody = wbEllipse(cq - vec2(0., -.32), vec2(.32, .55));
  float catHead = length(cq - vec2(0., .18)) - .31;
  float earL = wbTri(cq - vec2(-.18, .34), .15, .24);
  float earR = wbTri(cq - vec2(.18, .34), .15, .24);
  float tailY = .06 + .11 * sin(t * .3);
  float tail = min(wbSeg(cq, vec2(.24, -.42), vec2(.73, -.16)), wbSeg(cq, vec2(.73, -.16), vec2(.62, tailY))) - .075;
  float cat = wbCover(min(min(catBody, catHead), min(min(earL, earR), tail)));
  c = mix(c, uGround, amt(cat));
  float blink = smoothstep(.04, .16, abs(sin(t * .63)));
  vec2 eq = vec2(abs(cq.x) - .11, cq.y - .2);
  float eyes = 1. - smoothstep(.012, .045, length(eq * vec2(1., 2.1)) - .035);
  c = mix(c, uC1, amt(eyes * blink * cat));

  // Two strong lower shelves and distinct bottles turn the open lower-left band into an apothecary.
  float sx0 = -uAspect * .25, sx1 = .01;
  float shelfGate = step(sx0, p.x) * step(p.x, sx1);
  float shelves = (wbCover(abs(p.y - .145) - .008) + wbCover(abs(p.y - .315) - .008)) * shelfGate;
  c = mix(c, edge, amt(shelves * .9));
  for (int i = 0; i < 6; i++) {
    float fi = float(i), row = step(2.5, fi);
    float col = mod(fi, 3.);
    float x = mix(sx0 + .045, sx1 - .045, col / 2.);
    float y = .18 + row * .17;
    float s = .03 + .004 * mod(fi, 2.);
    vec2 bq = (p - vec2(x, y)) / s;
    float jar = min(wbBox(bq, vec2(.45, .5)) - .08, wbBox(bq - vec2(0., .58), vec2(.2, .14)) - .025);
    float bottle = wbCover(jar);
    c = mix(c, mod(fi, 3.) < .5 ? uC3 : mix(uC2, uC1, .2), amt(bottle * .7));
    float shine = wbCover(wbSeg(bq, vec2(-.19, -.2), vec2(-.19, .28)) - .035) * bottle;
    c = mix(c, mix(uC3, vec3(1.), .2), amt(shine * .45));
  }

  // Four localized flames sit entirely below the compact cauldron.
  float potX = uAspect * .18;
  float fireGlow = exp(-length((p - vec2(potX, .055)) * vec2(2.6, 8.)) * 5.);
  c = mix(c, uC3, amt(fireGlow * .34));
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float x = potX + (fi - 1.5) * .06;
    float flicker = .82 + .18 * sin(t * (2.2 + fi * .3) + fi * 2.);
    vec2 fq = p - vec2(x + .006 * sin(t * 1.5 + fi), .045);
    float flame = wbEllipse(fq, vec2(.02, .041 * flicker));
    c = mix(c, uC3, amt(wbCover(flame) * .95));
  }

  // Compact high-contrast cauldron in the clear lower-right band: rim, belly, handles and feet stay separate.
  vec2 q = p - vec2(potX, .185);
  float belly = max(wbEllipse(q, vec2(.3, .13)), q.y - .078);
  float rim = wbBox(q - vec2(0., .1), vec2(.305, .018)) - .009;
  vec2 hq = vec2(abs(q.x) - .35, q.y - .008);
  float handles = abs(wbEllipse(hq, vec2(.07, .06))) - .014;
  float feet = min(wbSeg(q, vec2(-.17, -.09), vec2(-.19, -.145)), wbSeg(q, vec2(.17, -.09), vec2(.19, -.145))) - .024;
  float pot = wbCover(min(min(belly, rim), min(handles, feet)));
  c = mix(c, iron, amt(pot * .94));
  float lowerShade = smoothstep(.22, -.08, q.y) * pot;
  c = mix(c, mix(uC2, uGround, .35), amt(lowerShade * .48));
  float rimEdge = wbCover(abs(rim) - .003);
  c = mix(c, edge, amt(rimEdge * .95));
  float handleEdge = wbCover(abs(handles) - .003);
  c = mix(c, edge, amt(handleEdge * .72));
  float brewSpan = 1. - smoothstep(.25, .29, abs(q.x));
  float brewLine = exp(-abs(q.y - .116) * 165.) * brewSpan;
  float brewGlow = exp(-abs(q.y - .116) * 38.) * brewSpan;
  c = mix(c, uC1, amt(brewLine * .95 + brewGlow * .28));

  // Slow bubbles rise directly over the smaller pot on staggered paths.
  for (int i = 0; i < 5; i++) {
    float fi = float(i), h = hash(vec2(fi, 17.));
    float rise = fract(h + t * (.017 + .003 * mod(fi, 3.)));
    vec2 o = vec2(potX + (h - .5) * .25 + .01 * sin(t * .2 + fi), .315 + rise * .22);
    float r = .008 + .006 * hash(vec2(fi, 29.));
    float ring = 1. - smoothstep(.0015, .0045, abs(length(p - o) - r));
    float life = smoothstep(0., .12, rise) * (1. - smoothstep(.82, 1., rise));
    c = mix(c, uC1, amt(ring * life * .8));
  }

  // Three broad steam ribbons remain shaped and calm as they cross behind the translucent course cards.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = clamp((p.y - .32) / .43, 0., 1.);
    float center = potX + (fi - 1.) * .075 + .04 * sin(y * (5. + fi * .7) + t * (.1 + fi * .016) + fi * 2.);
    float ribbon = exp(-abs(p.x - center) * (38. + fi * 3.));
    float gate = smoothstep(.32, .38, p.y) * (1. - smoothstep(.68, .78, p.y));
    c = mix(c, mix(uC1, uC2, .5 + .1 * fi), amt(ribbon * gate * .23));
  }

  // Rare five-node spark constellation appears beside the steam, then fully clears.
  float phase = mod(t, 20.);
  float reveal = smoothstep(12.8, 13.6, phase) * (1. - smoothstep(16.6, 17.5, phase));
  vec2 s0 = vec2(potX - .23, .62), s1 = vec2(potX - .14, .69), s2 = vec2(potX - .05, .63);
  vec2 s3 = vec2(potX + .05, .7), s4 = vec2(potX + .14, .62);
  float constellation = wbCover(wbSeg(p, s0, s1) - .0015) + wbCover(wbSeg(p, s1, s2) - .0015);
  constellation += wbCover(wbSeg(p, s2, s3) - .0015) + wbCover(wbSeg(p, s3, s4) - .0015);
  float nodes = exp(-length(p - s0) * 170.) + exp(-length(p - s1) * 170.) + exp(-length(p - s2) * 170.);
  nodes += exp(-length(p - s3) * 170.) + exp(-length(p - s4) * 170.);
  c = mix(c, mix(uC1, uC3, .3), amt(reveal * (constellation * .25 + nodes)));

  float vignette = smoothstep(.52, .84, length((uv - .5) * vec2(.7, 1.)));
  c = mix(c, uGround, vignette * .08);
  return vec4(c, 1.);
}
