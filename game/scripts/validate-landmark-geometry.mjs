import assert from "node:assert/strict";
import * as THREE from "three";
import * as navigationConstants from "../src/config/runtime.js";
import { RIDER_COLLISION_RADIUS } from "../src/config/runtime.js";
import { createNavigationSystem } from "../src/navigation/navigation.js";
import { createAlunAlunEastSchoolsFactory } from "../src/features/landmarks/alun-alun/east-schools.js";
import { createAlunAlunWestRoadsideFactory } from "../src/features/landmarks/alun-alun/west-roadside.js";
import { createLandmarkHelpers } from "../src/features/landmarks/helpers.js";
import { createMosqueModelFactory } from "../src/features/landmarks/mosque.js";
import { createPendopoModelFactory } from "../src/features/landmarks/pendopo.js";

// Exercise the real model constructors and material batching without WebGL.
// Canvas-generated sign textures and out-of-scope vegetation/walkers are replaced;
// appearance and animation over time still need a browser. Architectural helpers
// (including arches, carved columns, flags and pennants) use their real geometry.
const signs = new Map();
const animatedStopDetails = [];
const inkMaterial = new THREE.MeshToonMaterial({ color: 0x282c29 });
const realHelpers = createLandmarkHelpers({
  animatedStopDetails,
  materials: { inkMaterial },
});
const skipEnvironment = () => new THREE.Group();
const helpers = {
  ...realHelpers,
  addAlunAlunTree: skipEnvironment,
  addAlunAlunWalker: skipEnvironment,
  addLocalPalm: skipEnvironment,
  getSitubondoSignMaterial: (...args) => {
    const key = JSON.stringify(args);
    if (!signs.has(key)) signs.set(key, new THREE.MeshBasicMaterial());
    return signs.get(key);
  },
};
const foliageMaterials = [0x427346, 0x618951].map((color) => new THREE.MeshToonMaterial({ color }));
const rockMaterial = new THREE.MeshToonMaterial({ color: 0x555550 });
const dependencies = {
  helpers,
  collections: { animatedStopDetails },
  materials: { foliageMaterials, rockMaterial },
};
const models = {
  ...createAlunAlunEastSchoolsFactory(dependencies),
  ...createAlunAlunWestRoadsideFactory(dependencies),
  ...createMosqueModelFactory(dependencies),
  ...createPendopoModelFactory(dependencies),
};

for (const name of [
  "addAlunAlunSdAlAbror",
  "addAlunAlunWarungPojok",
  "addAlunAlunPostOffice",
  "addAlunAlunTyreShop",
  "addAlunAlunEastJunctionFrontage",
  "addMosqueModel",
  "addPendopoModel",
]) {
  const root = new THREE.Group();
  const primaryMaterial = new THREE.MeshToonMaterial({ color: 0xffffff });
  models[name](root, primaryMaterial);
  root.updateMatrixWorld(true);
  if (name === "addMosqueModel") {
    // Guard the manually reproduced closed-leaf walk-through: the visual
    // leaf must be open inward, with matching leaf/post collision geometry.
    const gate = root.getObjectByName("mosque-pedestrian-gate-open");
    assert.ok(gate, "mosque: missing open pedestrian gate");
    assert.deepEqual(gate.position.toArray(), [0.06, 0, 5.2]);
    assert.ok(Math.abs(gate.rotation.y - Math.PI / 2) < 1e-10);
    const leafBounds = new THREE.Box3();
    const inverseGate = gate.matrixWorld.clone().invert();
    gate.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.computeBoundingBox();
      const relativeMatrix = inverseGate.clone().multiply(object.matrixWorld);
      leafBounds.union(object.geometry.boundingBox.clone().applyMatrix4(relativeMatrix));
    });
    assert.ok(Math.abs(leafBounds.min.x) < 1e-6, "mosque: leaf no longer starts at hinge");
    assert.ok(Math.abs(leafBounds.max.x - 0.48) < 1e-6, "mosque: incorrect leaf width");
    const obstacles = root.userData.navigation.obstacles;
    const leaves = obstacles.filter(({ label }) => label === "pedestrian gate leaf");
    assert.equal(leaves.length, 1);
    const leaf = leaves[0];
    assert.deepEqual(leaf, {
      shape: "box", x: 0.06, z: 4.96, width: 0.045, depth: 0.48,
      label: "pedestrian gate leaf",
    });
    const posts = obstacles.filter(({ label }) => label === "pedestrian gate post")
      .sort((a, b) => a.x - b.x);
    assert.deepEqual(posts.map(({ x, z, width, depth, shape }) => ({ x, z, width, depth, shape })),
      [-0.02, 0.62].map((x) => ({ x, z: 5.175, width: 0.27, depth: 0.27, shape: "box" })));
    const clearLeft = posts[0].x + posts[0].width / 2 + RIDER_COLLISION_RADIUS;
    const clearRight = posts[1].x - posts[1].width / 2 - RIDER_COLLISION_RADIUS;
    assert.ok(clearLeft < 0.29 && clearRight > 0.29,
      "mosque: rider center no longer fits the visible opening");
    assert.ok(leaf.x + leaf.width / 2 + RIDER_COLLISION_RADIUS < clearLeft,
      "mosque: inward leaf consumes the post-cleared approach");
    console.log("mosque: open gate, solid leaf/posts and center passage regression passed");

    // Closed side doors project beyond the prayer-hall body. Guard their own
    // narrow footprints, not an enlarged full-width invisible frontage wall.
    const hallYaw = -0.4174;
    const hallCos = Math.cos(hallYaw);
    const hallSin = Math.sin(hallYaw);
    const hallPoint = (x, z) => ({
      x: hallCos * x + hallSin * z,
      z: -hallSin * x + hallCos * z,
    });
    const obstacleGap = (point, obstacle) => {
      const yaw = obstacle.yaw ?? 0;
      const dx = point.x - obstacle.x;
      const dz = point.z - obstacle.z;
      const x = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
      const z = Math.sin(yaw) * dx + Math.cos(yaw) * dz;
      const outsideX = Math.abs(x) - obstacle.width / 2;
      const outsideZ = Math.abs(z) - obstacle.depth / 2;
      return Math.hypot(Math.max(outsideX, 0), Math.max(outsideZ, 0)) +
        Math.min(Math.max(outsideX, outsideZ), 0) - RIDER_COLLISION_RADIUS;
    };
    const hall = root.getObjectByName("Al-Abror prayer hall · OSM footprint bearing");
    assert.ok(hall, "mosque: missing transformed prayer hall");
    const sideDoorObstacles = [];
    for (const [label, z, width, depth] of [
      ["closed side door frame", 4.13, 0.58, 0.05],
      ["closed side door", 4.17, 0.47, 0.04],
    ]) {
      const matches = obstacles.filter((obstacle) => obstacle.label === label);
      assert.equal(matches.length, 4, `mosque: expected four ${label} colliders`);
      for (const x of [-2.05, -1.42, 1.42, 2.05]) {
        const center = hallPoint(x, z);
        const obstacle = matches.find((candidate) =>
          Math.abs(candidate.x - center.x) < 1e-10 &&
          Math.abs(candidate.z - center.z) < 1e-10);
        assert.ok(obstacle, `mosque: ${label} at hall x=${x} has wrong transformed center`);
        assert.equal(obstacle.shape, "box");
        assert.equal(obstacle.width, width);
        assert.equal(obstacle.depth, depth);
        assert.equal(obstacle.yaw, hallYaw);
        sideDoorObstacles.push(obstacle);
        for (const lateral of [-width * 0.4, 0, width * 0.4]) {
          assert.ok(obstacleGap(hallPoint(x + lateral, z + depth / 2), obstacle) < 0,
            `mosque: ${label} front face does not block the rider at x=${x}`);
        }
        assert.ok(Math.abs(obstacleGap(
          hallPoint(x, z + depth / 2 + RIDER_COLLISION_RADIUS + 0.01), obstacle,
        ) - 0.01) < 1e-10, `mosque: ${label} blocks beyond its visible footprint`);
      }
    }
    // Verify against constructor-produced closed glass rather than labels alone.
    const glassRay = new THREE.Raycaster();
    for (const x of [-2.05, -1.42, 1.42, 2.05]) {
      glassRay.set(
        new THREE.Vector3(x, 0.405, 4.8).applyMatrix4(hall.matrixWorld),
        new THREE.Vector3(0, 0, -1).transformDirection(hall.matrixWorld),
      );
      glassRay.far = 0.8;
      const glassHit = glassRay.intersectObject(hall, true).find(({ object }) =>
        object.material.color?.getHex() === 0x1f3436);
      assert.ok(glassHit, `mosque: missing actual closed side glass at hall x=${x}`);
      const hit = hall.worldToLocal(glassHit.point.clone());
      assert.ok(Math.abs(hit.z - 4.19) < 1e-5, `mosque: side glass front moved at hall x=${x}`);
      assert.ok(sideDoorObstacles.some((obstacle) => obstacleGap(hallPoint(hit.x, hit.z), obstacle) < 0),
        `mosque: visible side glass is traversable at hall x=${x}`);
    }
    assert.ok(sideDoorObstacles.some((obstacle) => obstacleGap({ x: 0.2900007, z: 4.6412125 }, obstacle) < 0),
      "mosque: manually reproduced embedded-door pose remains reachable");
    for (const z of [4.9, 5.0, 5.1, 5.2, 5.3, 5.4]) {
      assert.ok(sideDoorObstacles.every((obstacle) => obstacleGap({ x: 0.29, z }, obstacle) > 0),
        `mosque: side-door correction blocks the pedestrian gate approach at z=${z}`);
    }
    console.log("mosque: four closed side doors/frame footprints, visible glass coverage and gate clearance passed");

    // The closed central bank also projects beyond the hall body. Its backing,
    // five glazed leaves and six stiles must follow the rendered hall rotation.
    const assertCentralDoors = (navigationObstacles) => {
      const central = navigationObstacles.filter(({ label }) => label?.startsWith("closed central door"));
      assert.equal(central.length, 12, "mosque: expected twelve central door colliders");
      const specifications = [
        { label: "closed central door backing", xs: [0], z: 4.27, width: 0.7, depth: 0.06, color: 0x202827 },
        { label: "closed central door glass", xs: [-2, -1, 0, 1, 2].map((i) => i * 0.124), z: 4.307, width: 0.103, depth: 0.012, color: 0x1f3436 },
        { label: "closed central door stile", xs: [0, 1, 2, 3, 4, 5].map((i) => (i - 2.5) * 0.124), z: 4.315, width: 0.012, depth: 0.014, color: 0xb99a50 },
      ];
      const ray = new THREE.Raycaster();
      for (const { label, xs, z, width, depth, color } of specifications) {
        const matches = central.filter((obstacle) => obstacle.label === label);
        assert.equal(matches.length, xs.length, `mosque: wrong count for ${label}`);
        for (const x of xs) {
          const center = hallPoint(x, z);
          const obstacle = matches.find((candidate) =>
            Math.abs(candidate.x - center.x) < 1e-10 && Math.abs(candidate.z - center.z) < 1e-10);
          assert.ok(obstacle, `mosque: ${label} transformed center differs at x=${x}`);
          assert.equal(obstacle.shape, "box");
          assert.ok(Math.abs(obstacle.width - width) < 1e-10);
          assert.equal(obstacle.depth, depth);
          assert.equal(obstacle.yaw, hallYaw);
          ray.set(
            new THREE.Vector3(x, 0.475, 4.7).applyMatrix4(hall.matrixWorld),
            new THREE.Vector3(0, 0, -1).transformDirection(hall.matrixWorld),
          );
          ray.far = 0.5;
          const visualHit = ray.intersectObject(hall, true).find(({ object }) => object.material.color?.getHex() === color);
          assert.ok(visualHit, `mosque: ${label} rendered surface missing at x=${x}`);
          const hit = hall.worldToLocal(visualHit.point.clone());
          assert.ok(Math.abs(hit.z - (z + depth / 2)) < 1e-5,
            `mosque: ${label} collider does not match rendered front at x=${x}`);
          assert.ok(Math.abs(obstacleGap(hallPoint(x, z + depth / 2 + RIDER_COLLISION_RADIUS), obstacle)) < 1e-10,
            `mosque: ${label} rider contact boundary mismatch`);
        }
      }
      for (const x of [-0.26, 0.26]) {
        assert.ok(central.some((obstacle) => obstacleGap(hallPoint(x, 4.201), obstacle) < 0),
          `mosque: reproduced embedded central-door pose remains reachable at x=${x}`);
        assert.ok(central.some((obstacle) => obstacleGap(hallPoint(x, 4.35), obstacle) < 0),
          `mosque: central glazed leaf does not stop approaching rider at x=${x}`);
        for (const z of [4.5, 4.6, 4.7]) {
          assert.ok(central.every((obstacle) => obstacleGap(hallPoint(x, z), obstacle) > 0),
            `mosque: central-door collision consumes clear canopy approach at ${x},${z}`);
        }
      }
    };
    assertCentralDoors(obstacles);
    assert.throws(() => assertCentralDoors(obstacles.filter(({ label }) => !label?.startsWith("closed central door"))),
      /expected twelve central door colliders/, "mosque: removed central-door negative control must fail");
    console.log("mosque: central backing, five panes, six stiles, rendered faces, rotated contact, canopy clearance and negative control passed");

    // Canopy shafts are narrow independent barriers, including the final
    // property-line-clipped post. Do not replace them with a continuous wall.
    const assertCanopyPosts = (navigationObstacles) => {
      const canopyPosts = navigationObstacles.filter(({ label }) => label === "canopy post");
      assert.equal(canopyPosts.length, 13, "mosque: expected thirteen canopy post colliders");
      const shaftRay = new THREE.Raycaster();
      for (let index = 0; index < 13; index += 1) {
        const x = -3.12 + index * 0.52;
        const z = Math.min(4.46,
          (5.3130374848 - 0.012 + hallSin * (x + 0.0325)) / hallCos - 0.0325);
        const center = hallPoint(x, z);
        const post = canopyPosts.find((candidate) =>
          Math.abs(candidate.x - center.x) < 1e-10 && Math.abs(candidate.z - center.z) < 1e-10);
        assert.ok(post, `mosque: canopy post ${index} misses its clipped visual center`);
        assert.equal(post.shape, "box");
        assert.equal(post.width, 0.045);
        assert.equal(post.depth, 0.045);
        assert.equal(post.yaw, hallYaw);
        shaftRay.set(
          new THREE.Vector3(x, 0.45, z + 0.2).applyMatrix4(hall.matrixWorld),
          new THREE.Vector3(0, 0, -1).transformDirection(hall.matrixWorld),
        );
        shaftRay.far = 0.3;
        const shaftHit = shaftRay.intersectObject(hall, true).find(({ object }) =>
          object.material.color?.getHex() === 0x352b25);
        assert.ok(shaftHit, `mosque: canopy post ${index} has no matching rendered shaft`);
        const hit = hall.worldToLocal(shaftHit.point.clone());
        assert.ok(Math.abs(hit.z - (z + 0.0225)) < 1e-5,
          `mosque: canopy post ${index} shaft front does not match collider`);
        for (const [dx, dz] of [[0.0825, 0], [-0.0825, 0], [0, 0.0825], [0, -0.0825]]) {
          assert.ok(Math.abs(obstacleGap(hallPoint(x + dx, z + dz), post)) < 1e-10,
            `mosque: canopy post ${index} radius-contact mismatch`);
        }
        assert.ok(obstacleGap(center, post) < 0, `mosque: canopy post ${index} is traversable`);
        assert.ok(Math.abs(obstacleGap(hallPoint(x, z + 0.0925), post) - 0.01) < 1e-10,
          `mosque: canopy post ${index} has an oversized invisible barrier`);
        if (index < 12) {
          assert.ok(canopyPosts.every((candidate) => obstacleGap(hallPoint(x + 0.26, z), candidate) > 0.16),
            `mosque: canopy post ${index} blocks the adjacent shaft gap`);
        }
      }
    };
    assertCanopyPosts(obstacles);
    assert.throws(() => assertCanopyPosts(obstacles.filter(({ label }) => label !== "canopy post")),
      /expected thirteen canopy post colliders/, "mosque: missing-post negative control must fail");
    console.log("mosque: thirteen canopy shafts, clipped centers, four-side rider contact, adjacent gaps and negative control passed");

    // Batch16: the actual site slab continues behind the clipped forecourt.
    // Omitting it creates a false ground-level drop across the visible floor.
    const surfaces = root.userData.navigation.surfaces;
    const assertSiteSlab = (navigationSurfaces) => {
      const slabs = navigationSurfaces.filter(({ label }) => label === "site slab");
      assert.equal(slabs.length, 1, "mosque: expected one registered site slab");
      assert.deepEqual(slabs[0], {
        x: 0, z: -0.14, width: 7.5, depth: 8.7, height: 0.12, label: "site slab",
      });
      assert.ok(navigationSurfaces.every(({ label }) =>
        !/^entrance (stair|landing)/.test(label)), "mosque: phantom entrance stairs remain");
    };
    assertSiteSlab(surfaces);
    assert.throws(() => assertSiteSlab(surfaces.filter(({ label }) => label !== "site slab")),
      /expected one registered site slab/, "mosque: missing-slab negative control must fail");
    // Downward rays just above the slab exclude canopy/roof tops. Sample its
    // four inset corners and exposed approach, plus points beyond each edge.
    const floorRay = new THREE.Raycaster();
    const slabTopAt = (x, z) => {
      floorRay.set(new THREE.Vector3(x, 0.13, z), new THREE.Vector3(0, -1, 0));
      floorRay.far = 0.14;
      return floorRay.intersectObject(root, true).find(({ object, point }) =>
        object.material.color?.getHex() === 0x817e76 && Math.abs(point.y - 0.12) < 1e-5);
    };
    for (const x of [-3.65, 3.65]) {
      for (const z of [-4.39, 4.11]) {
        assert.ok(slabTopAt(x, z), `mosque: actual site slab top missing at ${x},${z}`);
      }
    }
    assert.ok(slabTopAt(-2.04, 3.93), "mosque: reproduced seam lacks rendered slab");
    for (const [x, z] of [[-3.8, 0], [3.8, 0], [0, -4.54], [0, 4.26]]) {
      assert.ok(!slabTopAt(x, z), `mosque: actual slab extends past registered edge at ${x},${z}`);
    }
    const makeFloorNavigation = (navigationSurfaces) => {
      const navigation = createNavigationSystem({
        constants: navigationConstants, getGeospatialWorld: () => null,
      });
      navigation.registerStopNavigation({
        theta: 0, phi: 0, yaw: 0, baseScale: 1, shortName: "Al-Abror",
        group: {
          position: new THREE.Vector3(0, navigationConstants.PLANET_RADIUS, 0),
          userData: { navigation: { surfaces: navigationSurfaces } },
        },
      });
      return navigation;
    };
    const floorNavigation = makeFloorNavigation(surfaces);
    // At yaw0 local(x,z) maps to world(theta=z, phi=-x). This traverses the
    // real registered spherical surfaces rather than a copy of contains().
    for (const [z, expectedHeight] of [[4.3, 0.08], [4.15, 0.12], [3.96, 0.12], [3.93, 0.12]]) {
      assert.ok(Math.abs(floorNavigation.navigationSurfaceLiftAt(z, 2.04) - expectedHeight) < 1e-9,
        `mosque: floor lift mismatch at frontage z=${z}`);
    }
    for (const [fromZ, toZ] of [[4.3, 4.15], [3.96, 3.93], [3.93, 3.96], [4.15, 4.3]]) {
      assert.equal(floorNavigation.surfaceTransitionIsBlocked(fromZ, 2.04, toZ, 2.04), false,
        `mosque: visible floor transition blocked at ${fromZ}->${toZ}`);
    }
    assert.equal(floorNavigation.navigationSurfaceLiftAt(5.4, -0.29), navigationConstants.GROUND_EPSILON,
      "mosque: private slab extends outside gate/property line");
    const missingSlabNavigation = makeFloorNavigation(surfaces.filter(({ label }) => label !== "site slab"));
    assert.equal(missingSlabNavigation.surfaceTransitionIsBlocked(3.96, 2.04, 3.93, 2.04), true,
      "mosque: missing slab must reproduce the original forecourt seam blockage");
    console.log("mosque: rendered site slab, footprint bounds, forecourt continuity, gate exterior and missing-slab negative control passed");
  }
  let meshCount = 0;
  const geometries = new Set();
  const materials = new Set();
  root.traverse((object) => {
    assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${name}: nonfinite transform`);
    if (!object.isMesh) return;
    meshCount += 1;
    assert.ok(object.geometry, `${name}: missing merged geometry`);
    const geometry = object.geometry;
    geometries.add(geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
    }
    const position = geometry.getAttribute("position");
    assert.ok(position?.count > 0, `${name}: empty position attribute`);
    for (const [attributeName, attribute] of Object.entries(geometry.attributes)) {
      assert.equal(attribute.count, position.count, `${name}: ${attributeName} count mismatch`);
      assert.ok(attribute.array.every(Number.isFinite), `${name}: nonfinite ${attributeName}`);
    }
    if (geometry.index) {
      assert.ok(geometry.index.array.every((index) => Number.isInteger(index) && index >= 0 && index < position.count), `${name}: invalid triangle index`);
    }
    geometry.computeBoundingSphere();
    assert.ok(Number.isFinite(geometry.boundingSphere.radius), `${name}: invalid bounds`);
    assert.ok(geometry.boundingSphere.center.toArray().every(Number.isFinite), `${name}: invalid bound center`);
  });
  assert.ok(meshCount > 0, `${name}: no meshes constructed`);
  console.log(`${name}: ${meshCount} valid meshes; geometry batching passed`);
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  if (!materials.has(primaryMaterial)) primaryMaterial.dispose();
  signs.clear();
  animatedStopDetails.length = 0;
}
inkMaterial.dispose();
for (const material of foliageMaterials) material.dispose();
rockMaterial.dispose();
