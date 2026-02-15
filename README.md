# AttentionGuard

**See how algorithms manipulate your feed in real-time.**

AttentionGuard is an open-source Chrome extension that reveals the hidden manipulation patterns on social media and e-commerce platforms. Watch as your feed fills with ads, algorithmic recommendations, and social signals - all tracked and visualized in real-time.

> Powered by [AgentKite](https://agentkite.com)

<p align="center">
  <img src="assets/screenshots/linkedin.png" width="250" alt="LinkedIn - 23% intentional, algorithmic breakdown showing Suggested For You, Recommended, Jobs" />
  <img src="assets/screenshots/reddit.png" width="250" alt="Reddit - 59% intentional, algorithmic breakdown showing behavioral tracking and geo-targeting" />
  <img src="assets/screenshots/youtube.png" width="250" alt="YouTube - 0% intentional, 97% algorithmically driven feed" />
</p>

<p align="center"><em>Real feed data from LinkedIn, Reddit, and YouTube. How much of your feed did you actually choose?</em></p>

## Supported Platforms

| Platform | Detection Capabilities |
|----------|----------------------|
| **Reddit** | Promoted posts, algorithmic suggestions, geo-targeting, behavioral tracking |
| **Twitter/X** | Ads, "For You" algorithm, social context (likes, retweets) |
| **Facebook** | Sponsored posts, dark patterns (FOMO, social proof, variable rewards), side ads |
| **Instagram** | Sponsored content, suggested posts, non-followed accounts |
| **LinkedIn** | Promoted content, social reactions, job recommendations, personalization |
| **YouTube** | Ads, recommended videos, Shorts, subscription vs algorithm |
| **Amazon** | Sponsored products, urgency tactics, price anchoring, coupon prompts |

## Installation

### From Chrome Web Store
*Coming soon*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `attentionguard-extension` folder

## How It Works

1. **Install the extension** - icon appears greyed out
2. **Visit a supported platform** - icon turns green, tracking begins
3. **Browse normally** - stats update in real-time as you scroll
4. **Click the icon** - see your manipulation breakdown

### What We Track

- **Ads** - Sponsored/promoted content you're paying to see
- **Algorithmic** - Content chosen by the platform's algorithm
- **Social** - Content shown because friends engaged with it
- **Organic** - Content from accounts you actually follow

## Privacy

AttentionGuard runs **100% locally** in your browser:
- No data is sent to any server
- No account required
- No tracking of your browsing
- All stats stored locally (session or persistent, your choice)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to:
- Add support for new platforms
- Improve detection patterns
- Fix bugs and improve code

### Adding a New Platform

1. Create a new file in `content-scripts/platforms/`
2. Use the core framework (`window.AttentionGuard`)
3. Define your detection patterns
4. Add the platform to `manifest.json`
5. Submit a pull request!

## Architecture

```
attentionguard-extension/
├── manifest.json              # Extension config
├── background/
│   └── service-worker.js      # Icon state, message routing
├── content-scripts/
│   ├── core/
│   │   └── attentionguard-core.js  # Shared framework
│   └── platforms/
│       ├── reddit.js
│       ├── twitter.js
│       └── ... (7 platforms)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── assets/icons/
```

## License

This project is licensed under the **GNU General Public License v3.0** - see [LICENSE](LICENSE) for details.

This means:
- You can use, modify, and distribute this software
- Any derivative works must also be open source under GPL v3
- You must include the original copyright notice

## Credits

- Created by the [AgentKite](https://agentkite.com) team
- Inspired by the need for transparency in algorithmic feeds
- Built with contributions from the open-source community

## Links

- [GitHub Repository](https://github.com/agentkite/attentionguard)
- [Report Issues](https://github.com/agentkite/attentionguard/issues)
- [AgentKite](https://agentkite.com)

---

**Remember:** The first step to reclaiming your attention is understanding how it's being captured.
