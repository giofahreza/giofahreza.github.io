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
- Masjid Agung Al-Abror with its road-aligned frontage and separately skewed
  two-storey prayer hall, tall mosaic-framed central arch, patterned side
  towers, broad eight-petal rear roof crown, glazed aqua-roof annex,
  ornamental fence, and open-lantern minaret
- The six exact OSM footprints immediately south of Al-Abror, rebuilt as the
  lime checker-dome annex, colonial veranda house, official residence, and
  three low service ranges behind their real white-and-purple boundary
- Pendopo Aryo Situbondo with its roadside stone name wall and candi-bentar
  gates, deep-set terracotta joglo pavilion, permanent carved-timber interior,
  connected rear roof complex, and separately mapped side offices and shelter
- The immediate building ring, including the full Rutan Kelas IIB compound,
  Kwarcab Pramuka office and fence, and the Suzuki-VIAR corner workshop
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
The September 29, 2026 north-frontage comparison reopens that panorama at
`345°` (Post Office detail), `0°` and `25°` (Planet Ban), plus
`uKDUcjdywcZGFGHRjXXZNw` at `330°`. The Post Office now has divided window
sashes, the correct window/entrance distinction, a smaller framed sign, a
perpendicular white postal sign, and muted clay-roof tones. Planet Ban has
taller open upper bays, pale outer/red inner piers, a shallow corrugated cover,
paired side vents, fine balcony cross-lines, and tyre displays placed visibly
inside the service frontage rather than hidden inside the shell. These are
image-based proportions, not surveyed elevations. The orange east postal
canopy still needs a footprint partition review before it can safely be added.
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
The September 30 setback audit corrected the booth's north anchor from 23.55
to 17.55 local units: the previous fence-only correction left the booth about
32 m behind the sidewalk. Its fence retains the same world position, and the
booth's collision uses the same exported placement as its render. This is an
image-based correction of the excessive yard, not a surveyed location: its
east station and dimensions still need further triangulation. The postal main
building and west wing are not moved, since their mapped footprints do not
support a blanket shift toward the diagonal sidewalk.
The same official panorama `uKDUcjdywcZGFGHRjXXZNw` at headings `315°`,
`330°`, and `345°` establishes that the former generic public-service block is
the Post Office west service wing: an open paved motorcycle yard, long shallow
gray corrugated canopy on thin dark posts, cream service wall, yellow
information banner, open red-white gates, and layered dark-terracotta,
faded-gray, and red-tile roofs with a small front dormer.
Official panorama `NZ0JkC8RxyW3E0Zbjv-6Vw` at headings `210°` through `300°`
establishes the east-facing SD Islam Al-Abror compound west of the square. It
replaces OSM building `2226` with the teal-and-orange two-storey classroom
frontage, shallow teal entrance marquee and school lettering, projecting
glazed upper entrance pavilion with its pitched red roof and pale brackets,
upper balcony and red-tile rear roof, north teal gable annex, and the cream,
gold, green, and dark-stone boundary fence visible from the roadside sphere.
The tall lime element to the left belongs to the mosque minaret; the school
does not duplicate it as a stair tower. The `245°` and `270°` views guide the
entrance-pavilion and fascia proportions, rather than surveyed elevations.
Fine clipped diamond mesh, small open gold diamonds, and slender balcony bars
replace the oversized X braces, solid fence medallions, and coarse railing.
Official panorama `xmX33FzrGEYDJJKhw59WYA` at headings `140°` through `215°`
establishes the Dinas Perpustakaan dan Kearsipan compound on Jl. Kartini south
of the square. It replaces OSM building `13` with the low terracotta-tiled
front office and scalloped veranda, central black name wall and raised agency
lettering, open gray-roof pendopo pavilion, west pale gable wing, small
green-roof gate booth, layered rear reading-hall roofs, and white metal fence
on dark-stone bases. The panorama captures remain development evidence only
and are not bundled with the game.
The close library view at `195°` resolves the roadside plaque as three name
lines (DINAS PERPUSTAKAAN / DAN / KEARSIPAN), with the address below, distinct
from the two-line raised lettering. The fence and small booth use fine metal
bars rather than thick outlined pickets.
Official panorama `L139DDJA3qEuqHCUkm1Szg` at headings `155°` through `205°`
establishes Warung Pojok Hj. Nurul at the Jl. A. Jakfar and Jl. Cendrawasih
corner southeast of the square. It replaces OSM building `169` with the
one-storey white dining room, dark red timber storefront, three broad glazed
bays, raised weathered relief wall, blue `WARUNG POJOK / Pilih Indonesia`
corner sign, yellow-red side sign, green-and-cream corrugated wraparound
awning, and the lower weathered rear mural wing contained by the same mapped
footprint. The Street View and satellite captures remain development evidence
only and are not bundled with the game.
The southeast junction monument remains a provisional architectural model,
not a verified reproduction of the real tugu. Its center now balances the
southwest, southeast and northeast curb returns of the existing junction core,
at local north/east `[-16.1197820061, 23.5509327319]`. This moves it 2.05 m south
and 13.43 m east from the former arm-axis intersection, which left only 3.38 m
center-to-curb clearance at the southwest corner. The three core clearances
are now 13.83 m each. This is game-layout centering, not a direct monument
survey; the road-layout reference remains independent and unchanged. The September
30 geometry correction grounds its island base on the road, closes the gap
under the inner island surface, and turns the perimeter blocks along the
ellipse tangent within the existing collision envelope. The road layout,
sidewalks and architectural silhouette are unchanged.
The three terminal waypoints of each north/south vehicle route move 3 m west
locally to clear the newly centered island; all other route points and signals
remain unchanged. The placement regression measures the three curb clearances
instead of forcing the monument onto the road-axis intersection.
`node scripts/validate-southeast-monument.mjs` checks the actual rendered
vertices, grounding, tangent alignment and top height; these checks do not
establish real-world architectural fidelity.
Close views at `175°` and `198°` resolve its pale parapet as a regular grid of
shallow square four-facet relief panels across both visible faces, not isolated
diamond and circular ornaments.
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
`245°` through `300°` and rechecked on September 20, 2026, confirms that the public facade and
forecourt face the east-side road. Its daylight and oblique views anchor the
two-storey bay hierarchy, narrow mosaic-framed central tower, arched circular-
transom windows, separate Arabic friezes, full-width entrance canopy, patterned
corner caps, glazed aqua-roof annex, green-gold fine-mesh fence, pedestrian
gate, near-black continuous two-line name wall, `POS JAGA` booth, and narrow
open-lantern minaret. The
roadside forecourt and boundary remain at the mapped `0.199`-radian frontage
bearing, while only the deeper prayer hall rotates `-0.4174` radians relative
to it, giving the hall its surveyed `-0.2184`-radian bearing. Satellite roof
evidence establishes the hall's broad, shallow eight-petal rear crown instead
of the former small onion dome.
The central amber insert and four paired-window inserts use fine clipped
bronze diamond mesh, matching the `245°`/`270°` views, rather than ladder-like
horizontal bars. Narrow sandstone-framed slit windows include pale reveals.
The September 29, 2026 comparison at `270°`, cross-checked at `245°`, adds
slender dark-glazed entrance leaves and brass-colored heads/stiles inside the
existing central doorway reveal; their proportions are image-based estimates.

The six mapped buildings directly south of Al-Abror retain the exact OSM
collision polygons for indices `84`, `90`, `98`, `104`, `105`, and `121` while
their generic extrusions are replaced by separate observed structures.
Panoramas `SkWE6Saif9zE8EQES2B_ow` at `270°`,
`WyqFlPVrMhuz_-Tt_10Pzg` at `235°`–`270°`,
`tEAG1CqbUigI685lORpXlA` at `265°`,
`Rsuu1FY7kB-O-rpgeV9p6Q` at `270°`, and
`PnbPCGVejxbfQVB2PVsRLA` at `80°` establish the lime-green checker-dome annex,
weathered colonial veranda house, L-shaped official residence with its shallow
gable porch and single no-vending board, two pale service ranges, rear
dark-tile range, dense white-and-purple spear fence, and western security wall.
The lime annex is a distinct building south of the mosque rather than an
invented Al-Abror wing, and its yellow-black gate remains visibly separate
from the white property fence.

The September 28, 2026 detail pass rechecked the annex against
`SkWE6Saif9zE8EQES2B_ow` at `270°`. Its checker pattern is now painted onto a
continuous dome using a procedural canvas texture, rather than floating tile
meshes. The three scalloped frieze panels contain clipped diagonal lattice;
unsupported oversized X ornaments were removed. The widened yellow-black
gate and Al-Abror's green-gold fence use mesh strands bounded by their frames.
No photographic texture is included.

The follow-up street comparison places the colonial house attic gable and
three-pane window left of the veranda center. The residence has a scalloped
porch fascia over a shaded recess and a fine two-column diamond vent strip.
The residence sphere at `265°` also resolves its double gate as one continuous
arched crown across the center seam, with pointed bars, shaped pale inserts,
and a purple band; the former independent peaks and X braces were removed.

The September 29, 2026 close comparison of the colonial house at `245°` in
`WyqFlPVrMhuz_-Tt_10Pzg` resolves vertical timber boarding within its attic
triangle. A shallow timber infill, clipped vertical board seams, and pale rake
trims now replace the plain white triangle without changing the roof outline
or collision footprint. Google reference images remain development evidence,
not runtime assets.

The Pendopo model replaces OSM building index `2225` and anchors its accessible
delivery point at the Jalan Kartini entrance. Its frontage and proportions were
surveyed from the Google Street View 360 panorama at
`-7.7075614, 114.0055641`, panorama `gHIAR9-7DNO6HM9zetIQZg`, facing `168.43°`
with both side gates checked around `130°` and `210°`, and rechecked on
September 20, 2026. The entrance sign remains at the road while the main
pavilion sits roughly 32 m deeper in the grounds at its satellite-measured
position. Its permanent interior follows Google gallery photo
`CIABIhARZXWMdN1oG602ThNTJ8Kg`: honey-toned carved timber columns, stepped
white ceiling and dark beams, multi-globe chandelier, and rear slatted stage,
without the temporary red-white ceremony cloth seen in an older event sphere.
The September 28 detail pass also reconciles column capitals and stage
details with the lowered ceiling. The rear connector wall is recessed behind
the stage backdrop, retaining its exposed western cheek, roof, foundation,
and navigation footprint so it no longer hides the slats and portrait frames.
The model also includes the connected long rear roof complex and its shaded
windowed verandas, both red-brick candi-bentar gate pairs, the detached west
office (OSM `2227`), open motorcycle shelter (OSM `2231`), and detached east
office (OSM `2232`) instead of fictional attached wings. The September 29
comparison at `130°` and `141°` corrects the east office's shaded veranda:
recessed openings, four balanced posts on stone feet, and two pale pierced
railing bays around an open central entrance. Porch dimensions remain
image-relative estimates; its roof and navigation footprint are unchanged.
Flags and palms move
with the wind, visitors circulate along the forecourt, and pavilion lights
breathe subtly; reduced-motion preferences restrain all activity.
The close road view at `234°` resolves the brick entrance crowns as flat caps
above flared cornices, not pointed cones. Each pair mirrors its stepped tiers
toward its own driveway; this correction does not move the gate footprints.
Current road spheres `aL9ykTk0BBhGlQDk6rBKOg`,
`4dWZv1P7I4T4mafxTzsQsw`, and `OQvvBDs3QrZWK0C2Uk6HEQ`, cross-checked against
satellite coverage, resolve OSM `2229`, `2230`, and `2233` as stale 2015
footprints on present-day lawn, path, and courtyard. Their generic meshes and
collisions are suppressed without inventing replacement buildings; the real
connected structure behind them remains part of OSM `2225`'s rear complex.

Rutan Kelas IIB Situbondo replaces OSM building index `2` while retaining that
building's exact mapped polygon for navigation. Google Street View panoramas
`bZjDa1lCYPoHpaIchD97UQ` around `90°`–`105°`,
`uBW81RMam4M8s5SyT7Z9BA` around `90°`, and
`QybYaip5P2NJmRyJuhkXtQ` around `90°` establish the two-storey gray
administration frontage, central gable and emblem, arched barred windows, long
dark canopy, black-and-gold institutional wall, green roadside fence and
gates, north clay-tile ranges, guarded service entrance, inner exercise court,
and secure rear compound walls.
The west-front detail sphere resolves eight upper arched windows (four each
side), white transom/cross rails, and a small triangular louvered gable vent.
The gable trim is formed by two sloping bars, not a solid wedge that conceals
the gable face and its detailing.
The small crest sits below the triangular vent with a clear gap; its previous
oversized ring overlapped the louvers. Roof massing is unchanged.

Kwartir Cabang Gerakan Pramuka Situbondo replaces OSM building index `14` and
keeps the exact mapped collision polygon. Panorama
`xmX33FzrGEYDJJKhw59WYA` at headings `210°`–`240°` establishes its weathered
red-tile ranges, plain pale front range, numbered address pier, and pale-green
entry gate. The ornate grey-roofed porch and purple-band fence seen toward
`270°` belong to the neighbouring OSM `84` residence. The September 28 follow-up
removed their misattributed duplicate from the Pramuka model. The model
remains separated from Dinas Perpustakaan; the earlier library-side mass that
occupied this footprint has been removed.

The Suzuki-VIAR corner workshop replaces OSM building index `50` and retains
its irregular eight-point OSM footprint for collision. Panorama
`L139DDJA3qEuqHCUkm1Szg` at headings `230°`–`250°` establishes the separate
dark VIAR service opening, a narrow horizontal roller shutter, white grille with blue and
red bands, recessed stepped entrance, wide right shutter, low gray roof and
red parapet, plus the portrait `SUKUN / SPECIAL NEW` rooftop board. It does not
use the invented glass showroom or oversized Suzuki wordmark from the earlier
placeholder.
The close view at `251°` also resolves the white/red VIAR panel beside its blue
header section and continuous ribs across the painted blue/red grille bands;
the latter are not solid plates attached over the grille.

All Google Street View, gallery, and satellite captures named above are used
only as development evidence. No Google imagery is loaded or bundled by the
game runtime.

The hand-built landmark art remains, while the former decorative road/building
grid is retired at runtime. No Google imagery or third-party 3D meshes are
bundled. Base map data is © OpenStreetMap contributors and licensed under ODbL.

## Run Locally

```bash
npm install
npm run dev
```

Run uses the normal `1.64` world-units-per-second preset by default. After an
authenticated Dev Mode session is opened with `?dev=1`, the dev toolbar can
switch Run between **Normal** and the `6.4` fast traversal preset. Dev links can
also request the fast preset with `?dev=1&runSpeed=fast`; the option is ignored
outside authenticated Dev Mode.

## Build

Build from this folder to generate the static game files:

```bash
npm run build
```

The Vite output is written to `dist/`. GitHub Actions copies that output into the Pages artifact at `/game/` during deployment.

Check the school, Warung Pojok, Al-Abror, Pendopo, Post Office, Planet Ban,
and northeast shop frontage constructors and geometry batching:

```bash
npm run buildings:validate
```

This exercises the actual model factories without WebGL, checking finite geometry,
attribute counts, triangle indices, bounds, and world transforms. Canvas sign
textures and out-of-scope vegetation/walkers are stubbed; architectural helpers
use their real geometry. Materials, signs, roof junctions, façade proportions,
and animation over time still need live visual checks.

The north-frontage fences are independent of their building setbacks. Kantor
Pos, Teras Pos, and BICAU rails/posts now follow the property-side sidewalk
polyline with their outer face 0.0002 map units (1 mm) landward. Members are
split at boundary bends so triangles cannot cut across the pavement; entrance
openings remain clear. Buildings, garden details, roads and sidewalks stay fixed.
Run `npm run buildings:fence-contact` to verify each actual fence member touches
the boundary within 1 cm, every vertex remains landward, and no triangle blocks
the Kantor Pos or BICAU entrance. This supplements, not replaces, road clearance.

Check actual elevated building geometry against the existing west/south/north
roads, pedestrian bands, and southeast/northeast junctions:

```bash
npm run buildings:clearance
```

This projects real mesh triangles (including canopies, roof edges, posts, fences,
and signs), rather than only collision boxes. It covers Al-Abror, Pendopo, the
south compound, Warung Pojok, Post Office, Planet Ban, and east-junction frontage
against the named corridor polygons in the
script. Geometry at or below 0.08 world units is excluded from this elevated
check; retain map/traffic validation for the at-grade surfaces. This is not a
claim that every building and road in the whole map has been audited.
The beige north-east shop awning and its seams are shortened at the diagonal
junction boundary; their prior tip projected over asphalt. Walls and building
anchors are unchanged.

The September 29, 2026 clearance pass aligns the south compound's white/purple
fence and warning board just behind the property-side sidewalk boundary, keeping
the observed courtyard setbacks. It trims only a residence bevel at the southwest
corner. Al-Abror's skewed entrance canopy is tapered at its road-aligned property
limit and its affected post/insets are pulled inside that limit. Warung Pojok's
awning return and support no longer extend behind its side wall into the southeast
road. Building anchors, surveyed footprints, roads, sidewalks, and navigation are
unchanged; Google 360 references remain development evidence only.

The residence-fence follow-up also checks the generated side lane (map road 59),
which is outside the custom corridor polygons. Its former southern fence bay
crossed that lane. The terminal pier is now pulled north to local north -19.82,
with that bay re-spaced and the warning board moved to -19.35. The ornate gate
and remaining fence stay intact. The clearance test includes the lane frontage's
asphalt, 0.18 m curb, and 1.45 m pedestrian band on both sides.

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
