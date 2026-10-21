float ozBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}

float ozSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.));
}

float ozFill(float d) {
  float w = px() * 1.15;
  return 1. - smoothstep(-w, w, d);
}

float ozLine(float d, float w) {
  return 1. - smoothstep(w, w + px() * 1.4, d);
}

float ozFar(float x) {
  return .43 + .075 * sin(x * 2.2 + .3) + .03 * sin(x * 5.8 - .7) + .014 * sin(x * 12.8);
}

float ozMid(float x) {
  return .31 + .058 * sin(x * 1.65 + 1.7) + .026 * sin(x * 4.4 + .4);
}

float ozRidge(float x) {
  return .125 + .029 * sin(x * 1.85 + .2) + .012 * sin(x * 5.3 + 1.4);
}

float ozNode(vec2 p, float r, float phase) {
  return (1. - smoothstep(r, r + px() * 1.6, length(p))) * (.82 + .18 * sin(uTime * .35 + phase));
}

vec4 scene(vec2 uv) {
  vec2 p = vec2((uv.x - .5) * uAspect, uv.y);
  float t = uTime;
  vec3 c = mix(uGround, uC2, amt(.25 + .42 * smoothstep(.04, 1., uv.y)));

  float horizon = exp(-abs(uv.y - .305) * 15.) * (1. - smoothstep(.15, .82, abs(p.x + .08)));
  c = mix(c, uC3, amt(horizon * .3));

  float farH = ozFar(p.x);
  float farMask = ozFill(p.y - farH);
  c = mix(c, mix(uC2, uC1, .32), amt(farMask * .66));
  float peaks = ozLine(abs(p.y - farH), .004);
  c = mix(c, uC1, amt(peaks * .25));

  float mist1 = exp(-abs(p.y - (.285 + .01 * sin(p.x * 4.1 - t * .045))) * 56.);
  float mist2 = exp(-abs(p.y - (.215 + .008 * sin(p.x * 5.4 + t * .034))) * 72.);
  c = mix(c, uC1, amt(mist1 * .14 + mist2 * .1));

  float midH = ozMid(p.x);
  c = mix(c, mix(uGround, uC2, .58), amt(ozFill(p.y - midH) * .93));
  c = mix(c, uC1, amt(ozLine(abs(p.y - midH), .0035) * .18));

  float skyTurn = .006 * sin(t * .04);
  vec2 sp = rot(skyTurn) * (p - vec2(-.38, .76)) + vec2(-.38, .76);
  vec2 a = vec2(-.69, .84), b = vec2(-.53, .9), d = vec2(-.36, .8);
  vec2 e = vec2(-.19, .86), f = vec2(-.05, .73), g = vec2(-.28, .69);
  float constellation = ozLine(ozSeg(sp, a, b), .0018);
  constellation = max(constellation, ozLine(ozSeg(sp, b, d), .0018));
  constellation = max(constellation, ozLine(ozSeg(sp, d, e), .0018));
  constellation = max(constellation, ozLine(ozSeg(sp, e, f), .0018));
  constellation = max(constellation, ozLine(ozSeg(sp, f, g), .0018));
  constellation = max(constellation, ozLine(ozSeg(sp, g, d), .0018));
  c = mix(c, uC1, amt(constellation * .56));
  float nodes = ozNode(sp - a, .0048, .3) + ozNode(sp - b, .0055, 2.1);
  nodes += ozNode(sp - d, .006, 4.2) + ozNode(sp - e, .0044, 1.1);
  nodes += ozNode(sp - f, .0052, 3.4) + ozNode(sp - g, .0042, 5.3);
  c = mix(c, mix(uC1, vec3(1.), .3), amt(min(nodes, 1.) * .92));
  c = mix(c, uC1, amt(ozNode(p - vec2(.14, .9), .0028, 2.7) * .5));

  float sweep = .014 * sin(t * .085);
  vec2 scopeA = vec2(.515, .39);
  vec2 scopeDir = normalize(rot(sweep) * vec2(-.83, .56));
  vec2 scopeB = scopeA + scopeDir * .19;
  vec2 beamEnd = scopeB + scopeDir * .72;
  float beamD = ozSeg(p, scopeB, beamEnd);
  float beam = ozLine(beamD, .0022) * .62 + (1. - smoothstep(.004, .026, beamD)) * .13;
  float beamFade = 1. - smoothstep(.28, .76, length(p - scopeB));
  c = mix(c, uC1, amt(beam * beamFade));

  float shotPhase = mod(t, 31.);
  float shotOn = smoothstep(3.15, 3.35, shotPhase) * (1. - smoothstep(4.45, 4.8, shotPhase));
  float travel = clamp((shotPhase - 3.2) / 1.55, 0., 1.);
  vec2 shotHead = vec2(mix(.73, .43, travel), mix(.9, .8, travel));
  float shot = ozLine(ozSeg(p, shotHead + vec2(.13, .045), shotHead), .0023);
  shot *= 1. - smoothstep(.012, .15, length(p - shotHead));
  shot += exp(-length(p - shotHead) * 105.) * .75;
  c = mix(c, mix(uC3, vec3(1.), .32), amt(shot * shotOn));

  float ridgeH = ozRidge(p.x);
  c = mix(c, mix(uGround, uC2, .18), amt(ozFill(p.y - ridgeH)));

  vec2 q = p - vec2(.52, .31);
  float shell = (length(q / vec2(.22, .16)) - 1.) * .16;
  float dome = max(shell, -q.y);
  float base = ozBox(p - vec2(.52, .205), vec2(.255, .105));
  float observatory = min(dome, base);
  vec3 obs = mix(uGround, uC2, .48);
  c = mix(c, obs, amt(ozFill(observatory) * .98));

  float domeEdge = ozLine(abs(shell), .0045) * step(0., q.y);
  float rib1 = ozLine(ozSeg(p, vec2(.52, .47), vec2(.43, .31)), .0032);
  float rib2 = ozLine(ozSeg(p, vec2(.52, .47), vec2(.61, .31)), .0032);
  float ribs = max(domeEdge, max(rib1, rib2)) * ozFill(dome - .006);
  c = mix(c, mix(uC1, uC2, .55), amt(ribs * .68));

  vec2 slitP = rot(.025 + sweep) * (q - vec2(0., .075));
  float slit = ozBox(slitP, vec2(.025, .105));
  float slitMask = ozFill(max(slit, shell)) * step(0., q.y);
  float warm = .88 + .07 * sin(t * .24);
  c = mix(c, mix(uC3, vec3(1.), .12), amt(slitMask * warm));
  c = mix(c, uC3, amt(ozLine(abs(slit), .0035) * ozFill(dome - .004) * .7));

  float scope = ozLine(ozSeg(p, scopeA, scopeB), .014);
  float scopeCap = ozLine(abs(length(p - scopeB) - .019), .0045);
  float mount = ozLine(ozSeg(p, scopeA - vec2(.018, .01), vec2(.49, .305)), .008);
  c = mix(c, uGround, amt(max(scope, max(scopeCap, mount))));
  c = mix(c, uC1, amt(ozLine(ozSeg(p, scopeA + vec2(0., .006), scopeB + vec2(0., .006)), .0018) * .5));

  float topBand = ozBox(p - vec2(.52, .305), vec2(.275, .012));
  float lowBand = ozBox(p - vec2(.52, .112), vec2(.275, .014));
  c = mix(c, mix(uC1, uC2, .62), amt(ozFill(min(topBand, lowBand)) * .78));
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 wp = p - vec2(.43 + fi * .18, .202);
    float win = ozBox(wp, vec2(.016, .042));
    c = mix(c, uC3, amt(ozFill(win) * (.66 + .06 * sin(t * .2 + fi * 1.8))));
    c = mix(c, uGround, amt(ozLine(abs(win), .0035) * .82));
  }

  float footing = ozLine(abs(p.y - ridgeH + .004) + abs(p.x - .52) * .12, .0035);
  c = mix(c, uC3, amt(footing * .12));
  return vec4(c, 1.);
}
