# Opera Studio Chat

A sophisticated chat interface with advanced scroll positioning logic to prevent visual flashing and jumping.

## Features

- Real-time streaming chat interface
- Advanced scroll positioning to prevent visual artifacts
- Short response detection and dynamic spacer adjustment
- Smooth message positioning for both short and long conversations
- Copy and retry functionality for messages

## Critical Documentation

### ⚠️ Scroll Positioning Logic

This project implements complex scroll positioning logic to ensure smooth, flash-free message rendering. **Before making any changes to scroll-related code, please read:**

- **[SCROLL_POSITIONING_LOGIC.md](./SCROLL_POSITIONING_LOGIC.md)** - Comprehensive documentation of the scroll positioning system
- **[PERFORMANCE_AUDIT.md](./PERFORMANCE_AUDIT.md)** - Performance instrumentation details

### Key Components

- `components/chat/enhanced-chat-interface.tsx` - Main chat interface with scroll positioning logic
- Critical sections are marked with `⚠️ CRITICAL` comments in the code

### Important Notes

- The scroll positioning logic handles short chats (≤50% viewport) and long chats (>50% viewport) differently
- Short response detection dynamically adjusts spacing to prevent unnecessary scrolling
- All critical sections have detailed inline documentation

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Testing

When modifying scroll positioning logic, ensure you test:

- [ ] Short response in short chat: No flashing, no jumping
- [ ] Long response in short chat: No flashing, scrolls smoothly
- [ ] Short response in long chat: No jumping, spacer reduces early
- [ ] Long response in long chat: User message stays in place, no flashing
- [ ] Multiple messages: Positioning works correctly for each
- [ ] Retry functionality: Works correctly without breaking positioning

## Project Structure

```
├── components/
│   └── chat/
│       └── enhanced-chat-interface.tsx  # Main chat component
├── SCROLL_POSITIONING_LOGIC.md          # Critical scroll logic docs
├── PERFORMANCE_AUDIT.md                 # Performance docs
└── README.md                             # This file
```

## Contributing

**Before refactoring scroll positioning code:**

1. Read `SCROLL_POSITIONING_LOGIC.md`
2. Understand the difference between short and long chat behaviors
3. Test all scenarios listed in the testing checklist
4. Update documentation if behavior changes

## License

Private project - All rights reserved

