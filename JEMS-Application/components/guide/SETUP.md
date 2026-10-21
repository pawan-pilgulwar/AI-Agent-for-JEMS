# JEMS Guide Character Setup Guide

This guide explains how to set up the Spline-based animated guide character for the JEMS website.

## Overview

The `GuideCharacter` component displays an animated 2D character that:
- Appears on the bottom-right of the screen (desktop only)
- Changes messages based on scroll position
- Guides users through each section of the homepage
- Can be minimized/expanded
- Includes interactive section indicators

## Quick Start

### 1. Create Your Spline Character

1. **Go to [Spline Design](https://www.spline.design)**
2. **Create a new file** for the JEMS guide character
3. **Design your character** (2D-style 3D model):
   - Simple geometric shapes (circles, rounded rectangles)
   - Friendly proportions (big eyes, warm expressions)
   - Keep polygon count low for web performance
   - Use flat colors or simple gradients

### 2. Create Animations

In Spline, create these 6 animations:

| Animation | Duration | Usage |
|-----------|----------|-------|
| **idle** | 2-3s looped | Default state, subtle breathing/blinking |
| **welcome** | 1.5-2s | When user first arrives (hero section) |
| **pointing** | 1.5-2s | When highlighting features/sections |
| **thinking** | 2-3s looped | When explaining concepts |
| **celebrating** | 2-3s | When user reaches CTA sections |
| **waving** | 1.5-2s | When changing sections |

**Animation Tips:**
- Keep animations smooth and under 3 seconds
- Use ease-in-out timing for natural motion
- Add subtle rotation/scaling for personality
- Avoid fast/jarring movements

### 3. Export and Publish

1. **In Spline**, click "Share" → "Get Embed Code"
2. Copy the embed URL (format: `https://my.spline.design/[PROJECT-ID]`)
3. **Paste this URL** into `GuideCharacter.tsx`:

```tsx
// In GuideCharacter.tsx, line ~82
<iframe
  title="JEMS Guide Character"
  src="https://my.spline.design/[PASTE_YOUR_URL_HERE]"
  frameBorder="0"
  width="100%"
  height="100%"
/>
```

## Component Structure

```
GuideCharacter
├── Speech Bubble (contextual messages)
├── Spline Iframe (animated character)
├── Section Indicators (dot navigation)
└── Minimized Button (when collapsed)
```

## Customization

### Change Messages

Edit the `messages` object in `GuideCharacter.tsx`:

```tsx
const messages: Record<Section, SectionMessage> = {
  hero: {
    title: "Welcome to JEMS!",
    message: "Your custom message here",
    action: { text: "Next", url: "#problem" },
  },
  // ... more sections
};
```

### Adjust Scroll Thresholds

If sections don't match messages correctly, update scroll detection:

```tsx
// Line ~47 in GuideCharacter.tsx
if (scrollPos < 600) setSection("hero");
else if (scrollPos < 1400) setSection("problem");
// ... adjust these pixel values to match your sections
```

### Style the Bubble

Modify Tailwind classes in the speech bubble:

```tsx
// Line ~56 - change rounded-3xl, p-6, shadow values
<div className="bg-white rounded-3xl p-6 shadow-[...]">
```

### Change Position

Default is bottom-right. To change:

```tsx
// Line ~45 - change these classes
<div className="fixed bottom-6 right-6 z-40 w-96">
  // Change to:
  // "fixed bottom-6 left-6" for bottom-left
  // "fixed top-6 right-6" for top-right
```

## Mobile Behavior

By default, the guide character is hidden on screens smaller than 768px (tablet).

To show on mobile:
1. Remove the `isMobile` check (line ~40)
2. Adjust the width: `w-96` → `w-72` for smaller screens

```tsx
if (!isVisible) return null; // Remove: || isMobile
```

## Performance Optimization

### Lazy Loading
The iframe has `loading="lazy"` to defer loading until visible.

### File Size
- Target Spline file size: < 2MB
- Character model: < 500K
- Total bundle: Spline handles compression

### Frame Rate
Spline automatically optimizes for 60fps on desktop, 30fps on mobile.

## Troubleshooting

### Iframe not showing
- ✅ Check Spline URL is correct
- ✅ Ensure Spline project is published/shared
- ✅ Check browser console for CORS errors

### Wrong section appearing
- Update scroll thresholds in the `handleScroll` function
- Use browser DevTools to check `window.scrollY` values

### Animations not playing
- Verify animations are named in Spline UI
- Check animation duration (should be 1.5-3s)
- Spline uses frame-based timing, not CSS animations

### Mobile showing character
- Uncomment the mobile check or adjust width

### Speech bubble text overflowing
- Reduce text length in messages
- Adjust `max-w-[48ch]` class for line breaks

## Advanced Features

### Add Sound Effects

To add audio reactions:

```tsx
// In GuideCharacter.tsx
const playSound = (soundType: string) => {
  const audio = new Audio(`/sounds/${soundType}.mp3`);
  audio.play();
};

// Then call: playSound('welcome') on section change
```

### Trigger Animations from Spline

Use Spline's interaction system to trigger animations on scroll events or clicks.

### Connect to Analytics

Track guide interactions:

```tsx
const trackInteraction = (action: string) => {
  // Send to analytics
  console.log('Guide interaction:', action);
};
```

## File Size Reference

Expected performance metrics:

| Asset | Size | Notes |
|-------|------|-------|
| Component JS | ~5KB | Minified + gzipped |
| Spline Model | 500KB-2MB | Depends on complexity |
| Animations | Embedded | In Spline file |
| **Total** | ~500KB-2.5MB | One-time load |

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (with responsive sizing)

## Next Steps

1. **Create your Spline character** (10-15 min)
2. **Add 6 animations** (20-30 min)
3. **Publish and get embed URL** (2 min)
4. **Paste URL into GuideCharacter.tsx** (1 min)
5. **Test on desktop and mobile** (5 min)
6. **Customize messages** (10 min)

**Total setup time: ~1 hour**

## Support Resources

- [Spline Docs](https://docs.spline.design)
- [Spline Community](https://community.spline.design)
- [React Iframe Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)

---

Questions? Check the GuideCharacter component comments or adjust as needed!
