# Kook Chat Export - Chrome Extension

Export chat history from Kook channels using your browser session (no bot required).

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this `kookexport` folder

## Usage

1. Log in to [Kook](https://www.kook.top) in your browser
2. Navigate to the channel you want to export
3. **Click the extension icon** (green square) in Chrome toolbar
4. Click **"Export Chat History"** button
5. Wait for the export to complete (progress shown in popup)
6. Save the JSON file when prompted

## Output Format

The exported JSON file contains:

```json
{
  "channelId": "1234567890",
  "guildId": "9876543210",
  "exportTime": "2024-01-13T12:00:00.000Z",
  "messageCount": 150,
  "messages": [
    {
      "id": "...",
      "type": 1,
      "content": "Hello!",
      "author": { ... },
      "create_at": 1234567890000,
      ...
    }
  ]
}
```

## Troubleshooting

### "Could not detect channel ID"
- Make sure you're on a Kook channel page (URL contains `/channels/...`)

### "Could not find auth token"
- Make sure you're logged in to Kook
- Try refreshing the page and logging in again

### "Authentication failed"
- Your session may have expired, log in again

### Export is slow
- Large channels take time due to API rate limits
- The extension fetches 50 messages per request with a small delay

## Notes

- Messages are exported in chronological order (oldest first)
- All message types are included (text, images, files, etc.)
- Media URLs are included but files are not downloaded
