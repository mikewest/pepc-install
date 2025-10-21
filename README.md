User-Initiated PWA Installation
===============================

A Problem
---------

Web applications can be installed, providing users with a more reliable and integrated experience
alongside other applications they may use on a regular basis. This is generally considered to be
fantastic, providing value to both users and developers.

Today, the process of initiating an installation flow is somewhat fragmented; each user agent has
created a set of entry points, some more discoverable and intuitive than others. The
[Web Install API][api] aims to create a more consistent developer-facing story, providing an
imperative API which allows websites to initiate an installation flow for an arbitrary application,
enabling more seamless and intuitive experiences for users.

Seamlessness, however, cuts both ways: making it easier to push installation prompts out to users
risks creating new opportunities for annoyance or abuse. The proposal recognizes this risk,
[suggesting][spam] [transient activation][click] and explicit delegation as requirements. These are
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

A Proposal
----------

Rather than allowing developers to initiate the installation flow directly, we should provide
developers with an `<install>` element which renders a button whose content and presentation is
controlled by the user agent. Similar to other [permission elements][pepc] elements (e.g.
[`<geolocation>`][geolocation]), the user agent's control over (and therefore _understanding of_)
the element's content means that it can make plausible assumptions about a user's contextual
intent. Users who click on a button labeled "Install 'Wonderful Application'" are unlikely to be
surprised if an installation prompt for exactly that application appears, and they'll be primed to
make a good decision about the question such a prompt presents.

From a user's perspective, this could render as a button with known text and iconography:

![A button whose text reads "Install youtube.com", with an icon signifying the action of installation.](./install-youtube.png)

```html
<install manifest="https://youtube.com/manifest.webmanifest">
  [Fallback content goes here.]
</install>
```

Same-origin installations could plausibly be compressed to text signifying installation along with
an icon (or, possibly just the icon?):

![A button whose text reads "Install", with an icon signifying the action of installation.](./install-icon.png)

```html
<install
  <!--
      the `manifest` attribute can be omitted for installations whose manifest is
      specified in the page's `<link rel="manifest" ...>` declaration.
  -->
>
  [Fallback content goes here.]
</install>
```

Clicking the button would result in an installation prompt in whatever form the user agent
thinks most appropriate:

![An installation prompt for `youtube.com`.](./install-prompt.png)

If the specified PWA is already installed, these buttons could shift their presentation to represent
launching the associated app with appropriate text and iconography.

From a developer's perspective, this element would have a `manifest` element specifying the URL of
the application manifest to be installed. It would offer event-driven hooks allowing developers to
understand users' interactions (perhaps reusing [`InPagePermissionMixin`][mixin] concepts like
`promptaction`, `promptdismiss`, and `validationstatuschange` events, `isValid` and `invalidReason`
attributes, etc). Validation errors could include violations of the generally applicable
[presentation restrictions][security] for permission elements, as well as data validation errors
when processing the referenced manifest.

That said, developers wouldn't actually need to hook into any of those attributes for the simplest
cases: `<install manifest="..."></install>` would be enough for straightforward use cases of
offering installation.

[pepc]: https://github.com/WICG/PEPC/
[geolocation]: https://github.com/WICG/PEPC/blob/main/geolocation_explainer.md
[mixin]: https://wicg.github.io/PEPC/permission-elements.html#permission-mixin
[security]: https://github.com/WICG/PEPC/blob/main/explainer.md#security-abuse


Alternatives
------------

* As discussed above, the [Web Install API][api] proposal offers developers great flexibility in
  the ways in which they bring users into an installation flow. In my opinion, these (real!)
  benefits to developers are outweighed by the stronger guarantees around a user's intentions
  that we can provide via the user agent mediated approach proposed here. Particularly in this
  case, where we've inculcated an "Install" button model through the development of application
  storefronts across platforms, it seems quite reasonable indeed to create a trustworthy version
  of that model for the web.

  (_I'd more broadly claim that it is_ generally _desirable to avoid imperative models that enable
  developer-driven timing of prompt presentation when it's possible to create a user-driven model
  for the same capability. We can dramatically increase signal-to-noise for users by leaning
  heavily upon the clear communication of user intent embodied in the PEPC-style approach._)

* The style of approach described here could be spelled in a number of ways. The original API
  proposal, for instance, suggests [`<a href="..." rel="install">`][rel] as a potential approach.
  The specifics of that proposal give the user agent less control over the content and presentation
  of the element, but have the substantial advantage of providing built-in progressive enhancement.
  My opinion is that we'd be best served by minting an element which has the behavior we want, and
  allowing developers to fill it with fallback content explicitly, but the `<a>`-based approach is
  certainly worth keeping in mind.

[rel]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer-current-doc.md#declarative-install
