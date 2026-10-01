# Where to put images

Drop files in below — the site picks them up automatically, no code
changes needed. If a file isn't there, the site quietly falls back to
the current placeholder (no broken-image icons).

## Hero background
`images/hero/hero-bg.jpg`
One wide landscape photo (Dubai skyline, a listed property, whatever
fits the brand). Recommended: 1920x1080 or larger, under ~500KB
(compress it — this loads on every visit to the homepage).

## Property photos
`images/properties/p1.jpg` through `images/properties/p6.jpg`
Each filename matches a property's id in `js/main.js` (search for
`PROPERTIES` near the top of the file to see which id is which
listing). Recommended: 4:3 ratio (e.g. 1200x900), under ~300KB each.

Adding a 7th+ property later: add a new entry to the `PROPERTIES`
array in js/main.js with a new id (e.g. "p7"), then drop
`images/properties/p7.jpg` here.

## Logo
`images/logo/` — reserved for when you have the real vector logo.
Not wired up yet since the header currently renders "SOMARA" as text.
Once you have an SVG or PNG logo, tell me and I'll swap the header/
footer over to it in a couple of minutes.

## Instagram strip
`images/instagram/` — reserved for the three-image grid on the
homepage (currently a plain placeholder pattern). Same deal — drop
three images in and tell me, and I'll wire them up.
