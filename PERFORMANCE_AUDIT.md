# Message Send Performance Audit

## Overview
This document describes the performance instrumentation added to track the time it takes for a user message to appear in the chat UI after clicking send or pressing Enter.

## Instrumentation Points

The following timing points are tracked:

1. **User Action** (`ChatInput.handleSend`)
   - When user clicks send button or presses Enter
   - Logged as: `[PERF] ===== USER ACTION =====`

2. **Message Handler** (`handleSendMessage`)
   - When the message handler is called
   - Logged as: `[PERF] ===== MESSAGE SEND START =====`

3. **State Update** (`setMessages`)
   - When React state is updated with the new message
   - This is when React schedules a re-render

4. **Effect Trigger** (`useEffect`)
   - When React's useEffect hook detects the new message
   - This happens after React has committed the state change

5. **Animation Frame** (`requestAnimationFrame`)
   - When the browser is ready to paint
   - This is when DOM measurements can be reliably taken

6. **DOM Element Found**
   - When the message element is found in the DOM
   - This confirms the message has been rendered

7. **Animation Start**
   - When the framer-motion animation begins
   - The message starts becoming visible

8. **Animation Complete**
   - When the animation finishes (400ms duration)
   - The message is fully visible
   - Logged as: `[PERF] ===== MESSAGE VISIBLE IN UI =====`

## How to Use

1. Open your browser's developer console
2. Send a message (click send or press Enter)
3. Look for the `[PERF]` logs in the console
4. Review the timing differences between each step

## Expected Timing Breakdown

- **0-5ms**: User action to handler call
- **5-10ms**: Handler to state update
- **10-50ms**: State update to effect trigger (React render cycle)
- **50-70ms**: Effect to animation frame
- **70-100ms**: Animation frame to DOM element found
- **100-500ms**: Animation duration (400ms)

**Total expected time: ~100-500ms** (depending on React render timing and animation)

## Potential Lag Sources

1. **React Render Batching**: React may batch state updates, causing delays
2. **Animation Duration**: The 400ms animation contributes to perceived lag
3. **Multiple requestAnimationFrame calls**: The code uses nested RAF calls which can add delay
4. **Heavy DOM calculations**: Scroll position calculations in useEffect

## Next Steps

After reviewing the console logs:
1. Identify which step has the longest delay
2. Consider optimizing that specific step
3. If animation is the main contributor, consider reducing duration or using instant appearance with a subtle animation

