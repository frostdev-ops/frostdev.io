float htCover(float d) {
  float w = px() * 3. + 1e-4;
  return 1. - smoothstep(-w, w, d);
}

float htBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.);
}

float htEllipse(vec2 p, vec2 b) {
  return length(p / b) - 1.;
}

float htLeaf(vec2 p) {
  p.x = abs(p.x);
  float blade = htEllipse(p - vec2(.28, 0.), vec2(.34, .18));
  float notch = htEllipse(p - vec2(.48, 0.), vec2(.16, .12));
  return max(blade, -notch);
}

float htPumpkin(vec2 p) {
  float d = htEllipse(p, vec2(.42, .38));
  d = min(d, htEllipse(p - vec2(.20, 0.), vec2(.29, .34)));
  d = min(d, htEllipse(p + vec2(.20, 0.), vec2(.29, .34)));
  return d;
}

float htWedge(vec2 p) {
  return max(max(-p.x, p.x - .24), abs(p.y) - (.12 - .31 * p.x));
}

vec4 scene(vec2 uv) {
  vec2 p = vec2((uv.x - .5) * uAspect, uv.y);
  float t = uTime;
  vec3 cream = mix(uC3, vec3(1.), .30);
  vec3 walnut = mix(uGround, uC1, .13);
  vec3 plum = mix(uGround, uC2, .48);

  // Evening beyond a deep window: a clear gradient, never texture or fog.
  vec3 sky = mix(plum, mix(uC1, uC3, .58), smoothstep(.40, .88, uv.y));
  sky = mix(sky, uC2, smoothstep(.78, 1., uv.y) * .24);
  vec2 wp = p - vec2(0., .69);
  vec2 wb = vec2(uAspect * .465, .285);
  float window = htCover(htBox(wp, wb));
  float glass = htCover(htBox(wp, wb - vec2(.026)));
  vec3 wall = mix(uGround, uC2, .16);
  vec3 c = mix(wall, sky, glass);

  // Layered orchard silhouettes establish the middle distance.
  float farHill = htCover(p.y - (.52 + .025 * sin(p.x * 2.2 + .4)));
  c = mix(c, mix(plum, uGround, .16), farHill * glass);
  float nearHill = htCover(p.y - (.455 + .018 * sin(p.x * 3.1 + 1.6)));
  c = mix(c, mix(uGround, uC2, .28), nearHill * glass);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float x = mix(-uAspect * .40, uAspect * .40, (fi + .5) / 7.);
    float h = .48 + .025 * sin(fi * 2.1);
    float trunk = htCover(htBox(p - vec2(x, h), vec2(.012, .12)));
    vec2 q = p - vec2(x, h + .12);
    float crown = min(htEllipse(q, vec2(.115, .105)), min(htEllipse(q - vec2(.07, -.005), vec2(.075, .085)), htEllipse(q + vec2(.07, .002), vec2(.08, .09))));
    vec3 tree = mix(uGround, mod(fi, 2.) < .5 ? uC1 : uC2, .34);
    c = mix(c, tree, (trunk + htCover(crown)) * glass * .82);
  }

  // Leaves drift only outside the glass.
  for (int i = 0; i < 5; i++) {
    float fi = float(i), h = hash(vec2(fi, 7.));
    float x = mod(t * (.011 + .004 * h) + h * (uAspect + .3), uAspect + .3) - (uAspect + .3) * .5;
    float y = .91 - mod(t * (.009 + .004 * h) + fi * .17, .42);
    vec2 q = rot(t * (.08 + .03 * h) + fi * 1.7) * (p - vec2(x, y)) / (.018 + .005 * h);
    float leaf = htCover(htLeaf(q));
    c = mix(c, mix(uC1, uC3, h * .52), leaf * glass * amt(.52));
  }

  // Heavy walnut frame and mullions read even in the small gallery card.
  float frame = clamp(window - htCover(htBox(wp, wb - vec2(.025))), 0., 1.);
  float mullion = glass * max(htCover(abs(p.x) - .012), htCover(abs(p.y - .69) - .012));
  mullion = max(mullion, glass * max(htCover(abs(p.x - uAspect * .245) - .009), htCover(abs(p.x + uAspect * .245) - .009)));
  c = mix(c, mix(uGround, uC1, .08), max(frame, mullion) * .96);

  // Foreground table and a rust runner widening toward the viewer.
  float table = htCover(uv.y - .385);
  c = mix(c, walnut, table);
  c = mix(c, mix(uGround, uC1, .24), htCover(abs(uv.y - .385) - .008));
  float runnerWidth = .18 + (.385 - min(uv.y, .385)) * .56;
  float runner = table * htCover(abs(p.x) - runnerWidth);
  c = mix(c, mix(uGround, uC1, .68), runner * amt(.72));
  float stripe = runner * htCover(abs(abs(p.x) - (runnerWidth - .035)) - .007);
  c = mix(c, cream, stripe * amt(.55));

  // Three taper candles rise across the back of the table.
  for (int i = 0; i < 3; i++) {
    float fi = float(i), x = -.18 + fi * .18;
    float top = .57 + .075 * (1. - abs(fi - 1.));
    float candle = htCover(htBox(p - vec2(x, (.385 + top) * .5), vec2(.018, (top - .385) * .5)));
    c = mix(c, cream, candle * amt(.78));
    float base = htCover(htEllipse(p - vec2(x, .38), vec2(.052, .012)));
    c = mix(c, mix(uC3, uGround, .25), base * amt(.72));
    float flicker = .88 + .12 * sin(t * (2.1 + fi * .27) + fi * 2.4);
    vec2 fq = (p - vec2(x + .004 * sin(t * 1.3 + fi), top + .027)) / vec2(.013, .034 * flicker);
    float flame = htCover(htEllipse(fq, vec2(1.)));
    float glow = exp(-dot(fq, fq) * .17) * .11;
    c = mix(c, uC3, glow * amt(.65));
    c = mix(c, mix(cream, uC3, .65), flame * amt(.92));
  }

  // Cream plates anchor two place settings on either side.
  for (int i = 0; i < 2; i++) {
    float x = i == 0 ? -.61 : .61;
    vec2 q = p - vec2(x, .135);
    float plate = htCover(htEllipse(q, vec2(.245, .073)));
    float well = htCover(htEllipse(q, vec2(.187, .047)));
    c = mix(c, cream, plate * amt(.82));
    c = mix(c, mix(cream, uGround, .23), well * amt(.36));
    float rim = clamp(plate - htCover(htEllipse(q, vec2(.221, .061))), 0., 1.);
    c = mix(c, uC3, rim * amt(.45));
  }

  // Bread at left, pie at center-right, both readable as broad graphic forms.
  vec2 breadP = p - vec2(-.38, .235);
  float bread = htCover(htEllipse(breadP, vec2(.19, .07)));
  c = mix(c, mix(uC3, uC1, .28), bread * amt(.82));
  for (int i = 0; i < 3; i++) {
    float cut = htCover(abs((breadP.x + .07 - float(i) * .07) + breadP.y * .42) - .008) * bread;
    c = mix(c, cream, cut * amt(.45));
  }
  vec2 pieP = p - vec2(.18, .22);
  float dish = htCover(htEllipse(pieP, vec2(.30, .088)));
  float filling = htCover(htEllipse(pieP - vec2(0., .012), vec2(.255, .062)));
  c = mix(c, cream, dish * amt(.72));
  c = mix(c, mix(uC1, uC3, .42), filling * amt(.88));
  float crust = clamp(dish - htCover(htEllipse(pieP, vec2(.27, .07))), 0., 1.);
  c = mix(c, uC3, crust * amt(.78));

  // An occasional lifted slice is the one cozy reveal.
  float phase = mod(t * .5, 12.);
  float reveal = smoothstep(4., 5., phase) * (1. - smoothstep(8., 9., phase));
  vec2 sliceP = p - vec2(.16 + .13 * reveal, .225 + .085 * reveal);
  float slice = htCover(htWedge(sliceP));
  c = mix(c, mix(uC1, uC3, .52), slice * amt(.92));
  float sliceCrust = htCover(abs(sliceP.x - .22) - .018) * slice;
  c = mix(c, cream, sliceCrust * amt(.62));

  // Two small pumpkins complete the harvest silhouette without hiding the food.
  for (int i = 0; i < 2; i++) {
    float fi = float(i), x = i == 0 ? -.16 : .48;
    float s = i == 0 ? .09 : .075;
    vec2 q = (p - vec2(x, .105)) / s;
    float pumpkin = htCover(htPumpkin(q));
    c = mix(c, mix(uC1, uC3, .18 + .18 * fi), pumpkin * amt(.82));
    float ribs = htCover(abs(abs(q.x) - .18) - .025) * pumpkin;
    c = mix(c, uGround, ribs * amt(.10));
    float stem = htCover(htBox(rot(.22) * (q - vec2(.02, .42)), vec2(.055, .12)));
    c = mix(c, mix(uGround, uC2, .45), stem * amt(.76));
  }

  // Steam curls from bread and pie; the reveal strengthens the pie's curl.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 origin = i == 0 ? vec2(-.38, .285) : vec2(.13 + .07 * fi, .285);
    vec2 q = p - origin;
    float curl = abs(q.x - .012 * sin(q.y * 38. + t * .7 + fi * 2.)) - .004;
    float steam = htCover(curl) * smoothstep(0., .035, q.y) * (1. - smoothstep(.035, .17, q.y));
    float strength = i == 0 ? .18 : .12 + reveal * .10;
    c = mix(c, cream, steam * amt(strength));
  }

  return vec4(c, 1.);
}
