// A quiet homecoming: open door, watchful cat, autumn window, hearth, mug, and blanket.
float box2(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}
float ellipse(vec2 p, vec2 r) { return length(p / r) - 1.; }
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 q = p - a, v = b - a;
  return length(q - v * clamp(dot(q, v) / dot(v, v), 0., 1.));
}
float fill(float d) { float w = px() * 1.5; return 1. - smoothstep(-w, w, d); }
float stroke(float d, float w) { return fill(abs(d) - w); }
float paneMask(vec2 p) { return fill(box2(p - vec2(.79, .665), vec2(.34, .235)) - .012); }
float leafShape(vec2 p) {
  float d = ellipse(p, vec2(.9, .38));
  return min(d, box2(p - vec2(.72, 0.), vec2(.22, .035)));
}
float catShape(vec2 p, float tail) {
  float body = ellipse(p - vec2(0., .13), vec2(.13, .2));
  float head = ellipse(p - vec2(-.02, .34), vec2(.1, .09));
  float ear1 = max(-p.y + .48, max(p.y - .35, abs(p.x + .08) * 1.7 + p.y - .49));
  float ear2 = max(-p.y + .47, max(p.y - .35, abs(p.x - .04) * 1.7 + p.y - .48));
  vec2 a = vec2(.1, .16), b = vec2(.23 + tail, .11), c = vec2(.31 + tail, .16);
  return min(min(min(body, head), min(ear1, ear2)), min(segment(p, a, b), segment(p, b, c)) - .035);
}
vec4 scene(vec2 uv) {
  vec2 p = vec2(uv.x * uAspect, uv.y);
  float t = uTime;
  vec3 pine = mix(uGround, uC2, .11);
  vec3 plum = mix(uGround, uC1, .32);
  vec3 copper = mix(uC1, uC3, .42);
  vec3 cream = mix(uC2, uC3, .18);
  vec3 c = mix(pine, plum, .12 + .18 * smoothstep(1., .2, p.y));

  // Cool background beyond the window.
  float wm = paneMask(p);
  vec3 sky = mix(plum, mix(uC1, uC2, .22), smoothstep(.42, .9, p.y));
  sky = mix(sky, uC2, .05 * smoothstep(.48, .7, p.y));
  c = mix(c, sky, amt(wm * .95));
  float hill = p.y - (.48 + .018 * sin(p.x * 8.));
  c = mix(c, mix(uGround, uC1, .2), amt(fill(hill) * wm));

  // Tree limbs behind the glass.
  float tree = segment(p, vec2(.48, .43), vec2(.66, .91)) - .026;
  tree = min(tree, segment(p, vec2(.57, .68), vec2(.43, .83)) - .014);
  tree = min(tree, segment(p, vec2(.61, .76), vec2(.91, .88)) - .012);
  tree = min(tree, segment(p, vec2(.7, .82), vec2(1.04, .74)) - .009);
  c = mix(c, mix(uGround, uC1, .12), amt(fill(tree) * wm));

  // Sparse leaves drift outside, slow enough to read as weather rather than confetti.
  for (int i = 0; i < 7; i++) {
    float fi = float(i), h = hash(vec2(fi, 7.));
    vec2 o = vec2(.47 + fract(h * 5.3 + t * (.008 + h * .005)) * .64,
                  .9 - mod(h + t * (.012 + h * .008), .48));
    vec2 q = rot(fi + t * (.18 + h * .16)) * (p - o) / (.012 + .004 * h);
    float lm = fill(leafShape(q)) * wm;
    c = mix(c, mix(uC1, copper, h), amt(lm * .78));
  }

  // Window frame and panes keep the exterior clearly in the back plane.
  float frame = stroke(box2(p - vec2(.79, .665), vec2(.35, .245)), .014);
  frame = max(frame, fill(abs(p.x - .79) - .009) * step(.42, p.y) * step(p.y, .91));
  frame = max(frame, fill(abs(p.y - .665) - .009) * step(.44, p.x) * step(p.x, 1.14));
  c = mix(c, mix(uGround, uC2, .16), amt(frame));

  // Open doorway and its narrow floor spill are the arrival cue.
  float spill = fill(max(p.y - .255, max(.11 - p.y, abs(p.x - .26) - (.06 + (.255 - p.y) * 1.35))));
  c = mix(c, cream, amt(spill * (.32 + .05 * sin(t * .35))));
  float doorLight = fill(box2(p - vec2(.16, .575), vec2(.12, .335)));
  c = mix(c, cream, amt(doorLight * .92));
  float door = fill(box2(rot(-.045) * (p - vec2(.265, .57)), vec2(.075, .32)));
  c = mix(c, mix(pine, uGround, .3), amt(door));
  float doorPanel = stroke(box2(rot(-.045) * (p - vec2(.265, .58)), vec2(.045, .2)), .007);
  c = mix(c, mix(uC2, uC3, .12), amt(doorPanel * .35));
  float jamb = stroke(box2(p - vec2(.155, .575), vec2(.135, .35)), .018);
  c = mix(c, mix(uGround, uC2, .24), amt(jamb));
  c = mix(c, uC3, amt(fill(length(p - vec2(.222, .57)) - .009) * .72));

  // Floor establishes the lower plane; restrained reflections carry the door and fire warmth.
  float floorMask = fill(p.y - .275);
  c = mix(c, mix(uGround, uC2, .08), amt(floorMask));
  float boards = stroke(abs(fract((p.x + p.y * .38) * 8.) - .5) - .48, .008) * floorMask;
  c = mix(c, uC2, amt(boards * .12));
  c = mix(c, copper, amt(floorMask * exp(-abs(p.x - 1.43) * 6.) * smoothstep(.02, .27, p.y) * .16));

  // Stone hearth at right, with a compact fire and slow flicker.
  float hearth = fill(box2(p - vec2(1.47, .46), vec2(.27, .28)) - .025);
  c = mix(c, mix(pine, uC2, .18), amt(hearth));
  float mortar = max(stroke(abs(fract((p.x - 1.2) * 6.) - .5) - .46, .008),
                     stroke(abs(fract((p.y - .18) * 8.) - .5) - .46, .006)) * hearth;
  c = mix(c, uC2, amt(mortar * .13));
  float opening = fill(box2(p - vec2(1.47, .435), vec2(.18, .17)) - .018);
  c = mix(c, uGround, amt(opening));
  float flicker = .018 * sin(t * 2.1) + .012 * noise(vec2(t * .7, 4.));
  vec2 fp = p - vec2(1.47, .35);
  float flame = ellipse(fp - vec2(0., .045), vec2(.055 + flicker, .12 + flicker));
  flame = min(flame, ellipse(fp - vec2(-.065, .018), vec2(.035, .075)));
  flame = min(flame, ellipse(fp - vec2(.065, .012), vec2(.032, .07)));
  c = mix(c, copper, amt(fill(flame) * opening));
  c = mix(c, cream, amt(fill(ellipse(fp - vec2(0., .025), vec2(.024, .07))) * opening * .9));
  for (int i = 0; i < 4; i++) {
    float fi = float(i), h = hash(vec2(fi, 19.));
    vec2 e = vec2(1.4 + h * .14 + .015 * sin(t + fi), .38 + mod(h + t * (.025 + .01 * h), .24));
    c = mix(c, uC3, amt(fill(length(p - e) - .004) * opening * .7));
  }

  // Midground chair and cranberry blanket.
  float chair = fill(box2(p - vec2(1.66, .19), vec2(.2, .18)) - .06);
  c = mix(c, pine, amt(chair));
  float blanket = fill(max(p.x - 1.75, max(1.5 - p.x, p.y - (.36 - .08 * sin((p.x - 1.5) * 14.)))));
  blanket *= step(.1, p.y);
  c = mix(c, mix(uC1, uGround, .08), amt(blanket * .96));
  c = mix(c, copper, amt(blanket * stroke(abs(fract(p.x * 20.) - .5) - .46, .006) * .18));

  // Foreground table and mug.
  float top = fill(box2(p - vec2(1.08, .285), vec2(.23, .035)) - .02);
  float legs = fill(min(box2(p - vec2(.93, .13), vec2(.025, .15)), box2(p - vec2(1.23, .13), vec2(.025, .15))));
  c = mix(c, mix(uGround, uC3, .16), amt(max(top, legs)));
  float mug = fill(box2(p - vec2(1.08, .355), vec2(.06, .055)) - .018);
  float handle = stroke(ellipse(p - vec2(1.15, .36), vec2(.052, .04)), .009);
  c = mix(c, cream, amt(max(mug, handle)));
  c = mix(c, copper, amt(fill(box2(p - vec2(1.08, .405), vec2(.05, .008))) * .55));
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float sx = 1.055 + .025 * fi + .012 * sin(t * .42 + fi * 2. + p.y * 25.);
    float steam = stroke(segment(p, vec2(sx, .42), vec2(sx + .012 * sin(t * .3 + fi), .56)), .0035);
    steam *= smoothstep(.58, .43, p.y);
    c = mix(c, cream, amt(steam * (.22 + .08 * sin(t * .5 + fi))));
  }

  // Cat turns toward the doorway; tail motion is the quiet reveal in the foreground.
  vec2 cp = (p - vec2(.53, .16)) / .48;
  float tail = .025 * sin(t * .55);
  float cat = fill(catShape(cp, tail));
  c = mix(c, uGround, amt(cat));
  float eyes = fill(length(vec2(abs(cp.x + .02) - .035, cp.y - .355)) - .008);
  float wake = .35 + .65 * smoothstep(.2, .7, .5 + .5 * sin(t * .22));
  c = mix(c, uC3, amt(eyes * wake));

  float vignette = smoothstep(.95, .25, length((uv - .5) * vec2(1.15, .85)));
  c = mix(uGround, c, .82 + .18 * vignette);
  return vec4(c, 1.);
}
