

## Plan: Add Uploaded Images to Three Sections

### What changes will be made

1. **Hero Section** — Add the entrepreneur/Instagram insights image alongside the hero text, creating a split layout (text left, image right on desktop; stacked on mobile).

2. **How It Works Section** — Add the content creator image as a visual accent beside or above the 4-step grid.

3. **Track Order Page** — Add the professionals/analytics image as a visual element above or beside the tracking form.

### Technical details

- Copy all 3 images from `user-uploads://` to `src/assets/`
- Import images as ES6 modules in each component
- **HeroSection.tsx**: Convert to a 2-column grid layout (text + image) on `md+` screens. Image gets rounded corners and subtle shadow.
- **HowItWorks.tsx**: Add the image between the heading and the steps grid, centered with max-width constraint and rounded styling.
- **TrackPage.tsx**: Add the image above the search card as a decorative banner/visual element with rounded corners.

### Files modified
- `src/components/home/HeroSection.tsx`
- `src/components/home/HowItWorks.tsx`
- `src/pages/TrackPage.tsx`

