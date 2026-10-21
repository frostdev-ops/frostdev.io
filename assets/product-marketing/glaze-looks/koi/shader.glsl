// Koi Garden: a low blue-hour view across a living pond.
float pondEllipse(vec2 p, vec2 r) { return length(p / r) - 1.; }
float pondBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}
float pondSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.));
}
float pondCover(float d) {
  float w = max(px() * 1.35, .0007);
  return 1. - smoothstep(-w, w, d);
}

float padShape(vec2 p, vec2 o, vec2 r, float a) {
  vec2 q = rot(a) * (p - o);
  float d = pondEllipse(q, r);
  float notch = smoothstep(.08, .22, abs(atan(q.y / r.y, q.x / r.x)));
  return pondCover(d) * notch;
}

float petal(vec2 p, float a) {
  vec2 q = rot(a) * p;
  return pondEllipse(q - vec2(0., .31), vec2(.19, .48));
}

vec3 blossom(vec3 c, vec2 p, vec2 o, float s) {
  vec2 q = (p - o) / s;
  float outer = min(min(petal(q, 0.), petal(q, 1.05)), min(min(petal(q, -1.05), petal(q, 2.1)), min(petal(q, -2.1), petal(q, 3.14))));
  float inner = min(min(petal(q * 1.45, .52), petal(q * 1.45, -.52)), min(petal(q * 1.45, 1.57), petal(q * 1.45, -1.57)));
  c = mix(c, uC3, amt(pondCover(outer) * .9));
  c = mix(c, mix(uC2, uC3, .45), amt(pondCover(inner) * .75));
  c = mix(c, uC3, amt(pondCover(length(q) - .13)));
  return c;
}

vec3 koi(vec3 c, vec2 p, vec2 o, float a, float s, float k) {
  vec2 q = rot(a) * (p - o) / s;
  float wag = sin(uTime * 1.05 + k * 2.4);
  q.y += .09 * wag * smoothstep(-.15, -.82, q.x);
  float body = pondEllipse(q - vec2(.02, 0.), vec2(.7, .27));
  float head = pondEllipse(q - vec2(.57, 0.), vec2(.3, .23));
  float tailA = pondEllipse(rot(.55 + .15 * wag) * (q - vec2(-.7, .13)), vec2(.38, .095));
  float tailB = pondEllipse(rot(-.55 + .15 * wag) * (q - vec2(-.7, -.13)), vec2(.38, .095));
  float finA = pondEllipse(rot(.55) * (q - vec2(.03, .27)), vec2(.3, .075));
  float finB = pondEllipse(rot(-.55) * (q - vec2(.03, -.27)), vec2(.3, .075));
  float shape = min(min(body, head), min(min(tailA, tailB), min(finA, finB)));
  float fish = pondCover(shape);
  c = mix(c, uGround, amt(pondCover(shape - .045) * .35));
  vec3 base = k < .5 ? uC2 : k < 1.5 ? uC3 : mix(uC2, uC3, .4);
  c = mix(c, base, amt(fish * .88));
  float markA = pondCover(pondEllipse(q - vec2(.18, .02), vec2(.23, .17)));
  float markB = pondCover(pondEllipse(q - vec2(-.25, -.03), vec2(.2, .15)));
  vec3 mark = k < .5 ? uC3 : uC2;
  c = mix(c, mark, amt((markA + markB) * fish * .72));
  float eye = pondCover(length(q - vec2(.69, .105)) - .035);
  c = mix(c, uGround, amt(eye * fish));
  float barb = min(pondSeg(q, vec2(.77, .05), vec2(.98, .13)), pondSeg(q, vec2(.77, -.04), vec2(.97, -.1))) - .012;
  c = mix(c, uC3, amt(pondCover(barb) * .7));
  return c;
}

vec3 rings(vec3 c, vec2 p, vec2 o, float r, float strength) {
  float d = length((p - o) * vec2(1., 2.5));
  float a = pondCover(abs(d - r) - .003) + .6 * pondCover(abs(d - r * .68) - .0025);
  return mix(c, uC3, amt(a * strength));
}

vec3 bridgeAndLantern(vec3 c, vec2 p, float t) {
  float bw = min(.58, uAspect * .37);
  float nx = clamp(p.x / bw, -1., 1.);
  float arch = .72 + .065 * (1. - nx * nx);
  float clip = abs(p.x) - bw;
  float deck = max(abs(p.y - arch) - .015, clip);
  float rail = max(abs(p.y - arch - .07) - .006, clip);
  float bridge = min(deck, rail);
  for (int i = 0; i < 6; i++) {
    float x = mix(-bw, bw, float(i) / 5.);
    float y = .72 + .065 * (1. - (x / bw) * (x / bw));
    bridge = min(bridge, pondBox(p - vec2(x, y + .04), vec2(.006, .055)));
  }
  c = mix(c, mix(uGround, uC1, .18), amt(pondCover(bridge) * .9));

  vec2 l = (p - vec2(uAspect * .34, .745)) / .055;
  float base = pondBox(l - vec2(0., -.62), vec2(.36, .12));
  float post = pondBox(l - vec2(0., -.2), vec2(.16, .38));
  float room = pondBox(l - vec2(0., .28), vec2(.3, .25));
  float roof = pondBox(rot(.12) * (l - vec2(0., .58)), vec2(.5, .1));
  float cap = pondEllipse(l - vec2(0., .78), vec2(.12, .16));
  float lantern = min(min(base, post), min(room, min(roof, cap)));
  c = mix(c, mix(uGround, uC1, .25), amt(pondCover(lantern) * .95));
  c = mix(c, uC3, amt(pondCover(pondBox(l - vec2(0., .3), vec2(.16, .14))) * .8));

  float beam = exp(-abs(p.x - uAspect * .34) * 18.) * smoothstep(.7, .2, p.y) * smoothstep(.02, .28, p.y);
  beam *= .25 + .75 * smoothstep(.1, .9, sin(p.y * 82. + 2. * sin(p.x * 18. - t)) * .5 + .5);
  return mix(c, uC3, amt(beam * .18));
}

vec3 fireflies(vec3 c, vec2 p, float t) {
  for (int i = 0; i < 6; i++) {
    float fi = float(i), h = hash(vec2(fi, 7.));
    vec2 o = vec2((h - .5) * uAspect * 1.55 + .025 * sin(t * (.35 + h) + fi), .73 + .19 * hash(vec2(fi, 3.)) + .015 * sin(t * .7 + fi * 2.));
    float d = length(p - o);
    float pulse = .55 + .45 * sin(t * (1.1 + h) + fi * 3.);
    c = mix(c, uC3, amt((exp(-d * d * 6500.) + .12 * exp(-d * 38.)) * pulse * .75));
  }
  return c;
}

vec4 scene(vec2 uv) {
  float t = uTime;
  vec2 p = vec2((uv.x - .5) * uAspect, uv.y);
  vec3 c = mix(uGround, mix(uGround, uC1, .42), amt(smoothstep(.4, 1., uv.y) * .55));
  float horizon = .68 + .012 * sin(p.x * 3.2);
  c = mix(c, mix(uGround, uC1, .2), amt(pondCover(abs(p.y - horizon) - .035) * .75));
  c = bridgeAndLantern(c, p, t);

  float water = smoothstep(.72, .62, p.y);
  float glint = pow(max(sin(p.x * 23. + sin(p.y * 55. - t * .25)), 0.), 10.) * water;
  float current = .5 + .5 * sin(p.x * 8. + p.y * 42. - t * .18 + sin(p.x * 3.) * 1.4);
  c = mix(c, uC1, amt(current * water * .035));
  c = mix(c, uC3, amt(glint * .055));

  float a0 = t * .1;
  vec2 o0 = vec2(.18 * sin(a0), .365 + .04 * cos(a0));
  float ph = mod(t * .65, 14.);
  float rise = smoothstep(.7, 1.7, ph) * (1. - smoothstep(5., 6., ph));
  o0.y += .025 * rise;
  float a1 = t * .073 + 2.2;
  vec2 o1 = vec2(-uAspect * .27 + .12 * sin(a1), .49 + .03 * cos(a1));
  float a2 = t * .061 + 4.4;
  vec2 o2 = vec2(uAspect * .27 + .13 * sin(a2), .285 + .025 * cos(a2));

  c = rings(c, p, o1, .075 + .025 * fract(t * .06), .08);
  c = rings(c, p, o2, .09 + .03 * fract(t * .05 + .4), .07);
  c = koi(c, p, o1, atan(-.03 * sin(a1), .12 * cos(a1)), .12, 1.);
  c = koi(c, p, o2, atan(-.025 * sin(a2), .13 * cos(a2)), .135, 2.);
  c = koi(c, p, o0, atan(-.04 * sin(a0), .18 * cos(a0)) + .12 * rise * sin(ph * 2.), .15 * (1. + .08 * rise), 0.);

  float ringLife = smoothstep(.8, 1.5, ph) * (1. - smoothstep(6., 8., ph));
  c = rings(c, p, o0, .045 + .028 * ph, .32 * ringLife);
  c = rings(c, p, o0, .02 + .019 * ph, .22 * ringLife);
  float splashLife = smoothstep(.65, 1., ph) * (1. - smoothstep(2.2, 3., ph));
  float splash = pondCover(length(p - o0 - vec2(-.025, .06)) - .008) + pondCover(length(p - o0 - vec2(.035, .075)) - .006);
  c = mix(c, uC3, amt(splash * splashLife * .8));

  float bob = .004 * sin(t * .45);
  c = mix(c, mix(uGround, uC1, .72), amt(padShape(p, vec2(-uAspect * .39, .12 + bob), vec2(.22, .055), -.08) * .8));
  c = mix(c, mix(uGround, uC1, .65), amt(padShape(p, vec2(-uAspect * .18, .075 - bob), vec2(.19, .045), .12) * .75));
  c = mix(c, mix(uGround, uC1, .68), amt(padShape(p, vec2(uAspect * .35, .1 + bob), vec2(.25, .06), .08) * .8));
  c = mix(c, mix(uGround, uC1, .58), amt(padShape(p, vec2(uAspect * .12, .16 - bob), vec2(.14, .037), -.18) * .65));
  c = blossom(c, p, vec2(-uAspect * .34, .17 + bob), .065);
  c = fireflies(c, p, t);
  return vec4(c, 1.);
}
