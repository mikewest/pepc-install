User-Initiated Installation of a Web Application
===============================

A Problem
---------

Today, the process of initiating an installation flow is fragmented; each user agent has
created a set of entry points, some more discoverable and intuitive than others.

The Proposal
----------

A declarative `<install>` element  that renders a button whose content and presentation is controlled by the user agent. The user agent's control over (and therefore _understanding of_) the element's content means that it can make plausible assumptions about a user's contextual intent. Users who click on a button labeled "Install 'Wonderful Application'" are unlikely to be surprised if an installation prompt for exactly that application appears, and they'll be primed to make a good decision about the question such a prompt presents.

## The Design - v1, simple button

### Element content

The element will render standardized text and iconography controlled by the user agent, such as:

<img alt='A button whose text reads "Install", with an icon signifying the action of installation.' src='./install-icon.png' width=200>

```html
<install>
  [Fallback content goes here.]
</install>
```

### Attributes

Some events to handle successful install and user aborting the install dialog.

### Behavior

On click, the user agent can initial the user agent's existing installation flow.

![An installation prompt for `YouTube Music`.](./dialog-ytmusic.png)

### Why is a simple button sufficient?

The initial design is deliberately simple, as the primary goal is to gather usage data -- How useful do web developers find a declarative installation method, given certain style restrictions? 

At the same time, we also believe the simple button is a sufficient signal of user intent. The original premise of PEPC is that a standardized label and icon signal a user's intent to perform a permission-related action. In this case, the user indicates their intent to install content by clicking on the element, and then the user agent can present more detailed information for evaluation and final confirmation.

We see value in including app-specific text and iconography, and potentially skipping the secondary confirmation UI entirely, but this introduces a variety of concerns. To avoid scope creep, this has been moved to [Future Work](#custom-information-in-button), where it can be addressed while we're gathering feedback on the element's overall shape.

It's worth noting that the button's exact rendering may eventually be useful ambiguity from a standards perspective. It would allow each user agent to decide what information they need, and how to address the above concerns.

### Fallback content

If the user agent doesn't support installation, present a simple link:

<img alt='A hyperlink reading "Launch YouTube Music".' src='./install-not-supported.png'>

```html
  <install>
    To install and app, do X and Y in the brower's UI!
  </install>
```

### What if the app is already installed?

The element can transform into a simple 'Launch'-style button, a highly requested feature from web developers. However, we must ensure developers cannot detect the change in the element's content to avoid fingerprinting concerns. This means being careful about side channels, particularly width.

<img alt='A button whose text reads "Launch YouTube Music, from music.youtube.com", with an icon signifying the action of launching.' src='./launch-simple.png' width=200>


Please give me some IDL and technical detail!
--------------------------------------------------

Ok. Here you go:

```
[Exposed=Window]
interface HTMLInstallElement : HTMLElement {
  [HTMLConstructor] constructor();
  // events to handle successful install and user aborting the install dialog
};
```

Open Questions
--------------


Security & Privacy
------------------

* We don't generally consider the act of installation to be a security boundary today, though there
  are capabilities that we only offer to installed applications (often around integration with the
  native OS, ranging from `file_handlers` to homescreen icons), and some forms of friction that
  some user agents reduce when applications are installed (notifications, badging, etc). It seems
  likely to me that an imperative version of this capability will create some of the same incentives
  for abuse that we've seen with notifications, which suggests that raising the bar for triggering
  an installation prompt might be reasonable. This proposal does so in a way that seems to provide
  additional confidence that the user actually wants to install something, and does so in a way that
  seems relatively lightweight.

* Cross-origin installation requires us to talk about one origin in the context of another. This is
  somewhat difficult to do effectively.

* The user-facing benefits claimed above depend entirely on the truth of the claim that users do see
  and understand the element's representation. This means both that user agents need to do
  appropriate research to ensure the pixels they present in the element are in fact reasonably
  comprehensible, _and_ evaluate their installation flows to ensure that they set user expectations
  correctly.

* Sites which wish to ensure that users can only install their applications from their own origin
  can do so by examining Fetch Metadata headers in the incoming request for a given manifest and
  handle things appropriately in the case that `Sec-Fetch-Dest` is `manifest`, but `Sec-Fetch-Site`
  is not `same-origin`.

### Risks of the imperative API

Security and privacy concerns were raised that `navigator.install` makes it easier to push installation prompts out to users, and risks creating new opportunities for annoyance or abuse. The imperative proposal recognizes this risk, [suggesting][spam] [transient activation][click] and explicit delegation as requirements. These are
potentially helpful, but don't actually do much to ensure that users are neither surprised,
confused, nor annoyed by prompts when they appear. Top-level navigation is not a substantial
barrier, and clicks of any sort can be intercepted for the API's purpose, regardless of what the
user thinks they're clicking on.

While it's certainly possible to layer other heuristics on top of the transient activation
requirement to mitigate abuse (rate limits, crowd-sourced judgements, etc), it seems advisable to
avoid the risk in the first place by shifting to a model that requires a stronger signal of user
intent.

[api]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer.md
[spam]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer-current-doc.md#preventing-installation-prompt-spamming-from-third-parties
[click]: https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event

### What if this is an app for a [Donaudampfschifffahrtsgesellschaftskapitän][german]?

User agents will need to consider how to handle very long words, including appropriate resizing, eliding, and truncation logic (similar to what the installation dialog already implements). User agents should apply the same considerations they use [elsewhere][url-display] for displaying origins and names.

[german]: https://en.wiktionary.org/wiki/Donaudampfschifffahrtsgesellschaftskapit%C3%A4n
[url-display]: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/security/url_display_guidelines/url_display_guidelines.md


Alternatives
------------
* The Install API
* Given that the behavior discussed above would support both installation and launching, depending
  on the application's installed state, some more generic name might be appropriate. `<pwa>` or
  `<webapp>` could more broadly describe a potential range of behavior. I prefer `<install>`, as
  launching seems like it's really just a privacy-preserving mechanism to align behavior without
  revealing installation state, but another broader name could certainly be preferable.

[rel]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer-current-doc.md#declarative-install
