---
name: creating-mobile-responsive-ui
description: Creates mobile-first responsive UI components using Tailwind CSS with proper breakpoints, touch targets, and flexible layouts. Use when building new UI components, fixing mobile layout issues, or ensuring responsive design.
---

# Creating Mobile-Responsive UI

## Mobile-First Pattern

**Design for mobile first, then enhance for larger screens.**

```tsx
// ✓ Mobile-first (correct)
<div className="px-2 gap-2 md:px-4 md:gap-4 lg:px-6">

// ✗ Desktop-first (wrong)
<div className="px-6 gap-4 sm:px-2 sm:gap-2">
```

## Responsive Patterns

### Container Spacing
```tsx
<div className="px-1 gap-1 md:px-4 md:gap-2">
  {/* Tight spacing on mobile, comfortable on desktop */}
</div>
```

### Text Sizing
```tsx
<h1 className="text-xl md:text-2xl lg:text-3xl">
<p className="text-sm md:text-base">
<span className="text-xs md:text-sm">
```

### Component Sizing
```tsx
<div className="w-8 h-8 md:w-12 md:h-12">
  {/* Smaller on mobile */}
</div>

<Button className="h-10 md:h-12 px-3 md:px-4">
  {/* Touch-friendly on mobile */}
</Button>
```

### Grid Layouts
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

### Flex Direction
```tsx
<div className="flex flex-col md:flex-row gap-2">
  {/* Stacked on mobile, horizontal on desktop */}
</div>
```

## Icon Alignment Fix

For navigation menus with icons and potentially wrapping text:

```tsx
// ✓ Icons stay aligned
<div className="pt-2 pb-1">
  <Icon className="flex-shrink-0" />  {/* Prevents distortion */}
  <span className="h-8 flex items-center">  {/* Fixed height */}
    Label that might wrap to multiple lines
  </span>
</div>

// ✗ Icons misalign
<div className="py-2 justify-center">
  <Icon />
  <span>Label</span>
</div>
```

## Touch Targets

**Minimum size: 44×44px for touch targets**

```tsx
// ✓ Touch-friendly
<button className="min-h-[44px] min-w-[44px] p-2">

// ✗ Too small
<button className="p-1">
```

## Scrollable Timelines

```tsx
<div className="flex gap-1 overflow-x-auto">
  {timeline.map(item => (
    <div key={item.id} className="flex-shrink-0 w-12">
      {/* Horizontal scroll on mobile */}
    </div>
  ))}
</div>
```

## Responsive Images

```tsx
<img
  src="/image.jpg"
  className="w-full h-auto md:w-1/2"
  alt="Description"
/>
```

## Breakpoints Reference

| Breakpoint | Size | Device |
|------------|------|--------|
| (default) | < 640px | Mobile |
| sm | ≥ 640px | Large mobile |
| md | ≥ 768px | Tablet |
| lg | ≥ 1024px | Desktop |
| xl | ≥ 1280px | Large desktop |
| 2xl | ≥ 1536px | Extra large |

## Common Responsive Utilities

```tsx
// Show/Hide
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>

// Spacing
className="mt-2 md:mt-4 lg:mt-6"

// Width
className="w-full md:w-1/2 lg:w-1/3"

// Padding
className="p-2 md:p-4 lg:p-6"
```

## Testing Responsive Design

### Chrome DevTools
1. Open DevTools (F12)
2. Click "Toggle device toolbar" (Cmd+Shift+M)
3. Test different screen sizes:
   - iPhone SE (375×667)
   - iPhone 12 Pro (390×844)
   - iPad (768×1024)
   - Desktop (1920×1080)

### Test Checklist
- [ ] Mobile (< 640px) layout works
- [ ] Tablet (768px) layout works
- [ ] Desktop (1024px+) layout works
- [ ] Text is readable on all sizes
- [ ] Buttons are touch-friendly (44×44px min)
- [ ] No horizontal scroll (unless intentional)
- [ ] Images don't overflow
- [ ] Navigation works on all sizes
