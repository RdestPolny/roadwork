/* Movable-looking furnishings share the collision footprints in pub.js. */

/**
 * Create depth-sortable drawing entries for the pub's tables and benches.
 * Coordinates and heights use the current pub camera's world units. Each
 * entry is [ground depth, draw]; merge the entries with the player at
 * player.i + player.j and draw in ascending depth order.
 *
 * @param {{box: Function, ln: Function, c: Object}} art Existing pub drawing
 * primitives and palette. box takes (i0,j0,i1,j1,z0,z1,top,front,side),
 * and ln takes (i0,j0,z0,i1,j1,z1,color).
 * @returns {Array<[number, function(): void]>}
 */
export function pubFurnitureItems({box, ln, c}) {
  /** Draw a worn plank top and the four legs inside its footprint. */
  function table(a, b, d, e) {
    // Feet and rails remain under the top so collision geometry is unchanged.
    for (const i of [a + .1, d - .22]) for (const j of [b + .1, e - .22]) {
      box(i, j, i + .12, j + .12, 0, 5, c.trim, c.wood, c.bar);
      box(i - .015, j - .015, i + .135, j + .135, 0, .3, c.wood, c.bar, c.dark);
    }
    box(a + .1, b + .1, d - .1, b + .2, 2.3, 2.6, c.wood, c.bar, c.dark);
    box(a + .1, e - .2, d - .1, e - .1, 2.3, 2.6, c.wood, c.bar, c.dark);
    box(a, b, d, e, 5, 5.7, c.top, c.wood, c.bar);
    for (let j = b + (e - b) / 3; j < e - .04; j += (e - b) / 3) {
      ln(a + .04, j, 5.71, d - .04, j, 5.71, c.wood);
      ln(a + .08, j + .025, 5.72, d - .08, j + .025, 5.72, c.trim);
    }
    for (const i of [a + .14, d - .14]) for (const j of [b + .12, e - .12]) {
      ln(i, j, 5.73, i + .025, j, 5.73, c.dark);
    }
    ln(a + .22, b + .15, 5.73, a + .52, b + .15, 5.73, c.trim);
  }

  /** Make a stout backless bench, with end supports and a plank seat. */
  function bench(a, b, d, e) {
    const alongJ = e - b > d - a;
    if (alongJ) {
      for (const j of [b + .16, e - .3]) box(a + .1, j, d - .1, j + .14, 0, 3.5, c.wood, c.bar, c.dark);
    } else {
      for (const i of [a + .16, d - .3]) box(i, b + .1, i + .14, e - .1, 0, 3.5, c.wood, c.bar, c.dark);
    }
    box(a, b, d, e, 3.5, 4, c.top, c.wood, c.bar);
    if (alongJ) {
      ln((a + d) / 2, b + .04, 4.01, (a + d) / 2, e - .04, 4.01, c.wood);
      ln(a + .09, b + .18, 4.02, a + .09, e - .18, 4.02, c.trim);
    } else {
      ln(a + .04, (b + e) / 2, 4.01, d - .04, (b + e) / 2, 4.01, c.wood);
    }
  }

  /** A squat tankard, with a bright rim and a small side handle. */
  function tankard(i, j, z) {
    box(i, j, i + .18, j + .17, z, z + 1.05, c.gold, c.wood, c.bar);
    box(i + .025, j + .025, i + .155, j + .145, z + 1.05, z + 1.13, c.dark, c.gold, c.wood);
    ln(i + .18, j + .05, z + .8, i + .25, j + .05, z + .8, c.gold);
    ln(i + .25, j + .05, z + .8, i + .25, j + .05, z + .3, c.gold);
    ln(i + .25, j + .05, z + .3, i + .18, j + .05, z + .3, c.gold);
  }

  /** Bottle, cork and tiny glint, all resting on the tabletop. */
  function bottle(i, j, z) {
    box(i, j, i + .15, j + .15, z, z + 1.45, c.glass, c.glass, c.dark);
    box(i + .045, j + .045, i + .105, j + .105, z + 1.45, z + 1.9, c.glass, c.glass, c.dark);
    box(i + .045, j + .045, i + .105, j + .105, z + 1.9, z + 2.03, c.trim, c.wood, c.dark);
    ln(i + .035, j + .155, z + .35, i + .035, j + .155, z + 1.2, c.cool);
  }

  return [
    [5.8, () => {
      table(1.1, 2.25, 2.45, 3.35);
      tankard(1.35, 2.5, 5.7);
      // A small wooden plate and crumbs catch the light on the other end.
      box(1.87, 2.8, 2.15, 3.03, 5.7, 5.82, c.trim, c.wood, c.bar);
      box(1.94, 2.86, 2.07, 2.96, 5.82, 5.95, c.paper, c.trim, c.wood);
    }],
    [8.6, () => {
      table(4.05, 2.1, 5.55, 3.05);
      bottle(4.35, 2.4, 5.7);
      box(4.9, 2.65, 5.15, 2.87, 5.7, 5.83, c.paper, c.stone, c.dark);
      ln(4.94, 2.7, 5.84, 5.1, 2.7, 5.84, c.wood);
      ln(4.94, 2.76, 5.84, 5.07, 2.76, 5.84, c.wood);
      tankard(5.22, 2.28, 5.7);
    }],
    [12.05, () => {
      table(6.35, 4, 7.25, 4.8);
      tankard(6.65, 4.25, 5.7);
      box(6.92, 4.5, 7.1, 4.65, 5.7, 5.8, c.paper, c.trim, c.wood);
    }],
    [6.85, () => bench(.1, 4.2, .7, 6.15)],
    [11.8, () => bench(7.65, 1.05, 8.55, 3.25)],
  ];
}
