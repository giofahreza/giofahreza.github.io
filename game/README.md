# Situbondo Messenger

A cel-shaded WebGL delivery game mapped around Situbondo, East Java, built with
Vite and Three.js. It keeps the playful visual language of
`messenger.abeto.co`, while its navigable world now comes from reproducible
geospatial data instead of an invented street grid.

## 1 km development zone

- Survey origin: Alun-Alun Situbondo (`-7.7068185, 114.0054037`)
- Playable coverage: a true 1,000 m radius, or 3.14 km²
- Everything beyond the 1 km line is visibly marked restricted and under
  development; movement is clamped exactly at the circular boundary
- Horizontal scale: 1 Three.js world unit = 5 real metres on both axes
- Source population: one instanced structure per OpenStreetMap building way
  whose center lies in the projected survey circle (3,243 in the current snapshot)
- Roads: real OSM centerlines clipped exactly at the 1 km boundary, with tagged
  widths where available and deterministic class-based widths otherwise
- Storage precision: projected coordinates are quantized to 0.1 m

Building centers, dimensions, and orientations come from mapped footprints.
For this foundation pass, facades are intentionally lightweight oriented boxes;
landmark-specific architecture can be refined without changing their metric
coordinates or the source building count.

## Living city layer

The snapshot also contains 116 deduplicated, real tagged places. Of those, 102
unique OSM building footprints are matched and animated directly—there are no
floating world-space category signs. Phone-store signal bars move on the facade,
restaurant steam rises from the roof, retail awnings flex, medical crosses pulse,
worship buildings gain glowing domes, school books open, bank coins and workshop
gears spin, hotel windows blink, and civic, recreation, and transport buildings
each have physically attached activity. A nearby UI card shows the mapped place
name as the player approaches.

The 17 mapped waterways have moving flow highlights. Eighteen real `bridge=*`
segments receive raised decks and moving activity stripes. These semantics use
OpenStreetMap tags; the art is intentionally interpretive rather than an exact
facade reproduction.

## Situbondo Route

- Alun-Alun Situbondo at the full OSM footprint, with its checker promenade,
  green-white curb, tall tree rows, palms, gazebos, Garuda monument, and
  `SITUBONDO · KOTA SANTRI PANCASILA` frontage
- Gazebo Situbondo at its OSM footprint opposite Pendopo Aryo, with the real
  white paneled masonry colonnade, broad ceremonial stair, stainless railings,
  layered warm dark-clay hip roofs, ornamental lamps, planters, flag, and visitors
- Masjid Agung Al-Abror with its full two-storey east facade, tall mosaic-framed
  central arch, salmon-beige side towers, arched windows, patterned pointed
  domes, west annex, ornamental fence, and layered pale-lime minaret
- Pendopo Aryo Situbondo with its broad terracotta joglo roofs, slim dark-timber
  colonnade, gray-green eave, raised lawn, landmark lettering, palms, and wings
- Pasar Mimbaan with its blue entrance, red shutters, and becak detail
- Terminal Situbondo as the in-zone transport stop
- Stadion Gelora Muhammad Saleh

The Alun-Alun model uses OSM way `185229377` for its measured outline. Its
recognizable street-facing details were visually surveyed from the Google
Street View 360 panorama at
[`-7.7060109, 114.0055041`](https://www.google.com/maps/@-7.7060109,114.0055041,3a,75y,175.25h,90t);
the local reference captures are development evidence and are not loaded by the
game runtime. The live panorama (`lRACqXqndYuLZy3hL-GgMg`) was revalidated on
August 11, 2026. The frontage and Jl. Nasional 1 context were cross-checked at
headings `85°`, `175°`, `265°`, and `355°` for the paving scale, curb colors,
Post Office roof and garden frontage, Planet Ban facade, west roadside kiosk,
traffic signs, utility transformer and lines, median planters, crossing, and
divided traffic directions. The `0°` frames from the main and east panoramas
anchor the Planet Ban block's rough gray shell, red-framed balcony, yellow
ground-floor fascia, open service bays, exposed AC units, and vertical blue
oval sign; its in-game tyre displays rotate with visible wheel marks. The second
`315°` and `0°` main-panorama views establish the Post Office's broad
terracotta-tiled hip roof, projecting entrance roof, orange window canopies,
transom rhythm, and facade AC units; the visible fan rotors now turn in place.
The east-junction `330°`, `350°`, and `10°` views separate the frontage into
the low corrugated service annex, narrow blue-pier office, two-storey beige
shophouse with striped shutters and cat banner, framed Arum Shop facade, and
the detached white Bakti Motor workshop with its gable roof, `IRC` branding,
service bays, and rooftop billboard. The workshop now follows OSM building
`2122` instead of overlapping its generic extrusion.
The west panorama around headings `300°` to `330°` establishes the compact
`@BICAU STORY` takeaway booth west of the Post Office: shallow corrugated roof,
charcoal fascia, split white-and-green lettering, menu panels, black corner
post, green counter strip, and the open gap in the surrounding red-white fence.
The same official panorama `uKDUcjdywcZGFGHRjXXZNw` at headings `315°`,
`330°`, and `345°` establishes that the former generic public-service block is
the Post Office west service wing: an open paved motorcycle yard, long shallow
gray corrugated canopy on thin dark posts, cream service wall, yellow
information banner, open red-white gates, and layered dark-terracotta,
faded-gray, and red-tile roofs with a small front dormer.
Official panorama `NZ0JkC8RxyW3E0Zbjv-6Vw` at headings `210°` through `300°`
establishes the east-facing SD Islam Al-Abror compound west of the square. It
replaces OSM building `2226` with the teal-and-orange two-storey classroom
frontage, lime stair tower, teal entrance marquee and school lettering,
upper balcony and red-tile roof, north teal gable annex, and the cream,
gold, green, and dark-stone boundary fence visible from the roadside sphere.
Official panorama `xmX33FzrGEYDJJKhw59WYA` at headings `140°` through `215°`
establishes the Dinas Perpustakaan dan Kearsipan compound on Jl. Kartini south
of the square. It replaces OSM building `13` with the low terracotta-tiled
front office and scalloped veranda, central black name wall and raised agency
lettering, open gray-roof pendopo pavilion, west pale gable wing, small
green-roof gate booth, layered rear reading-hall roofs, and white metal fence
on dark-stone bases. The panorama captures remain development evidence only
and are not bundled with the game.
Official panorama `L139DDJA3qEuqHCUkm1Szg` at headings `155°` through `205°`
establishes Warung Pojok Hj. Nurul at the Jl. A. Jakfar and Jl. Cendrawasih
corner southeast of the square. It replaces OSM building `169` with the
one-storey white dining room, dark red timber storefront, three broad glazed
bays, raised weathered relief wall, blue `WARUNG POJOK / Pilih Indonesia`
corner sign, yellow-red side sign, green-and-cream corrugated wraparound
awning, and the lower weathered rear mural wing contained by the same mapped
footprint. The Street View and satellite captures remain development evidence
only and are not bundled with the game.
Official Google road panoramas `2PxfWOqmN-eVXA4Sn30o5w` from May 2025 at
approximately `315°`, `swyItNVflaEBkIrrGuVLbg` from May 2025 at approximately
`280°`, and `9zv5hekIeeekvgaKtR_ucQ` from June 2025 at approximately `358°`
establish Bank BRI KC Situbondo northwest of the square. Together with the
Google Maps February 2021 full-frontage photo, they replace OSM building `3`
with the south-facing three-storey white-and-BRI-blue office, west blue service
tower, central projecting glazed gable, east windowed wing, open roof rail,
Galeri ATM lobby, curved blue parking canopy, tall roadside identity pylon, and
east compound wall. The custom art follows the measured irregular OSM outline,
and navigation retains that exact polygon instead of a rectangular collision
approximation. The Google captures remain development evidence only and are not
bundled with the game.
Official 2025 Google Street View panorama `qkiGd_ZJbmzTEFsgeIfQIA` at
approximately `-7.7059264, 114.0042008`, surveyed from headings `45°` through
`205°`, establishes the west-facing Lesehan Situbondo frontage northwest of
the square. The semantic place is matched to OSM building `10` (way
`310921319`, also mapped as the Pegadaian block), so its former generic box is
replaced while the exact 27.5 by 15.8 metre OSM polygon remains the collision
boundary. The north-to-south frontage follows the seven surveyed sections: the
wide double brown shutter with faded `0 3`, recessed dark timber bay, two
closed Mie Ayam Podo Moro shutters, broad `LUMAYAN` service window and menu,
open seating bay behind an animated weathered bamboo blind, and Warung Makan
Mbah Kasan's banner and snack display. Shared stacked-stone piers and stepped
cream fascias support the observed roof groups: broad northern and `LUMAYAN`
limasan caps, a low connected Mie eave, corrugated open-bay and bamboo bridges,
and the southern Mbah Kasan cap. The glazed gray-and-green rear mass remains
behind the low shop row. The canal, opposite gazebos, road, people, and vehicles
are intentionally outside this building-only pass. The Street View and
satellite captures remain development evidence only and are not loaded by the
game runtime.
Official 2025 Google road panoramas `BYqQEyWyvU-F5LdhNl07wQ`,
`eyCl229iWox_hK9V4hE4Jw`, `QQ5rOSIFgGrRoNLmMlxExQ`, and
`qEuxjdMnvRRCXDTJxJnPqw` establish the east roadside boundary of SD Negeri 6
Dawuhan at Jl. A. Yani No. 32. Google satellite coverage and photographs from
the school's official website supplement the road spheres for the interior:
an open north courtyard, long west classroom wing, parallel red-clay-tile
southern ranges, blue and pale-yellow walls, dark-blue lower bands,
terracotta plinths, green doors and windows, and white tiled corridors. OSM
building `4` is therefore replaced by separate wing geometry rather than one
solid extrusion. Navigation excludes the original compound polygon and uses
individual box collisions for the classroom ranges, east service rooms,
roadside stall, gate, and north wall so the real courtyard remains open. The
reference captures remain development evidence only and are not bundled with
the game.
The second road-context pass followed adjacent
official panoramas `uKDUcjdywcZGFGHRjXXZNw` and
`D5CHpXgsA063sg-a3AuhzA` westward, plus `CfXSHuda24sfn68Nj2QHOQ`,
`7q9UZualyWaeqOHWyTxC3g`, and `bZjDa1lCYPoHpaIchD97UQ` through the east
junction. The `180°` view in `uKDUcjdywcZGFGHRjXXZNw` also fixes the civic
entrance details: two-level `SITUBONDO / KOTA SANTRI PANCASILA` lettering, red
sail mark, red-capped hedge planter with a slatted end, three-globe lamp,
environmental message board, and yellow-red driveway barrier. Those views
establish the green civic kiosk, red-white school fence,
double-yellow center lines, split cross street, median railing, corner shops,
billboards, and signal placement. The signal junction now follows the surveyed
OSM carriageways around its compact island, masks inferred map sidewalks only
inside the vehicle envelope, keeps the checker-paved park corner above the
asphalt, and joins its compact zebra crossing to a dropped curb. The divided
approaches retain their blue-white medians and protective nose bollards. Cars
and motorbikes now follow those same carriageways and brake into staggered
queues with their front bumpers behind the stop bars, and faster followers keep
a physical gap instead of passing through slower vehicles, while the
cross-street scooters, pickups, vans, and compact delivery trucks move on the
complementary signal phase seen in the east-junction panoramas. The same
east-junction survey establishes the long dark pitched pedestrian shelter
behind the frontage tree row, its thin metal posts, raised blue-white stone
east entrance, adjacent service block, and walkers moving through the covered
corridor.
Trees and palms respond to wind,
Garuda's wings breathe subtly, the Indonesian flag moves, lamps pulse, fountain
jets dance, and walkers circulate on the park paths. Reduced-motion preferences
keep all of that activity restrained.

The Gazebo Situbondo model replaces the generic extrusion for OSM building
index `2228` at its measured 31.7 m × 8.9 m footprint. Its street-facing form
was surveyed from Google Maps at `-7.7074745, 114.005545`. The public-road
panorama `gHIAR9-7DNO6HM9zetIQZg`, rechecked at heading `348.43°` on August 19,
2026, separates this permanent white pavilion from the ornate ceremonial
canopy inside the Pendopo grounds. Reference captures are development material
only and are not loaded by the game runtime.

Masjid Agung Al-Abror replaces OSM building index `0` at its measured
footprint. Google Street View 360 panorama `GKSOzoQplfVtA8AF3pnbQQ`, viewed at
`270°` and rechecked on August 19, 2026, confirms that the public facade and
forecourt face the east-side road. Its daylight and oblique views anchor the
two-storey bay hierarchy, narrow mosaic-framed central tower, arched circular-
transom windows, separate Arabic friezes, full-width entrance canopy, patterned
corner domes, west annex, green-gold fence, two-line name wall, and layered
pale-lime minaret. The landmark therefore follows the footprint yaw of
`-0.2184` radians without the former 180-degree front/back flip.

The Pendopo model replaces OSM building index `2225` and anchors its accessible
delivery point at the Jalan Kartini entrance. Its frontage and proportions were
surveyed from the Google Street View 360 panorama at
`-7.7075614, 114.0055641`, panorama `gHIAR9-7DNO6HM9zetIQZg`, facing `168.43°`
and rechecked on August 19, 2026. Flags and palms move with the wind,
visitors circulate along the forecourt, and pavilion lights breathe subtly;
reduced-motion preferences restrain all activity.

The hand-built landmark art remains, while the former decorative road/building
grid is retired at runtime. No Google imagery or third-party 3D meshes are
bundled. Base map data is © OpenStreetMap contributors and licensed under ODbL.

## Run Locally

```bash
npm install
npm run dev
```

## Build

Build from this folder to generate the static game files:

```bash
npm run build
```

The Vite output is written to `dist/`. GitHub Actions copies that output into the Pages artifact at `/game/` during deployment.

## Refresh and verify map data

The committed map snapshot is self-contained, so normal builds do not depend on
an external map service. To deliberately refresh it from tiled Overpass queries:

```bash
npm run map:refresh
npm run map:validate
```

The validator checks the exact 1 km extent, restricted-zone metadata,
source/rendered building parity, semantic-place coverage, coordinate precision,
and that roads, waterways, railways, and bridges remain inside the survey circle.
Its automatic Alun-Alun junction pass also samples all four vehicle routes,
opposing vehicle envelopes, the three pedestrian approaches, building/median
clearance, and the complete zebra-to-curb-to-refuge connection.

## Controls

- `WASD` / arrow keys: choose a walking direction relative to the camera
- Drag anywhere on the scene: use the floating movement control
- `Space` or the stop button: stop immediately

The character keeps moving while turning toward the selected screen direction. The
camera looks ahead toward the character's front and eases behind them during movement,
then finishes recentering after release. Obstacle contacts slide along their boundary
instead of stopping all movement.
