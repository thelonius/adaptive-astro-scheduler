/// Разведение наложившихся глифов на кольце — порт AstroClock/src/collide.h.
library;

import 'dart:math' as math;

const int maxGlyphObjects = 12;
const int noneGroup = 0xFF;
const double swapSlotMs = 2000;

double overlapLimit(double glyphPx) => glyphPx * 0.75;

class GlyphGroups {
  final List<int> of;
  final List<int> slot;
  final List<int> size;
  final int count;
  final bool any;

  const GlyphGroups({
    required this.of,
    required this.slot,
    required this.size,
    required this.count,
    required this.any,
  });
}

GlyphGroups buildGlyphGroups(
  List<double> lonDeg,
  int n,
  double radiusPx,
  double glyphPx,
) {
  if (n > maxGlyphObjects) n = maxGlyphObjects;
  final double lim = overlapLimit(glyphPx);

  final List<int> parent = List<int>.generate(n, (int i) => i);

  int find(int x) {
    while (parent[x] != x) {
      x = parent[x];
    }
    return x;
  }

  for (int i = 0; i < n; i++) {
    for (int j = i + 1; j < n; j++) {
      double d = (lonDeg[i] - lonDeg[j]).abs();
      if (d > 180.0) d = 360.0 - d;
      final double chord =
          2.0 * radiusPx * math.sin(d * 0.00872664626); // d/2 в радианах
      if (chord < lim) {
        final int a = find(i);
        final int b = find(j);
        if (a != b) parent[a] = b;
      }
    }
  }

  final List<int> of = List<int>.filled(maxGlyphObjects, noneGroup);
  final List<int> slot = List<int>.filled(maxGlyphObjects, 0);
  final List<int> size = List<int>.filled(maxGlyphObjects, 0);
  int count = 0;
  bool any = false;

  final List<int> label = List<int>.filled(maxGlyphObjects, -1);
  for (int i = 0; i < n; i++) {
    final int root = find(i);
    if (label[root] < 0) {
      label[root] = count;
      count++;
    }
    final int grp = label[root];
    of[i] = grp;
    slot[i] = size[grp];
    size[grp]++;
  }

  for (int i = 0; i < n; i++) {
    if (size[of[i]] < 2) {
      of[i] = noneGroup;
    } else {
      any = true;
    }
  }

  return GlyphGroups(of: of, slot: slot, size: size, count: count, any: any);
}

/// Яркость объекта: 1.0 наверху, [low] в очереди, плавный переход.
double glyphLevel(
  GlyphGroups g,
  int i,
  int ms, {
  double low = 0.3,
  double slotMs = swapSlotMs,
}) {
  final int grp = g.of[i];
  if (grp == noneGroup) return 1.0;

  final int k = g.size[grp];
  final double p = (ms % (slotMs * k)) / slotMs;
  final int cur = p.floor();
  final double frac = p - cur;

  const double fadeStart = 0.75;
  final int me = g.slot[i];
  if (me == cur) {
    if (frac < fadeStart) return 1.0;
    return 1.0 - (frac - fadeStart) / (1.0 - fadeStart) * (1.0 - low);
  }
  if (me == (cur + 1) % k && frac >= fadeStart) {
    return low + (frac - fadeStart) / (1.0 - fadeStart) * (1.0 - low);
  }
  return low;
}

bool glyphOnTop(GlyphGroups g, int i, int ms, {double slotMs = swapSlotMs}) {
  final int grp = g.of[i];
  if (grp == noneGroup) return true;
  final int k = g.size[grp];
  final double p = (ms % (slotMs * k)) / slotMs;
  return g.slot[i] == p.floor();
}
