User-Initiated PWA Installation
===============================

A Problem
---------

Web applications can be installed, providing users with a more reliable and integrated experience
alongside other applications they may use on a regular basis. This is generally considered to be
fantastic, providing value to both users and developers.

Today, the process of initiating an installation flow is somewhat fragmented; each user agent has
created a set of entry points, some more discoverable and intuitive than others. The
[Web Install API][api], currently in Origin Trials, aims to create a more consistent developer-facing story, providing an imperative API which allows websites to initiate an installation flow for an arbitrary application,
enabling more seamless and intuitive experiences for users.

However, an imperative API does not provide a strong signal of a user's intent to perform the action, as the only restriction is transient activation. This opens the door for potential abuse or annoyance. See [risks of the imperative API](#risks-of-the-imperative-api).

[api]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer.md

The Proposal
----------

We can provide developers with a declarative `<install>` element which renders a button whose content and presentation is controlled by the user agent. Similar to other [permission elements][pepc] (e.g. [`<geolocation>`][geolocation]), the user agent's control over (and therefore _understanding of_) the element's content means that it can make plausible assumptions about a user's contextual intent. Users who click on a button labeled "Install 'Wonderful Application'" are unlikely to be surprised if an installation prompt for exactly that application appears, and they'll be primed to make a good decision about the question such a prompt presents.

## The Design - v1, simple button

### Element content

The element will render standardized text and iconography controlled by the user agent, such as:

<img alt='A button whose text reads "Install", with an icon signifying the action of installation.' src='./install-icon.png' width=200>

```html
<install installurl="https://music.youtube.com/"
         manifestid="https://music.youtube.com/?source=pwa">
  [Fallback content goes here.]
</install>
```

### Attributes

`installurl` specifies the document to install (this is equivalent to the first parameter of the imperative version). This enables loading the document in the background and obtaining the information needed for the installation dialog. If unspecified, the current document will be installed.

`manifestid` is optional. If _unspecified_, the manifest referenced by the document at `installurl` must have a custom id defined. If specified, it must match the computed id of the site to be installed.

### Behavior

On click, the user agent can display a confirmation prompt with the app's name, origin, and icon for increased security.

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
  <install installurl="https://music.youtube.com/"
           manifestid="https://music.youtube.com/?source=pwa">
    <a href="https://music.youtube.com/" target="_blank">
      Launch YouTube Music
    </a>
  </install>
```

### What if the app is already installed?

The element can transform into a simple 'Launch'-style button, a highly requested feature from web developers. However, we must ensure developers cannot detect the change in the element's content to avoid fingerprinting concerns. This means being careful about side channels, particularly width.

<img alt='A button whose text reads "Launch YouTube Music, from music.youtube.com", with an icon signifying the action of launching.' src='./launch-simple.png' width=200>

## Error handling

The element offers event-driven hooks allowing developers to understand users' interactions, reusing [`InPagePermissionMixin`][mixin] concepts like `promptaction`, `promptdismiss`, and `validationstatuschange` events, `isValid` and `invalidReason` attributes, etc. Additional events will be needed for failures related to manifest fetching/parsing.

Validation errors could include violations of the generally applicable [presentation restrictions][security] for permission elements, as well as data validation errors when processing the referenced manifest.

That said, developers wouldn't actually need to hook into any of those attributes for the simplest
cases: `<install installurl="https://example.com/"></install>` would be sufficient for 
straightforward use cases of offering installation.

[pepc]: https://github.com/WICG/PEPC/
[geolocation]: https://github.com/WICG/PEPC/blob/main/geolocation_explainer.md
[mixin]: https://wicg.github.io/PEPC/permission-elements.html#permission-mixin
[security]: https://github.com/WICG/PEPC/blob/main/explainer.md#security-abuse


Please give me some IDL and technical detail!
--------------------------------------------------

Ok. Here you go:

```
[Exposed=Window]
interface HTMLInstallElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, ReflectURL] attribute USVString installurl;
  [CEReactions] attribute USVString manifestid;
};
HTMLInstallElement implements InPagePermissionMixin;
```

The [`InPagePermissionMixin`][mixin] is defined as part of the general Permission
Element proposal, and includes a few attributes and events. We'll reuse those here
for consistency.

* `isValid` will return a boolean: `true` if the element's presentation makes it a valid click
  target for users (because the user agent has confidence that it's visible and comprehensible,
  and that it's been in that state long enough to be reasonably reliably viewed and comprehended),
  `false` otherwise.

* `invalidReason` will return an enum specifying the reason the element is considered invalid,
  including invalidity of the element's underlying data (for cases in which the URL is missing 
  or invalid, or manifest fetching/parsing fails).

* `initialPermissionStatus` and `permissionStatus` will reflect the state of the `install` feature
  (which we'll define somewhere as a policy-controlled feature with a default allowlist of
  `'self'`).

* `promptaction` events will be fired when the user finishes interacting with any installation
  prompt triggered by activating the element.

* Likewise, `promptdismiss` will be fired when users cancel or dismiss the installation prompt.

* `validationstatuschange` events fire when the validation status changes (crazy, right?).

The element's [activation behavior][activation behavior] is quite similar to other permission
elements (e.g. [`<geolocation>`'s activation behavior][activate-geo]): we'll check to see whether
the event is trustworthy, the element is valid, permission to `install` is available and so on.
Then we'll trigger an installation prompt in an implementation defined way. This will result in
the user making some decision, leading to either a `promptdismiss` or `promptaction` event firing
on the element.

The element hooks directly into the backend of navigator.install. When clicked, it will 
load the `installurl` in the background to obtain the web application manifest and related 
resources needed for the installation dialog. The steps here will be similar to those defined 
for [the "manifest" link type][manifest-fetch], fetching and processing the manifest according 
to its [processing steps][manifest-process]. If we get a valid manifest back, the installation 
dialog is presented. If not, an error event is fired and the `<install>` element reports the 
error appropriately.

[activation behavior]: https://dom.spec.whatwg.org/#eventtarget-activation-behavior
[activate-geo]: https://wicg.github.io/PEPC/permission-elements.html#ref-for-dom-inpagepermissionmixin-features-slot%E2%91%A1%E2%93%AA
[manifest-fetch]: https://html.spec.whatwg.org/multipage/links.html#link-type-manifest:linked-resource-fetch-setup-steps
[manifest-process]: https://html.spec.whatwg.org/multipage/links.html#link-type-manifest:process-the-linked-resource

## Future Work

The following features are planned for future iterations:

### Custom Information in Button

Rendering the app name, origin, or icon in the install element would provide an even stronger signal of user intent, but also introduces a variety of complications, such as:
- **Performance:** When and how to get the information to show in the button
- **UX:** Whether to use a two-tap flow (tap 1 loads info, tap 2 installs)
- **Security:** Long app names. See [handling very long app names](#what-if-this-is-an-app-for-a-donaudampfschifffahrtsgesellschaftskapitän). Is the secondary installation confirmation prompt necessary?
- **Styling/Accessibility:** App icon contrast ratios. Button layout/width.

We believe it's worth it to solve these problems, but don't think it should delay gathering initial feedback.

### Potential Additional Attributes

- `manifesturl`: Link to the manifest file
- `includeicon`: If specified, fetches and renders the app's icon (in addition to the install icon)

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

* Given that the behavior discussed above would support both installation and launching, depending
  on the application's installed state, some more generic name might be appropriate. `<pwa>` or
  `<webapp>` could more broadly describe a potential range of behavior. I prefer `<install>`, as
  launching seems like it's really just a privacy-preserving mechanism to align behavior without
  revealing installation state, but another broader name could certainly be preferable.

[rel]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer-current-doc.md#declarative-install
