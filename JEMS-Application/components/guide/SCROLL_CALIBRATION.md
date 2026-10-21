# 📏 Scroll Threshold Calibration Guide

## What Are Scroll Thresholds?

Scroll thresholds determine which section message is shown based on how far down the page the user has scrolled. Each threshold is a pixel value (`scrollY`).

## Current Configuration

```tsx
// In GuideCharacter.tsx, lines 47-54
if (scrollPos < 600) setSection("hero");
else if (scrollPos < 1400) setSection("problem");
else if (scrollPos < 2400) setSection("how-it-works");
else if (scrollPos < 3400) setSection("features");
else if (scrollPos < 4400) setSection("innovation");
else setSection("impact");
```

## Visual Timeline

```
Scroll Pos 0px
  ├─ HERO (0-600px)
  │  Welcome message, intro CTA
  │
Scroll Pos 600px ─────────────────────
  ├─ PROBLEM (600-1400px)
  │  Problem explanation, link to solution
  │
Scroll Pos 1400px ──────────────────────
  ├─ HOW IT WORKS (1400-2400px)
  │  7-step process explanation
  │
Scroll Pos 2400px ──────────────────────
  ├─ FEATURES (2400-3400px)
  │  5 core features showcase
  │
Scroll Pos 3400px ──────────────────────
  ├─ INNOVATION (3400-4400px)
  │  6 innovation points
  │
Scroll Pos 4400px ──────────────────────
  └─ IMPACT (4400px+)
     Institutional value message
```

## How to Calibrate

### Step 1: Measure Section Positions

Open browser DevTools and check each section's scroll position:

```javascript
// In browser console:
// Scroll to start of each section, then run:
console.log("Scroll position:", window.scrollY);
```

Or measure section heights:

```javascript
// Find approximate start of each section
const hero = document.querySelector("#main");           // 0px
const problem = document.querySelector("#problem");    // ~600px
const howItWorks = document.querySelector("#how-it-works"); // ~1400px
const features = document.querySelector("#features");  // ~2400px
const innovation = document.querySelector("#innovation"); // ~3400px
const impact = document.querySelector("#impact");      // ~4400px

// Log their positions
console.log("Hero:", hero?.offsetTop);
console.log("Problem:", problem?.offsetTop);
// ... etc
```

### Step 2: Find Section Midpoints

The best threshold is approximately **midway through each section** so the message appears when the user is viewing that section.

**Formula:**
```
Threshold = (Section Start + Section End) / 2
```

Example:
- Hero: 0px - 800px → Threshold: 400px (but use 600px to show problem early)
- Problem: 800px - 1400px → Threshold: 1100px
- How It Works: 1400px - 2400px → Threshold: 1900px

### Step 3: Update Thresholds

Replace the values in `GuideCharacter.tsx`:

```tsx
useEffect(() => {
  const handleScroll = () => {
    const scrollPos = window.scrollY;

    if (scrollPos < 600) setSection("hero");          // ← Update this
    else if (scrollPos < 1400) setSection("problem");   // ← Update this
    else if (scrollPos < 2400) setSection("how-it-works"); // ← And this
    else if (scrollPos < 3400) setSection("features");  // ← And this
    else if (scrollPos < 4400) setSection("innovation"); // ← And this
    else setSection("impact");
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

### Step 4: Test

1. **Scroll through the page** and verify messages appear at the right time
2. **Adjust thresholds** if messages appear too early/late
3. **Check each section** - message should appear before user leaves that section

## Section Heights Reference

Typical section heights (may vary):

| Section | Height | Scroll Range | Threshold |
|---------|--------|--------------|-----------|
| Navbar | 64px | 0-64px | N/A |
| Hero | 600px | 64-664px | 300-400px |
| Problem | 600px | 664-1264px | 900px |
| How It Works | 800px | 1264-2064px | 1600px |
| Features | 800px | 2064-2864px | 2400px |
| Innovation | 800px | 2864-3664px | 3200px |
| Institutional Impact | 900px | 3664-4564px | 4000px |
| Social Proof | 600px | 4564-5164px | 4800px |
| Companies | 500px | 5164-5664px | 5400px |
| Pricing | 800px | 5664-6464px | 6000px |
| Final CTA | 400px | 6464-6864px | 6600px |

## Debug Mode

Add this temporary code to see real-time scroll position:

```tsx
// In GuideCharacter.tsx, add to component
const [debugScroll, setDebugScroll] = useState(0);

useEffect(() => {
  const handleDebug = () => setDebugScroll(Math.round(window.scrollY));
  window.addEventListener("scroll", handleDebug);
  return () => window.removeEventListener("scroll", handleDebug);
}, []);

// In JSX, add this (remove after calibration):
return (
  <div>
    {/* Debug info - REMOVE AFTER CALIBRATION */}
    <div className="fixed top-20 left-4 bg-black text-white px-4 py-2 rounded z-50 text-sm">
      Scroll Y: {debugScroll}px | Section: {section}
    </div>
    
    {/* ... rest of component ... */}
  </div>
);
```

Now scroll through the page and note when each section should change. Update thresholds accordingly.

## Example Calibration

**Before:**
```tsx
if (scrollPos < 600) setSection("hero");
else if (scrollPos < 1400) setSection("problem");
else if (scrollPos < 2400) setSection("how-it-works");
```

**Testing:** User scrolls, and "how-it-works" message appears too late (at 2400px instead of 2000px)

**After:**
```tsx
if (scrollPos < 600) setSection("hero");        // No change
else if (scrollPos < 1400) setSection("problem"); // No change
else if (scrollPos < 2000) setSection("how-it-works"); // Moved earlier
```

## Pro Tips

1. **Start from bottom**: Begin by setting all thresholds to `999999` (show "impact" for everyone), then work backwards
2. **Use increments of 100**: Makes adjustment easier to track
3. **Test on different screen sizes**: Desktop, tablet, mobile may have different section heights
4. **Account for navbar height**: If navbar is fixed, adjust initial offset by navbar height
5. **Add 50px buffer**: Add a small buffer before section ends to avoid rapid switching

## Mobile Calibration

If you enable the guide on mobile (`isMobile` check removed), you may need different thresholds:

```tsx
const isMobile = window.innerWidth < 768;
const thresholds = isMobile 
  ? { h: 300, p: 900, h2w: 1500, f: 2300, i: 3100 }  // Mobile
  : { h: 600, p: 1400, h2w: 2400, f: 3400, i: 4400 }; // Desktop

if (scrollPos < thresholds.h) setSection("hero");
else if (scrollPos < thresholds.p) setSection("problem");
// ... etc
```

## Automated Calibration

For automatic calibration, use this function:

```tsx
function autoCalibrateSections() {
  const sections = {
    hero: document.querySelector("#main"),
    problem: document.querySelector("#problem"),
    "how-it-works": document.querySelector("#how-it-works"),
    features: document.querySelector("#features"),
    innovation: document.querySelector("#innovation"),
    impact: document.querySelector("#impact"),
  };

  const thresholds = {};
  Object.entries(sections).forEach(([name, el]) => {
    if (el) {
      const top = el.offsetTop;
      const height = el.offsetHeight;
      thresholds[name] = top + (height / 2); // Midpoint
    }
  });

  console.log("Calibrated thresholds:", thresholds);
  return thresholds;
}

// Run in console: autoCalibrateSections()
```

## Troubleshooting

### Message appears too late
→ Lower the threshold value

### Message appears too early
→ Raise the threshold value

### Message flickers between sections
→ Sections might be too short, increase threshold gap

### Message never appears for a section
→ Check console for scroll position, verify threshold is set

### Same message shows across multiple sections
→ Thresholds might be overlapping, check your `if/else` logic

## Final Checklist

- [ ] Measured all section positions
- [ ] Calculated appropriate thresholds
- [ ] Updated GuideCharacter.tsx
- [ ] Tested scroll behavior
- [ ] Verified messages appear in right sections
- [ ] Checked mobile (if enabled)
- [ ] Removed debug code
- [ ] Verified performance (no lag)

---

**Calibration is complete when** each message appears right before or at the start of its corresponding section, and disappears when scrolling to the next section.

Need more precision? Check out the debug mode above and adjust in real-time! 🎯
