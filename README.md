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
controlled by the user agent. Similar to other [permission elements][pepc] (e.g.
[`<geolocation>`][geolocation]), the user agent's control over (and therefore _understanding of_)
the element's content means that it can make plausible assumptions about a user's contextual
intent. Users who click on a button labeled "Install 'Wonderful Application'" are unlikely to be
surprised if an installation prompt for exactly that application appears, and they'll be primed to
make a good decision about the question such a prompt presents.

From a user's perspective, this could render as a button with known text and iconography:

<img alt='A button whose text reads "Install youtube.com", with an icon signifying the action of installation.' src='./install-youtube.png' height=36>

```html
<install manifest="https://youtube.com/manifest.webmanifest">
  [Fallback content goes here.]
</install>
```

Same-origin installations could plausibly be compressed to text signifying installation along with
an icon (or, possibly just the icon?):

<img alt='A button whose text reads "Install", with an icon signifying the action of installation.' src='./install-icon.png' height=36>

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


Please give me some some IDL and technical detail!
--------------------------------------------------

Ok. Here you go:

```
[Exposed=Window]
interface HTMLInstallElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions, ReflectURL] attribute USVString manifest;
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

* `invalidReason` will return an enum specifying the reason the element is considered invalid.
  _We'll likely want to add a value here regarding invalidity of the element's underlying data (for
  those cases in which the manifest we're pointed towards is missing or invalid)._

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

We'll also need to define some fetching behavior in order to obtain the web application
manifest specified in the `manifest` attribute (or, in that attribute's absence, the relevant
`<link rel="manifest">` element. The steps here will be similar to those defined for
[the "manifest" link type][manifest-fetch]. We'll fetch with an `initiator` and `destination`
of `manifest`, `mode` of `cors`, and exclude credentials (we can add a `crossorigin` attribute if
necessary, but it doesn't seem necessary to me at the moment). We'll then follow that element's
[processing steps][manifest-process] to parse and validate the manifest. If we get a manifest back,
wonderful! If not, we'll consider the `<install>` element invalid.

[activation behavior]: https://dom.spec.whatwg.org/#eventtarget-activation-behavior
[activate-geo]: https://wicg.github.io/PEPC/permission-elements.html#ref-for-dom-inpagepermissionmixin-features-slot%E2%91%A1%E2%93%AA
[manifest-fetch]: https://html.spec.whatwg.org/multipage/links.html#link-type-manifest:linked-resource-fetch-setup-steps
[manifest-process]: https://html.spec.whatwg.org/multipage/links.html#link-type-manifest:process-the-linked-resource

Open Questions
--------------

### What do we do if the app is already installed?

If the specified PWA is already installed, these buttons could shift their presentation to represent
launching the associated app with appropriate text and iconography. We shouldn't otherwise reveal
distinctions between installed and uninstalled applications (_which means we need to be careful about
side channels; width in particular_):

<img alt='A button whose text reads "Launch youtube.com", with an icon signifying the exciting power of PWAs. Its width is the same as the "Install youtube.com" button, but the background is the green of success.' src='./launch-youtube.png' height=36>

As an alternative, they could render in some way that informed the user that installation already
succeeded, and clicking could either be a no-op or launch the app:

<img alt='A button whose text reads "youtube.com installed", with an icon signifying success.' src='./youtube-installed.png' height=36>


### What about the manifest ID?

The imperative proposal supports the assertion of a `manifest_id` during the call to
`navigator.install()` in order to enforce a match between the asserted ID and the
manifest, and resolves the promise with the installed ID. Given the notes about low
usage of the attribute in existing manifests, it's unclear to me whether this needs
to be part of an initial pass at this API.

If not, we're done.

If so, it's certainly possible for us to replicate this by adding a `manifest_id`
attribute to the element, and/or enriching the `promptaction` event with a
`manifestID` property. Both would be small additions and fairly easily done.


### What text should be in the button?

I think from a standards perspective, this question will remain open. It might make
sense to follow the suggestions sketched above, combining some action with the
application's origin. That might set user expectations correctly. It might not make
sense to do that at all, if we discover that users just want an "Install!" button
and don't gain any value from the origin presentation in the button because they
parse the origin representation in the installation dialog very carefully. It might
make sense to render the app's chosen name if we have some reason to trust that it's
accurate. It might make sense to do something completely different and more helpful
to users than a simple button.

In short, the button's rendering (and any interactions the user might have with it)
are implementation defined. It's worth talking together about the considerations
user agents should pay attention to when deciding how to render the button, but
it seems both unlikely and unhelpful to specify the content of the button too
carefully.


### What if this is an app for the Donaudampfschiffahrtsgesellschaftskapitän?

Words are sometimes long. It would be ideal for us to figure out clever ways of
making even very long words fit into our UI, but certain German steam boat
captains prior to 1991 might have had a hard time determining whether they were
installing their association's app. User agents should consider how to render
such names and/or origins, just as [they do elsewhere][url-display].

[url-display]: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/security/url_display_guidelines/url_display_guidelines.md


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

* Given that the behavior discussed above would support both installation and launching, depending
  on the application's installed state, some more generic name might be appropriate. `<pwa>` or
  `<webapp>` could more broadly describe a potential range of behavior. I prefer `<install>`, as
  launching seems like it's really just a privacy-preserving mechanism to align behavior without
  revealing installation state, but another broader name could certainly be preferable.

[rel]: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer-current-doc.md#declarative-install
